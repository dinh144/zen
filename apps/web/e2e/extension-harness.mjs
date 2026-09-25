import { chromium } from "playwright"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { fileURLToPath } from "node:url"
import { execFileSync } from "node:child_process"
import { serveFixtures } from "./fixtures.mjs"
import { pollUntil } from "./poll.mjs"

// Shared by extension.mjs (local mode) and extension.cloud.mjs (cloud mode): launching the
// unpacked extension, talking to zen, driving the popup, and the checks that are identical once
// a mind is signed in — only sign-in itself differs between the two modes.

const ROOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..")
const EXT_DIR = path.join(ROOT_DIR, "extension")

// A deliberately unreachable address used to test the "switch zen address" cache-clearing and
// unreachable-state paths. The port-1 attempt is a real request the browser makes (and this
// harness's own network assertion sees), not the extension writing anywhere unexpected — so it's
// exported and always allowed by assertOnlyZenTraffic below.
export const UNREACHABLE_PROBE_ADDRESS = "http://localhost:1"

export function createReporter() {
  let failed = 0
  const ok = (name, cond, extra = "") => {
    console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`)
    if (!cond) failed++
    return cond
  }
  const skip = (name, why) => console.log(`SKIP ${name} (${why})`)
  return { ok, skip, failed: () => failed }
}

export { pollUntil }

/** True if `worker` still answers an evaluate call within `timeout` — Chrome MV3 workers idle out
 *  (Playwright keeps the same handle alive and stalls evaluate() through a normal restart) but can
 *  also be torn down for good, and a torn-down handle must not be handed to a real evaluate call. */
async function isAlive(worker, timeout = 3000) {
  return Promise.race([
    worker.evaluate(() => true).then(() => true, () => false),
    new Promise((resolve) => setTimeout(() => resolve(false), timeout)),
  ])
}

/** Launches the unpacked extension. `swEvaluate` re-verifies (or re-acquires) a live service
 *  worker on every call, since a handle captured once can go stale. */
export async function launchExtension(tag) {
  // Outside the project tree: Turbopack's dev watcher panics trying to read the profile's socket files.
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `zen-ext-${tag}-`))
  const headless = !process.env.HEADED
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless,
    args: [`--disable-extensions-except=${EXT_DIR}`, `--load-extension=${EXT_DIR}`],
  })
  // Network assertion: verified empirically that context-level 'request' events do capture the
  // service worker's own fetches (not just page loads) — see the ticket's Comments.
  const seenHosts = new Set()
  ctx.on("request", (r) => {
    const origin = new URL(r.url()).origin
    if (origin !== "null") seenHosts.add(origin) // about:blank and similar opaque-origin requests
  })

  async function getWorker() {
    const candidate = ctx.serviceWorkers()[0]
    if (candidate && (await isAlive(candidate))) return candidate
    return ctx.waitForEvent("serviceworker", { timeout: 10000 })
  }
  const sw = await getWorker()
  const extId = sw.url().split("/")[2]
  const swEvaluate = async (fn, arg) => (await getWorker()).evaluate(fn, arg)

  return {
    ctx,
    extId,
    headless,
    seenHosts,
    swEvaluate,
    async close() {
      await ctx.close()
      fs.rmSync(userDataDir, { recursive: true, force: true })
    },
  }
}

/** Runs `fn({ ctx, extId, headless, seenHosts, swEvaluate, FX })` with the unpacked extension
 *  loaded and a fixture server running, guaranteeing both get torn down afterward even if `fn`
 *  throws. `tag` names the temp profile dir (kept separate per mode). */
export async function withExtension(tag, fn) {
  // The drop's sixteen moods are generated from apps/web/lib/drop.ts, so the loaded unpacked
  // extension never runs against a stale copy.
  execFileSync("bun", ["scripts/generate-drop-assets.ts"], { cwd: ROOT_DIR, stdio: "inherit" })
  const fixtures = await serveFixtures()
  try {
    const { close, ...harness } = await launchExtension(tag)
    try {
      return await fn({ ...harness, FX: fixtures.url })
    } finally {
      await close()
    }
  } finally {
    fixtures.close()
  }
}

export function zenClient(ctx, B) {
  const api = (p, init) => ctx.request.fetch(`${B}${p}`, init)
  const cards = () => api("/api/cards?limit=50").then((r) => r.json()).then((j) => j.cards ?? [])
  return { api, cards }
}

// popup.js stamps every sign-in check with a rising sequence number and marks it in flight with
// body[data-view="checking"]. Waiting for "a settled view" alone is not enough: dispatching the
// endpoint's change event returns before its async listener even runs, so a bare visibility (or
// even a data-view) race can observe the *previous* check's already-settled state and think
// nothing is happening. Waiting for the sequence number to advance past a captured baseline makes
// this a real "the next check finished", not a guess about timing.
const checkSeq = (page) => page.locator("body").getAttribute("data-check-seq").then((v) => Number(v) || 0)

async function settlePopup(page, minSeq = 0) {
  await page
    .waitForFunction(
      (min) => Number(document.body.dataset.checkSeq || 0) > min && document.body.dataset.view !== "checking",
      minSeq,
      { timeout: 8000 },
    )
    .catch(() => {})
}

export async function openPopup(ctx, extId) {
  const p = await ctx.newPage()
  await p.goto(`chrome-extension://${extId}/popup.html`)
  await settlePopup(p)
  return p
}

/** Fills the popup's zen-address field and waits for the resulting sign-in re-check to actually
 *  finish (see settlePopup above), not just for the change event to have been dispatched. */
export async function switchEndpoint(page, address) {
  const before = await checkSeq(page)
  await page.locator("#endpoint").fill(address)
  await page.locator("#endpoint").dispatchEvent("change")
  await settlePopup(page, before)
}

export async function checkSignedOutState({ ok, ctx, extId, swEvaluate, B }) {
  await swEvaluate(() => chrome.storage.local.set({ probe: "before-sign-in" }))
  const p1 = await openPopup(ctx, extId)
  ok("popup shows the signed-out state", await p1.locator("#signedOut").isVisible())
  ok("popup's signed-in form is hidden", !(await p1.locator("#signedIn").isVisible()))
  ok("popup links to zen's sign-in", (await p1.locator("#signInLink").getAttribute("href")) === `${B}/login`)
  ok("a 401 clears every local cache", !(await swEvaluate(() => chrome.storage.local.get("probe"))).probe)
  await p1.close()
}

/** The checks that only make sense once signed in: popup save, the command shortcut, the
 *  right-click saves (thinnest honest check — see the ticket's Comments), switching the zen
 *  address, background.js's own 401 path, and cleanup. Every card this creates is tagged so
 *  cleanup never touches anything else — critical in local mode, where the account is a real one,
 *  not a disposable test account. Cleanup runs in a finally so a failure partway through this
 *  still deletes what was already tagged, and fails loudly if any delete itself fails. */
export async function runSignedInChecks({ ok, ctx, extId, swEvaluate, B, FX, stamp, api, cards }) {
  const mine = (c) => (c.note ?? "").includes(stamp) || (c.url ?? "").startsWith(FX)

  try {
    const afterLogin = await swEvaluate((base) => fetch(`${base}/api/cards?limit=1`, { credentials: "include" }).then((r) => r.status), B)
    ok("service worker sends zen's session cookie cross-origin (SameSite)", afterLogin === 200, `status ${afterLogin}`)

    // Popup note-and-save. The popup is opened as an ordinary tab (Playwright cannot drive the
    // real toolbar popup), so it must never be the *active* tab when save is clicked — otherwise
    // chrome.tabs.query({active:true}) resolves to the popup's own tab instead of the page the
    // mind is actually on. Open the fixture page after the popup (making it the active one) and
    // interact with the popup without bringing it to front; Playwright can drive a background tab.
    const p2 = await openPopup(ctx, extId)
    ok("popup shows the signed-in state", await p2.locator("#signedIn").isVisible())
    const fx = await ctx.newPage()
    await fx.goto(FX + "/")
    const popupNote = `${stamp} popup note`
    await p2.locator("#note").fill(popupNote)
    await p2.locator("#save").click()
    const popupCard = await pollUntil(async () => (await cards()).find((c) => (c.note ?? "").includes(popupNote)))
    ok("popup's note-and-save creates a card", Boolean(popupCard))
    ok("popup's note-and-save captures the page the mind was on", popupCard?.url === FX + "/", popupCard?.url ?? "")

    // Ctrl+Shift+S: try the real global shortcut first. Only fall back once it's had a real
    // chance to land, so a merely-slow real save doesn't also get a duplicate fallback card; the
    // fallback is tagged so the two are told apart instead of guessed at.
    await fx.bringToFront()
    await fx.locator("body").click()
    await fx.keyboard.press("Control+Shift+S")
    let landed = await pollUntil(async () => (await cards()).find((c) => c.url === FX + "/" && !(c.note ?? "").includes(stamp)), { timeout: 4000 })
    let how = landed ? "the real key combo" : null
    if (!landed) {
      const fallbackNote = `${stamp} shortcut-fallback`
      await swEvaluate((body) => self.save(body), { url: FX + "/", title: "fixture", note: fallbackNote })
      landed = await pollUntil(async () => (await cards()).find((c) => c.url === FX + "/" && (c.note ?? "").includes(fallbackNote)), { timeout: 4000 })
      how = landed ? "self.save fallback" : null
    }
    ok("Ctrl+Shift+S saves the page", Boolean(landed), how ? `via ${how}` : "neither path landed a card")

    // Right-click saves: Chrome's native context menu is outside Playwright's reach (see the
    // ticket's Comments), so the thinnest honest check calls the exact functions the menu's click
    // handler calls, with the same argument shape `info`/`tab` would carry.
    await swEvaluate((body) => self.save(body), { kind: "quote", quote: "kept from the fixture", url: FX + "/", title: "fixture", note: stamp })
    await swEvaluate((body) => self.save(body), { url: FX + "/other", note: stamp })
    await swEvaluate(({ src, page }) => self.saveImage(src, page), { src: FX + "/pic.png", page: FX + "/other" })
    const quoteCard = await pollUntil(async () => (await cards()).find((c) => c.kind === "quote" && c.content === "kept from the fixture"))
    ok("context-menu selection save, quote card (thinnest honest check)", Boolean(quoteCard))
    const linkCard = await pollUntil(async () => (await cards()).find((c) => c.kind === "link" && c.url === FX + "/other"))
    ok("context-menu link save (thinnest honest check)", Boolean(linkCard))
    const imageCard = await pollUntil(async () => (await cards()).find((c) => c.kind === "image" && c.url === FX + "/other"))
    ok("context-menu image save (thinnest honest check)", Boolean(imageCard))

    // Switching to a different zen address clears the cache, and switching back does too —
    // story 5's third cache-clearing trigger, actually exercised (not a same-value no-op change).
    const p3 = await openPopup(ctx, extId)
    const OTHER = UNREACHABLE_PROBE_ADDRESS
    await swEvaluate(() => chrome.storage.local.set({ probe: "before-switch" }))
    await switchEndpoint(p3, OTHER)
    ok("switching to a different zen address clears the cache", await pollUntil(async () => !(await swEvaluate(() => chrome.storage.local.get("probe"))).probe))
    ok("switching to a different zen address is remembered", (await swEvaluate(() => chrome.storage.sync.get("endpoint"))).endpoint === OTHER)
    ok("popup shows unreachable for a bad address", await p3.locator("#unreachable").isVisible())

    await swEvaluate(() => chrome.storage.local.set({ probe: "before-switch-back" }))
    await switchEndpoint(p3, B)
    ok("switching back clears the cache again", await pollUntil(async () => !(await swEvaluate(() => chrome.storage.local.get("probe"))).probe))
    ok("popup is usable again after switching back", await p3.locator("#signedIn").isVisible())

    // background.js's own 401-clears-cache path is otherwise untested (the popup checks above all
    // go through popup.js), and an already-open popup should react to a cache clear it didn't
    // cause itself. End the session behind everyone's back (the same effect as a real sign-out or
    // an expired session — snapshot the cookies first so cleanup below still has a session to
    // work with), then save through the service worker directly, as a right-click save would.
    const savedCookies = await ctx.cookies()
    await ctx.clearCookies()
    await swEvaluate(() => chrome.storage.local.set({ probe: "before-bg-401" }))
    await swEvaluate((body) => self.save(body), { url: FX + "/expired-session" })
    ok(
      "a 401 from a right-click-equivalent save clears the extension's cache (background.js)",
      await pollUntil(async () => !(await swEvaluate(() => chrome.storage.local.get("probe"))).probe),
    )
    await p3.locator("#signedOut").waitFor({ state: "visible", timeout: 8000 }).catch(() => {})
    ok("an already-open popup reacts to a cache clear it didn't cause itself", await p3.locator("#signedOut").isVisible())
    await p3.close()
    await ctx.addCookies(savedCookies)
  } finally {
    const toDelete = (await cards()).filter(mine)
    let allDeleted = true
    for (const c of toDelete) {
      try {
        const res = await api(`/api/cards/${c.id}`, { method: "DELETE" })
        if (!res.ok()) allDeleted = false
      } catch {
        allDeleted = false
      }
    }
    ok("cleanup", allDeleted, `${toDelete.length} cards, none outside this run's own`)
  }
}

/** The resting drop: entirely client-local (no zen call at all), so this runs once, not per mode
 *  (extension.cloud.mjs doesn't repeat it — see its own comment). `host` is the drop's light-DOM
 *  element ([data-zen-drop-host]); its own attributes (menu open/closed, corner) are readable
 *  from outside even though its shadow content, being closed, is not — see bubble.js. */
export async function runBubbleChecks({ ok, ctx, extId, swEvaluate, FX }) {
  const host = (page) => page.locator("[data-zen-drop-host]")
  const site = new URL(FX).hostname

  // 1. Rests in the default corner, menu closed, no layout shift.
  const p1 = await ctx.newPage()
  await p1.goto(FX + "/")
  await host(p1).waitFor({ state: "attached", timeout: 5000 })
  ok("the drop rests once the page is idle", await host(p1).isVisible())
  ok("resting drop's default corner", (await host(p1).getAttribute("data-zen-corner")) === "bottom-right")
  ok("resting drop's menu starts closed", (await host(p1).getAttribute("data-zen-menu")) === "closed")
  ok("no horizontal layout shift", (await p1.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) === 0)

  // 2. A real button whose label names its job, reachable by keyboard; Escape closes the menu and
  //    returns focus to the drop.
  await host(p1).click()
  ok("the menu opens", (await host(p1).getAttribute("data-zen-menu")) === "open")
  ok("focus moved into the drop", await p1.evaluate(() => document.activeElement === document.querySelector("[data-zen-drop-host]")))
  await p1.keyboard.press("Escape")
  ok("Escape closes the menu", (await host(p1).getAttribute("data-zen-menu")) === "closed")
  ok("Escape returns focus to the drop", await p1.evaluate(() => document.activeElement === document.querySelector("[data-zen-drop-host]")))

  // 3. Tab (and Shift+Tab) stay trapped inside the menu — never lands on the page beyond the drop.
  await host(p1).click()
  for (let i = 0; i < 5; i++) {
    await p1.keyboard.press("Tab")
    if (!(await p1.evaluate(() => document.activeElement === document.querySelector("[data-zen-drop-host]")))) {
      ok("Tab stays trapped inside the open menu", false, `escaped after ${i + 1} presses`)
      break
    }
  }
  ok("Tab stays trapped inside the open menu (5 presses)", await p1.evaluate(() => document.activeElement === document.querySelector("[data-zen-drop-host]")))
  await p1.keyboard.press("Escape")

  // 4. Move to another corner (first menu item) — repositions at once and is remembered.
  await host(p1).click()
  await p1.keyboard.press("Enter")
  ok("moved to another corner", (await host(p1).getAttribute("data-zen-corner")) === "bottom-left")
  ok("the new corner is remembered", (await swEvaluate(() => chrome.storage.sync.get("corner"))).corner === "bottom-left")
  await swEvaluate(() => chrome.storage.sync.remove("corner")) // back to the default for the rest of this run

  // 5. Hide on this page (second menu item) — gone at once, but only for this page: a fresh load
  //    of the very same address shows it again.
  await host(p1).click()
  await p1.keyboard.press("ArrowDown")
  await p1.keyboard.press("Enter")
  ok("hide on this page removes the drop at once", (await host(p1).count()) === 0)
  await p1.close()
  const p2 = await ctx.newPage()
  await p2.goto(FX + "/")
  ok("hiding a page never persists — a fresh load shows the drop again", await host(p2)
    .waitFor({ state: "attached", timeout: 5000 })
    .then(() => true, () => false))

  // 6. Mute this site (third menu item) — gone at once, persists across a reload, listed in the
  //    popup with an unmute action, and comes back once unmuted.
  await host(p2).click()
  await p2.keyboard.press("ArrowDown")
  await p2.keyboard.press("ArrowDown")
  await p2.keyboard.press("Enter")
  ok("mute this site removes the drop at once", (await host(p2).count()) === 0)
  ok("the muted site is remembered", ((await swEvaluate(() => chrome.storage.sync.get("mutedSites"))).mutedSites ?? []).includes(site))
  await p2.close()
  const p3 = await ctx.newPage()
  await p3.goto(FX + "/")
  await p3.waitForTimeout(500) // the content script gets one chance to build the drop, then never does
  ok("a muted site never shows the drop, even after a reload", (await host(p3).count()) === 0)
  await p3.close()

  const popup = await openPopup(ctx, extId)
  ok("the popup lists the muted site", await popup.locator("#mutedList").getByText(site).isVisible())
  await popup.locator("#mutedList li", { hasText: site }).getByRole("button").click()
  ok("the popup can unmute it", !((await swEvaluate(() => chrome.storage.sync.get("mutedSites"))).mutedSites ?? []).includes(site))
  await popup.close()
  const p4 = await ctx.newPage()
  await p4.goto(FX + "/")
  ok("unmuting a site brings the drop back", await host(p4)
    .waitFor({ state: "attached", timeout: 5000 })
    .then(() => true, () => false))
  await p4.close()

  // 7. Never on a page with a password field, and disappears at once if one is inserted later.
  const p5 = await ctx.newPage()
  await p5.goto(FX + "/password")
  await p5.waitForTimeout(500)
  ok("the drop never appears on a page with a password field", (await host(p5).count()) === 0)
  await p5.close()

  const p6 = await ctx.newPage()
  await p6.goto(FX + "/late-password")
  await host(p6).waitFor({ state: "attached", timeout: 5000 })
  await host(p6).waitFor({ state: "detached", timeout: 5000 })
  ok("a password field inserted later removes the drop at once", (await host(p6).count()) === 0)
  await p6.close()
}

export function assertOnlyZenTraffic({ ok, seenHosts, B, allowed }) {
  // A positive control: if this ever comes back false, seenHosts isn't seeing service-worker
  // traffic at all and the assertion below would be vacuous, not a real check.
  ok("network tracking sees the service worker's own requests (not blind)", seenHosts.has(new URL(B).origin))
  const allAllowed = [...allowed, new URL(UNREACHABLE_PROBE_ADDRESS).origin]
  const strangers = [...seenHosts].filter((h) => !allAllowed.includes(h))
  ok("the extension writes only through zen's HTTP API (no third-party hosts seen)", strangers.length === 0, strangers.join(", "))
}
