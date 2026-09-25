import {
  createReporter,
  withExtension,
  zenClient,
  checkSignedOutState,
  runSignedInChecks,
  runBubbleChecks,
  assertOnlyZenTraffic,
} from "./extension-harness.mjs"

// Local mode: the unpacked extension in a real Chromium, against fixture pages served by this
// test and a real zen dev server. Sign-in state, the session cookie, cache-clearing on 401, and
// the entry points (popup save, Ctrl+Shift+S, and the right-click saves — see the ticket's
// Comments for how a native context-menu click itself is exercised, since Playwright cannot drive it).
const B = (process.env.ZEN_URL ?? "http://localhost:3000").replace(/\/$/, "")
const PASSWORD = process.env.ZEN_PASSWORD ?? ""
const stamp = `ext-e2e ${Date.now()}`
const { ok, skip, failed } = createReporter()

await withExtension("local", async ({ ctx, extId, headless, seenHosts, swEvaluate, FX }) => {
  ok(`unpacked extension loads a service worker (${headless ? "headless" : "headed"})`, true, `chrome-extension://${extId}/background.js`)
  ok(
    "save/saveImage are reachable for the thinnest-honest entry-point checks",
    (await swEvaluate(() => [typeof self.save, typeof self.saveImage].join(","))) === "function,function",
  )

  await swEvaluate((base) => chrome.storage.sync.set({ endpoint: base }), B)
  const { api, cards } = zenClient(ctx, B)

  // 1. A fresh profile has no session cookie: the signed-out state, everywhere.
  const freshStatus = await swEvaluate((base) => fetch(`${base}/api/cards?limit=1`, { credentials: "include" }).then((r) => r.status), B)
  if (freshStatus === 401) {
    await checkSignedOutState({ ok, ctx, extId, swEvaluate, B })
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
    await runSignedInChecks({ ok, ctx, extId, swEvaluate, B, FX, stamp, api, cards })
  } else {
    skip("signed-in flows (popup save, command, right-click saves)", "no working ZEN_PASSWORD sign-in")
  }

  // The resting drop makes no zen call at all (chrome.storage only) — run once here, not
  // repeated in extension.cloud.mjs.
  await runBubbleChecks({ ok, ctx, extId, swEvaluate, FX })

  assertOnlyZenTraffic({ ok, seenHosts, B, allowed: [B, FX, `chrome-extension://${extId}`] })
})

process.exit(failed() ? 1 : 0)
