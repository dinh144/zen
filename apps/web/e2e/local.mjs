import { chromium } from "playwright"
import fs from "node:fs"

// Local mode, through the real UI: capture, tags, pin, spaces + sharing, upload, focus, search.
const B = process.env.ZEN_URL ?? "http://localhost:3000"
let failed = 0
const ok = (name, cond, extra = "") => (console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`), cond || failed++)
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
const errors = []
p.on("pageerror", (e) => errors.push(e.message))
p.on("console", (m) => m.type() === "error" && errors.push(m.text()))

// 1. Composer: write a note, it lands, tags follow without a reload.
await p.goto(B + "/", { waitUntil: "load" })
await p.waitForTimeout(2000)
const ts = Date.now()
const stamp = `e2e ${ts}`
await p.locator("form textarea").first().fill(`${stamp} bánh mì chảo sáng chủ nhật ở Đà Nẵng`)
await p.locator("form button[type=submit]").first().click()
const tile = p.locator("main figure", { hasText: stamp }).first()
await tile.waitFor({ timeout: 10000 })
ok("note lands on board", await tile.isVisible())
const t0 = Date.now()
await p.waitForFunction(() => ![...document.querySelectorAll("figcaption")].some((c) => /đang lắng|settling/.test(c.textContent ?? "")), null, { timeout: 200000 }).catch(() => {})
ok("tags land without reload", !(await p.locator("figcaption", { hasText: /đang lắng|settling/ }).count()), `${Math.round((Date.now() - t0) / 1000)}s`)

// 2. Open it, pin it, see it at hand.
await tile.locator("button.sheet").click()
const dlg = p.getByRole("dialog")
await dlg.waitFor()
ok("card dialog shows tags", (await dlg.locator("button.lowercase").count()) > 0)
await dlg.getByRole("button", { name: /giữ trong tầm tay|keep at hand/i }).click()
await p.waitForTimeout(500)
await p.keyboard.press("Escape")
await p.waitForTimeout(500)
ok("pinned card appears at hand", (await p.locator("text=/trong tầm tay|at hand/i").count()) > 0)

// 3. Space: create, add the card, count, share, open publicly, unshare.
await p.goto(B + "/spaces", { waitUntil: "load" })
const spaceName = `space ${stamp}`
await p.locator("form input").first().fill(spaceName)
await p.locator("form button[type=submit]").click()
await p.locator(`text=${spaceName}`).waitFor({ timeout: 10000 })
ok("space created", true)
await p.goto(B + "/", { waitUntil: "load" })
await p.waitForTimeout(1500)
await p.locator("main figure", { hasText: stamp }).first().locator("button.sheet").click()
await p.getByRole("dialog").getByRole("button", { name: /^(spaces|không gian)/i }).click()
await p.getByRole("checkbox", { name: spaceName }).click()
await p.getByRole("checkbox", { name: spaceName, checked: true }).waitFor({ timeout: 5000 })
ok("add to space shows it is inside", true)
await p.keyboard.press("Escape")
await p.goto(B + "/spaces", { waitUntil: "load" })
const li = p.locator("li", { hasText: spaceName })
await li.getByRole("button", { name: /chia sẻ bằng liên kết|share by link/i }).click()
await li.getByRole("button", { name: /chép liên kết|copy link/i }).waitFor()
const href = await li.locator("a").first().getAttribute("href")
const token = (await (await fetch(`${B}/api/spaces`)).json()).spaces?.find((s) => s.name === spaceName)?.share_token
const anon = await (await b.newContext()).newPage()
await anon.goto(`${B}/s/${token}`, { waitUntil: "load" })
ok("shared space opens without login and shows the card", (await anon.locator("figure").count()) === 1)
await li.getByRole("button", { name: /giữ riêng tư|keep it private/i }).click()
await p.waitForTimeout(800)
await anon.goto(`${B}/s/${token}`, { waitUntil: "load" })
ok("unshared link is closed", (await anon.locator("text=/không được chia sẻ|not shared/i").count()) === 1)
await li.getByRole("button", { name: /buông không gian này|let this space go/i }).click()
await p.getByRole("alertdialog").getByRole("button", { name: /chắc chắn|yes, do it/i }).click()
await p.waitForTimeout(800)
ok("space deleted", (await p.locator(`text=${spaceName}`).count()) === 0, href ?? "")

// 4. Upload an image through the rail.
await p.goto(B + "/", { waitUntil: "load" })
await p.waitForTimeout(1500)
const png = new URL(`./e2e-${ts}.png`, import.meta.url).pathname
fs.copyFileSync(new URL("../../../extension/icon.png", import.meta.url), png)
await p.locator("input[type=file]").first().setInputFiles(png)
await p.locator("figure img").first().waitFor({ timeout: 15000 })
ok("image upload shows an image card", true)

// 5. Focus mode saves with Ctrl+Enter.
await p.goto(B + "/focus", { waitUntil: "load" })
await p.locator("textarea").fill(`${stamp} focus line`)
await p.keyboard.press("Control+Enter")
await p.waitForTimeout(1500)
const found = await (await fetch(`${B}/api/cards?q=${encodeURIComponent(stamp + " focus line")}`)).json()
ok("focus mode saved", found.cards.some((c) => (c.note ?? "").includes("focus line")))

// 6. Search finds the note by an English description.
const en = await (await fetch(`${B}/api/cards?q=${encodeURIComponent("breakfast sandwich")}`)).json()
ok("english search finds vietnamese note", en.cards.some((c) => (c.note ?? "").includes(stamp)), `(${en.cards.length} hits)`)

// 7. Let everything go again — only what this run stamped, never anything already on the board.
const mine = (await (await fetch(`${B}/api/cards?q=${encodeURIComponent(stamp)}`)).json()).cards.filter((c) => (c.note ?? "").includes(stamp))
const uploaded = (await (await fetch(`${B}/api/cards?limit=20`)).json()).cards.filter((c) => c.title === `e2e-${ts}.png`)
for (const c of [...mine, ...uploaded]) await fetch(`${B}/api/cards/${c.id}`, { method: "DELETE" })
ok("cleanup", true, `${mine.length + uploaded.length} cards`)
ok("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "))
await b.close()
process.exit(failed ? 1 : 0)
