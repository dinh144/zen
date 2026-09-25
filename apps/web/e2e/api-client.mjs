import { chromium } from "playwright"
import fs from "node:fs"

// zen-web-05: the board list rendered through the typed API client — the mind's own token forwarded
// by the server component to its own /api, no direct database call in the page. A video for Dinh's
// visual review; behaviourally this is the same board local.mjs already exercises.
const B = process.env.ZEN_URL ?? "http://localhost:3000"
let failed = 0
const ok = (name, cond) => (console.log(`${cond ? "PASS" : "FAIL"} ${name}`), cond || failed++)

const OUT = new URL("./.videos/", import.meta.url).pathname
fs.mkdirSync(OUT, { recursive: true })
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: OUT } })
const p = await ctx.newPage()
const errors = []
p.on("pageerror", (e) => errors.push(e.message))
p.on("console", (m) => m.type() === "error" && errors.push(m.text()))

const requests = []
p.on("request", (req) => req.url().includes("/api/cards") && requests.push(req))

await p.goto(B + "/", { waitUntil: "load" })
await p.waitForTimeout(1200)

// The board list came from the server component's own call to the client (server-to-server: no
// cookie crosses that hop), proven live in Comments; here the page itself is what a mind sees.
ok("board renders with no console error", errors.length === 0)
ok("at least one card shows (the seeded onboarding cards)", (await p.locator("main figure").count()) > 0)
// The page's own document fetch is what the browser saw; no separate /api/cards call was needed for
// first paint (the server already rendered the list), matching a server-rendered page's contract.
ok("no client-side /api/cards call was needed for first paint", requests.length === 0)

await p.waitForTimeout(500)
await ctx.close()
await b.close()
console.log(failed ? `${failed} failed` : "all passed")
process.exit(failed ? 1 : 0)
