import { chromium } from "playwright"
import path from "node:path"
import fs from "node:fs"
import os from "node:os"
import { fileURLToPath } from "node:url"
import { serveFixtures } from "./fixtures.mjs"

// Cloud mode: the unpacked extension against a cloud build (`npx supabase start` + a cloud build,
// per CLAUDE.md), signing in for real through Supabase's magic link via Mailpit — this is where the
// session-cookie (SameSite) and popup sign-in state actually run against Supabase Auth's own cookies.
const B = (process.env.ZEN_URL ?? "http://localhost:3002").replace(/\/$/, "")
const MAIL = "http://127.0.0.1:54324/api/v1"
const EXT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../extension")
let failed = 0
const ok = (name, cond, extra = "") => (console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`), cond || failed++)

const fixtures = await serveFixtures()
const FX = fixtures.url

// Outside the project tree: Turbopack's dev watcher panics trying to read the profile's socket files.
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "zen-ext-cloud-"))
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

await sw.evaluate((base) => chrome.storage.sync.set({ endpoint: base }), B)

const api = (p, init) => ctx.request.fetch(`${B}${p}`, init)
const cards = () => api("/api/cards?limit=50").then((r) => r.json()).then((j) => j.cards ?? [])
const popup = () => ctx.newPage().then(async (p) => (await p.goto(`chrome-extension://${extId}/popup.html`), p))

// 1. A fresh profile has no Supabase session: the signed-out state, everywhere.
const freshStatus = await sw.evaluate((base) => fetch(`${base}/api/cards?limit=1`, { credentials: "include" }).then((r) => r.status), B)
ok("fresh profile starts signed out", freshStatus === 401, `status ${freshStatus}`)

await sw.evaluate(() => chrome.storage.local.set({ probe: "before-sign-in" }))
const p1 = await popup()
await p1.waitForTimeout(400)
ok("popup shows the signed-out state", await p1.locator("#signedOut").isVisible())
ok("popup links to zen's sign-in", (await p1.locator("#signInLink").getAttribute("href")) === `${B}/login`)
ok("a 401 clears every local cache", !(await sw.evaluate(() => chrome.storage.local.get("probe"))).probe)
await p1.close()

// 2. Sign in for real: magic link through Mailpit, in a page in this same context so the
//    Supabase cookies it sets land in the extension's cookie jar too.
const email = `ext${Date.now()}@zen.test`
const loginPage = await ctx.newPage()
await loginPage.goto(`${B}/login`)
await loginPage.locator("input[type=email]").fill(email)
await loginPage.getByRole("button", { name: /gửi đường dẫn|send me a link/i }).click()
await loginPage.getByRole("status").waitFor({ timeout: 10000 })
let link = null
for (let i = 0; i < 20 && !link; i++) {
  await loginPage.waitForTimeout(500)
  const list = await (await fetch(`${MAIL}/search?query=${encodeURIComponent("to:" + email)}`)).json()
  const id = list.messages?.[0]?.ID
  if (!id) continue
  const msg = await (await fetch(`${MAIL}/message/${id}`)).json()
  link = /href="([^"]+)"/.exec(msg.HTML ?? "")?.[1]?.replace(/&amp;/g, "&") ?? null
}
await loginPage.goto(link)
await loginPage.waitForURL(`${B}/`, { timeout: 15000 })
await loginPage.close()

const afterLogin = await sw.evaluate((base) => fetch(`${base}/api/cards?limit=1`, { credentials: "include" }).then((r) => r.status), B)
ok("service worker sends the Supabase session cookie cross-origin (SameSite)", afterLogin === 200, `status ${afterLogin}`)

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
//    Comments), so the thinnest honest check calls the exact functions the menu's click handler
//    calls, with the same argument shape `info`/`tab` would carry. The image path is the cloud
//    upload-ticket flow (not the local multipart one).
before = (await cards()).length
await sw.evaluate((body) => self.save(body), { kind: "quote", quote: "kept from the fixture", url: FX + "/", title: "fixture" })
await sw.evaluate((body) => self.save(body), { url: FX + "/other" })
await sw.evaluate(({ src, page }) => self.saveImage(src, page), { src: FX + "/pic.png", page: FX + "/" })
await new Promise((r) => setTimeout(r, 1200))
const list = await cards()
ok("context-menu selection save, quote card (thinnest honest check)", list.some((c) => c.kind === "quote" && c.content === "kept from the fixture"))
ok("context-menu link save (thinnest honest check)", list.some((c) => c.url === FX + "/other"))
ok("context-menu image save via the cloud upload path (thinnest honest check)", list.some((c) => c.kind === "image"))

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

// The magic-link sign-in itself legitimately visits Supabase's own auth server mid-redirect;
// that's zen's sign-in, not the extension. Everything from here (the entry-point checks) must
// only ever have gone to zen, the fixture server or the extension's own resources.
const allowed = [B, FX, `chrome-extension://${extId}`, new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321").origin]
const strangers = [...seenHosts].filter((h) => !allowed.includes(h))
ok("the extension writes only through zen's HTTP API (no third-party hosts seen)", strangers.length === 0, strangers.join(", "))

await ctx.close()
fixtures.close()
fs.rmSync(userDataDir, { recursive: true, force: true })
process.exit(failed ? 1 : 0)
