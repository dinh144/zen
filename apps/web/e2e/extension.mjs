import { chromium } from "playwright"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { fileURLToPath } from "node:url"
import { serveFixtures } from "./fixtures.mjs"

// Local mode: the unpacked extension in a real Chromium, against fixture pages served by this
// test and a real zen dev server. Sign-in state, the session cookie, cache-clearing on 401, and
// the entry points (popup save, Ctrl+Shift+S, and the right-click saves — see the ticket's
// Comments for how a native context-menu click itself is exercised, since Playwright cannot drive it).
const B = (process.env.ZEN_URL ?? "http://localhost:3000").replace(/\/$/, "")
const PASSWORD = process.env.ZEN_PASSWORD ?? ""
const EXT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../extension")
let failed = 0
const ok = (name, cond, extra = "") => (console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`), cond || failed++)
const skip = (name, why) => console.log(`SKIP ${name} (${why})`)

const fixtures = await serveFixtures()
const FX = fixtures.url

// Outside the project tree: Turbopack's dev watcher panics trying to read the profile's socket files.
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "zen-ext-local-"))
const headless = !process.env.HEADED
const ctx = await chromium.launchPersistentContext(userDataDir, {
  channel: "chromium",
  headless,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
})
// Network assertion: the extension (and this harness) only ever talks to zen, the fixture
// server, or its own chrome-extension:// resources — never a third-party host.
const seenHosts = new Set()
ctx.on("request", (r) => {
  const origin = new URL(r.url()).origin
  if (origin !== "null") seenHosts.add(origin) // about:blank and similar opaque-origin requests
})

let sw = ctx.serviceWorkers()[0]
if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 10000 })
ok(`unpacked extension loads a service worker (${headless ? "headless" : "headed"})`, Boolean(sw), sw?.url() ?? "")
const extId = sw.url().split("/")[2]
ok("save/saveImage are reachable for the thinnest-honest entry-point checks", (await sw.evaluate(() => [typeof self.save, typeof self.saveImage].join(","))) === "function,function")

await sw.evaluate((base) => chrome.storage.sync.set({ endpoint: base }), B)

const api = (p, init) => ctx.request.fetch(`${B}${p}`, init)
const cards = () => api("/api/cards?limit=50").then((r) => r.json()).then((j) => j.cards ?? [])
const popup = () => ctx.newPage().then(async (p) => (await p.goto(`chrome-extension://${extId}/popup.html`), p))

// 1. A fresh profile has no session cookie: the signed-out state, everywhere.
const freshStatus = await sw.evaluate((base) => fetch(`${base}/api/cards?limit=1`, { credentials: "include" }).then((r) => r.status), B)
if (freshStatus === 401) {
  await sw.evaluate(() => chrome.storage.local.set({ probe: "before-sign-in" }))
  const p1 = await popup()
  await p1.waitForTimeout(400)
  ok("popup shows the signed-out state", await p1.locator("#signedOut").isVisible())
  ok("popup's signed-in form is hidden", !(await p1.locator("#signedIn").isVisible()))
  ok("popup links to zen's sign-in", (await p1.locator("#signInLink").getAttribute("href")) === `${B}/login`)
  ok("a 401 clears every local cache", !(await sw.evaluate(() => chrome.storage.local.get("probe"))).probe)
  await p1.close()
} else if (!PASSWORD) {
  skip("signed-out popup state", `${B} has no ZEN_PASSWORD; it is always open (single-mind dev case)`)
} else {
  ok("fresh profile starts signed out", false, `expected 401, got ${freshStatus}`)
}

// 2. Sign in (local mode: POST /api/login; the cookie lands in this context's jar).
let signedIn = freshStatus === 200
if (!signedIn && PASSWORD) {
  const loginRes = await ctx.request.post(`${B}/api/login`, { data: { password: PASSWORD } })
  signedIn = loginRes.ok()
  ok("sign in with ZEN_PASSWORD", signedIn, `status ${loginRes.status()}`)
}

if (signedIn) {
  const afterLogin = await sw.evaluate((base) => fetch(`${base}/api/cards?limit=1`, { credentials: "include" }).then((r) => r.status), B)
  ok("service worker sends zen's session cookie cross-origin (SameSite)", afterLogin === 200, `status ${afterLogin}`)

  const p2 = await popup()
  await p2.waitForTimeout(400)
  ok("popup shows the signed-in state", await p2.locator("#signedIn").isVisible())

  // 3. Popup note-and-save.
  const fx = await ctx.newPage()
  await fx.goto(FX + "/")
  let before = (await cards()).length
  await p2.bringToFront()
  await p2.locator("#note").fill("popup e2e note")
  await p2.locator("#save").click()
  await p2.waitForTimeout(1200)
  ok("popup's note-and-save creates a card", (await cards()).length > before)

  // 4. Ctrl+Shift+S: try the real global shortcut first.
  before = (await cards()).length
  await fx.bringToFront()
  await fx.locator("body").click()
  await fx.keyboard.press("Control+Shift+S")
  await fx.waitForTimeout(1200)
  let viaShortcut = (await cards()).length > before
  let how = "the real key combo"
  if (!viaShortcut) {
    // Thinnest honest check: the shortcut is a global browser accelerator Playwright's page-level
    // input cannot dispatch (see Comments) — call the command listener's own logic instead.
    how = "self.save fallback"
    await sw.evaluate((body) => self.save(body), { url: FX + "/", title: "fixture" })
    await new Promise((r) => setTimeout(r, 800))
    viaShortcut = (await cards()).length > before
  }
  ok("Ctrl+Shift+S saves the page", viaShortcut, `via ${how}`)

  // 5. Right-click saves: Chrome's native context menu is outside Playwright's reach (see
  //    Comments), so the thinnest honest check calls the exact functions the menu's click
  //    handler calls, with the same argument shape `info`/`tab` would carry.
  before = (await cards()).length
  await sw.evaluate((body) => self.save(body), { kind: "quote", quote: "kept from the fixture", url: FX + "/", title: "fixture" })
  await sw.evaluate((body) => self.save(body), { url: FX + "/other" })
  await sw.evaluate(({ src, page }) => self.saveImage(src, page), { src: FX + "/pic.png", page: FX + "/" })
  await new Promise((r) => setTimeout(r, 1200))
  const list = await cards()
  ok("context-menu selection save, quote card (thinnest honest check)", list.some((c) => c.kind === "quote" && c.content === "kept from the fixture"))
  ok("context-menu link save (thinnest honest check)", list.some((c) => c.url === FX + "/other"))
  ok("context-menu image save (thinnest honest check)", list.some((c) => c.kind === "image"))

  // 6. Switching the zen address clears the cache too.
  await sw.evaluate(() => chrome.storage.local.set({ probe: "before-switch" }))
  const p3 = await popup()
  await p3.locator("#endpoint").fill(B)
  await p3.locator("#endpoint").dispatchEvent("change")
  await p3.waitForTimeout(300)
  ok("switching the zen address clears the cache", !(await sw.evaluate(() => chrome.storage.local.get("probe"))).probe)
  await p3.close()

  for (const c of await cards()) await api(`/api/cards/${c.id}`, { method: "DELETE" })
  ok("cleanup", true)
} else {
  skip("signed-in flows (popup save, command, right-click saves)", "no working ZEN_PASSWORD sign-in")
}

const allowed = [B, FX, `chrome-extension://${extId}`]
const strangers = [...seenHosts].filter((h) => !allowed.includes(h))
ok("the extension writes only through zen's HTTP API (no third-party hosts seen)", strangers.length === 0, strangers.join(", "))

await ctx.close()
fixtures.close()
fs.rmSync(userDataDir, { recursive: true, force: true })
process.exit(failed ? 1 : 0)
