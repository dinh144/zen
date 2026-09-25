import { createReporter, withExtension, zenClient, checkSignedOutState, runSignedInChecks, assertOnlyZenTraffic } from "./extension-harness.mjs"
import { fetchConfirmationLink } from "./mailpit.mjs"

// Cloud mode: the unpacked extension against a cloud build (`npx supabase start` + a cloud build,
// per CLAUDE.md), signing in for real through Supabase's magic link via Mailpit — this is where the
// session-cookie (SameSite) and popup sign-in state actually run against Supabase Auth's own cookies.
const B = (process.env.ZEN_URL ?? "http://localhost:3002").replace(/\/$/, "")
const MAIL = "http://127.0.0.1:54324/api/v1"
const stamp = `ext-e2e ${Date.now()}`
const { ok, failed } = createReporter()

await withExtension("cloud", async ({ ctx, extId, headless, seenHosts, swEvaluate, FX }) => {
  ok(`unpacked extension loads a service worker (${headless ? "headless" : "headed"})`, true, `chrome-extension://${extId}/background.js`)

  await swEvaluate((base) => chrome.storage.sync.set({ endpoint: base }), B)
  const { api, cards } = zenClient(ctx, B)

  // 1. A fresh profile has no Supabase session: the signed-out state, everywhere.
  const freshStatus = await swEvaluate((base) => fetch(`${base}/api/cards?limit=1`, { credentials: "include" }).then((r) => r.status), B)
  ok("fresh profile starts signed out", freshStatus === 401, `status ${freshStatus}`)
  await checkSignedOutState({ ok, ctx, extId, swEvaluate, B })

  // 2. Sign in for real: magic link through Mailpit, in a page in this same context so the
  //    Supabase cookies it sets land in the extension's cookie jar too.
  const email = `ext${Date.now()}@zen.test`
  const loginPage = await ctx.newPage()
  await loginPage.goto(`${B}/login`)
  await loginPage.locator("input[type=email]").fill(email)
  await loginPage.getByRole("button", { name: /gửi đường dẫn|send me a link/i }).click()
  await loginPage.getByRole("status").waitFor({ timeout: 10000 })
  const link = await fetchConfirmationLink(MAIL, email)
  await loginPage.goto(link)
  await loginPage.waitForURL(`${B}/`, { timeout: 15000 })
  await loginPage.close()

  await runSignedInChecks({ ok, ctx, extId, swEvaluate, B, FX, stamp, api, cards })

  // The resting drop (runBubbleChecks) makes no zen call at all — covered once in extension.mjs,
  // not repeated here.

  // The magic-link sign-in itself legitimately visits Supabase's own auth server mid-redirect;
  // that's zen's sign-in, not the extension writing anywhere.
  const supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321").origin
  assertOnlyZenTraffic({ ok, seenHosts, B, allowed: [B, FX, `chrome-extension://${extId}`, supabaseOrigin] })
})

process.exit(failed() ? 1 : 0)
