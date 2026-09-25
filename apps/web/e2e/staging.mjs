import { chromium } from "playwright"
import { fetchConfirmationLink } from "./mailpit.mjs"

// Staging behaviour: allowlist + test-mind password sign-in (ticket 03). Two runs needed, one per
// build, set EXPECT:
//   EXPECT=on  ZEN_URL=... TEST_MIND_EMAIL=... TEST_MIND_PASSWORD=... node e2e/staging.mjs   (NEXT_PUBLIC_ZEN_STAGING=1 build)
//   EXPECT=off ZEN_URL=...                                              node e2e/staging.mjs   (no NEXT_PUBLIC_ZEN_STAGING build)
const B = process.env.ZEN_URL ?? "http://localhost:3002"
const MAIL = process.env.ZEN_MAILPIT_URL ?? "http://127.0.0.1:54324/api/v1"
const EXPECT = process.env.EXPECT ?? "on"
let failed = 0
const ok = (name, cond, extra = "") => (console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`), cond || failed++)
const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()

await page.goto(`${B}/login`)
const pwField = page.locator('input[type="password"]')
// Next's route announcer also carries role="alert"; scope to the login form's own error paragraph.
const alert = (p) => p.locator('p[role="alert"]')

if (EXPECT === "off") {
  ok("staging flag off: no password field on /login", (await pwField.count()) === 0)
  const res = await page.request.fetch(`${B}/auth/password`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    data: { email: "anyone@zen.test", password: "whatever" },
  })
  ok("staging flag off: /auth/password refuses even a well-formed request", res.status() === 404)
  await browser.close()
  process.exit(failed ? 1 : 0)
}

const email = process.env.TEST_MIND_EMAIL
const password = process.env.TEST_MIND_PASSWORD
if (!email || !password) throw new Error("EXPECT=on needs TEST_MIND_EMAIL and TEST_MIND_PASSWORD")

ok("staging flag on: the password field renders on /login", (await pwField.count()) === 1)

await pwField.fill("wrong password on purpose")
await page.locator('input[type="email"]').fill(email)
await page.getByRole("button", { name: /vào|enter/i }).click()
await alert(page).waitFor({ timeout: 5000 })
ok("wrong password is refused", ((await alert(page).textContent()) ?? "").length > 0)

await pwField.fill(password)
await page.getByRole("button", { name: /vào|enter/i }).click()
await page.waitForURL(`${B}/`, { timeout: 10000 })
ok("allowlisted test mind signs in with a password and lands on the board", page.url() === `${B}/`)

// A mind not on the allowlist: refused with a clear message, magic link included.
const strangerEmail = `stranger${Date.now()}@zen.test`
const stranger = await (await browser.newContext()).newPage()
await stranger.goto(`${B}/login`)
await stranger.locator('input[type="email"]').fill(strangerEmail)
await stranger.getByRole("button", { name: /gửi đường dẫn|send me a link/i }).click()
await stranger.getByRole("status").waitFor({ timeout: 10000 })
const link = await fetchConfirmationLink(MAIL, strangerEmail)
await stranger.goto(link)
await stranger.waitForURL(`${B}/login?error=allowlist`, { timeout: 10000 })
const msg = await alert(stranger).textContent()
ok("a mind off the allowlist is refused with a clear message", Boolean(msg && msg.length > 0), msg ?? "")

await browser.close()
process.exit(failed ? 1 : 0)
