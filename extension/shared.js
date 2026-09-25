// Loaded by both the service worker (importScripts, background.js stays a classic script) and
// the popup (a plain <script> tag before popup.js). The one place "the session ended" forgets
// every local cache, so the rule is written once, not once per context.
//
// Only clears when there is something to clear: the popup listens for storage.onChanged to react
// to a cache clear it didn't cause itself (e.g. a right-click save's 401), and an unconditional
// clear() would re-fire that listener against an already-empty cache forever.
async function forgetSession() {
  const all = await chrome.storage.local.get(null)
  if (Object.keys(all).length) await chrome.storage.local.clear()
}

// The site identity used for muting: just the lowercase hostname, kept in chrome.storage.sync
// (a device preference, like the corner and the zen address — not per-mind cache, so it survives
// a sign-out).
function siteKey(url) {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}
