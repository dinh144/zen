import { chromium } from "playwright"
import fs from "node:fs"

// Cloud mode against `npx supabase start`: magic-link sign-in via Mailpit, isolation between
// three users, direct uploads, signed URLs, sharing, daily limit (build with ZEN_DAILY_CARDS=20),
// account deletion, sign-out.
const B = process.env.ZEN_URL ?? "http://localhost:3002"
const MAIL = "http://127.0.0.1:54324/api/v1"
let failed = 0
const ok = (name, cond, extra = "") => (console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`), cond || failed++)
const browser = await chromium.launch()
const errors = []

async function signIn(email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } })
  const page = await ctx.newPage()
  page.on("pageerror", (e) => errors.push(`${email}: ${e.message}`))
  await page.goto(`${B}/login`)
  await page.locator("input[type=email]").fill(email)
  await page.getByRole("button", { name: /gửi đường dẫn|send me a link/i }).click()
  await page.getByRole("status").waitFor({ timeout: 10000 })
  let link = null
  for (let i = 0; i < 20 && !link; i++) {
    await page.waitForTimeout(500)
    const list = await (await fetch(`${MAIL}/search?query=${encodeURIComponent("to:" + email)}`)).json()
    const id = list.messages?.[0]?.ID
    if (!id) continue
    const msg = await (await fetch(`${MAIL}/message/${id}`)).json()
    link = /href="([^"]+)"/.exec(msg.HTML ?? "")?.[1]?.replace(/&amp;/g, "&") ?? null
  }
  await page.goto(link)
  await page.waitForURL(`${B}/`, { timeout: 15000 })
  return { ctx, page }
}

const stamp = Date.now()
const a = await signIn(`a${stamp}@zen.test`)
ok("A signs in by magic link and lands on the board", a.page.url() === `${B}/`)
ok("A's new board is seeded", (await a.page.locator("main figure").count()) >= 3)

const api = (who, path, init) => who.page.request.fetch(`${B}${path}`, init)
const note = await (await api(a, "/api/cards", { method: "POST", data: { note: `secret of A ${stamp}` } })).json()
ok("A saves a note", Boolean(note.card?.id))

// Storage: upload through the API, then the file route hands the browser a signed URL.
const png = fs.readFileSync(new URL("../../../extension/icon.png", import.meta.url))
const upRes = await api(a, "/api/upload", { method: "POST", multipart: { file: { name: "a.png", mimeType: "image/png", buffer: png } } }); const up = await upRes.json()
ok("A uploads an image into the bucket", up.card?.kind === "image", up.card?.meta?.file ?? JSON.stringify(up).slice(0, 120))
const file = await api(a, `/api/file/${up.card.meta.file}`, { maxRedirects: 0 })
ok("file route redirects to a signed storage URL", file.status() === 302 && /\/storage\/v1\/object\/sign\//.test(file.headers().location ?? ""))
const fetched = await a.page.request.get(file.headers().location)
ok("signed URL returns the same bytes", fetched.ok() && (await fetched.body()).equals(png))

// Big files skip the function body limit: browser -> signed URL -> storage.
const big = new URL("./big.png", import.meta.url).pathname
fs.writeFileSync(big, Buffer.concat([png, Buffer.alloc(6 * 1024 * 1024, 7)]))
await a.page.goto(`${B}/`, { waitUntil: "networkidle" })
await a.page.locator("input[type=file]").first().setInputFiles(big)
const reqs = []
a.page.on("response", (r) => { if (/upload|storage/.test(r.url())) reqs.push(`${r.request().method()} ${r.status()} ${r.url().slice(0, 90)}`) })
let bigCard = null
for (let i = 0; i < 30 && !bigCard; i++) {
  await a.page.waitForTimeout(1000)
  bigCard = (await (await api(a, "/api/cards?limit=5")).json()).cards.find((c) => c.title === "big.png") ?? null
}
if (!bigCard) console.log("upload requests:", reqs)
ok("6 MB upload goes browser -> storage -> card", bigCard?.meta?.bytes === fs.statSync(big).size, `${bigCard?.meta?.bytes} bytes`)

const b = await signIn(`b${stamp}@zen.test`)
const bCards = (await (await api(b, "/api/cards")).json()).cards
ok("B cannot claim A's uploaded file", (await api(b, "/api/upload", { method: "POST", data: { intent: "done", file: bigCard.meta.file, name: "x.png", type: "image/png" } })).status() === 403)
ok("B does not see A's cards", !bCards.some((c) => c.id === note.card.id || c.id === up.card.id), `(${bCards.length} of B's own)`)
ok("B searching A's words finds nothing of A's", !(await (await api(b, `/api/cards?q=${encodeURIComponent("secret of A")}`)).json()).cards.some((c) => c.id === note.card.id))
ok("B cannot open A's card", (await api(b, `/api/cards/${note.card.id}`)).status() === 404)
await api(b, `/api/cards/${note.card.id}`, { method: "DELETE" })
ok("B cannot delete A's card", (await api(a, `/api/cards/${note.card.id}`)).status() === 200)
const bNote = (await (await api(b, "/api/cards", { method: "POST", data: { note: "b's own" } })).json()).card
await api(b, `/api/cards/${bNote.id}`, { method: "PATCH", data: { link: note.card.id } })
ok("B cannot tie a card to A's", (await (await api(b, `/api/cards/${bNote.id}`)).json()).links.length === 0)
const aSpace = (await (await api(a, "/api/spaces", { method: "POST", data: { name: "A only" } })).json()).space
await api(b, `/api/spaces/${aSpace.id}`, { method: "PATCH", data: { add: bNote.id } })
ok("B cannot drop a card into A's space", (await (await api(a, `/api/spaces/${aSpace.id}`)).json()).cards.length === 0)
const bExport = await (await api(b, "/api/export")).json()
ok("B's export holds only B's cards", bExport.cards.every((c) => c.user_id === bExport.cards[0].user_id) && !bExport.cards.some((c) => c.id === note.card.id))

// Share: A shares the space; a stranger sees A's shared cards and nothing more.
await api(a, `/api/spaces/${aSpace.id}`, { method: "PATCH", data: { add: note.card.id } })
const shared = (await (await api(a, `/api/spaces/${aSpace.id}`, { method: "PATCH", data: { shared: true } })).json()).space
const anon = await (await browser.newContext()).newPage()
await anon.goto(`${B}/s/${shared.share_token}`)
ok("stranger sees the shared space", (await anon.locator("main figure").count()) === 1)
ok("stranger's API calls are refused", (await anon.request.get(`${B}/api/cards`)).status() === 401)

// Daily allowance: B has made 1 card; 20 are allowed, the 21st is refused.
let status = 0
for (let i = 0; i < 20; i++) status = (await api(b, "/api/cards", { method: "POST", data: { note: `burst ${i}` } })).status()
ok("daily card limit answers 429", status === 429)

// A third mind deletes itself: rows, files and the account are gone.
const c = await signIn(`c${stamp}@zen.test`)
await api(c, "/api/upload", { method: "POST", multipart: { file: { name: "c.png", mimeType: "image/png", buffer: png } } })
await c.page.goto(`${B}/settings`, { waitUntil: "networkidle" })
await c.page.getByRole("button", { name: /xoá tài khoản|delete my account/i }).click()
await c.page.waitForTimeout(800)
ok("first press only asks", c.page.url().endsWith("/settings") && (await api(c, "/api/cards")).status() === 200)
await c.page.getByRole("button", { name: /bấm lần nữa|press again/i }).click()
await c.page.waitForURL(`${B}/`)
ok("deleted account is signed out", (await api(c, "/api/cards")).status() === 401)

// Sign out ends the session.
await a.page.goto(`${B}/settings`)
await a.page.getByRole("button", { name: /rời đi|sign out/i }).click()
await a.page.waitForURL(`${B}/`)
ok("A signs out", (await api(a, "/api/cards")).status() === 401)
ok("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "))
await browser.close()
process.exit(failed ? 1 : 0)
