const noteField = document.getElementById("note")
const endpointField = document.getElementById("endpoint")
const signedOut = document.getElementById("signedOut")
const signedIn = document.getElementById("signedIn")
const unreachable = document.getElementById("unreachable")
const signInLink = document.getElementById("signInLink")
const saveButton = document.getElementById("save")

const base = () => (endpointField.value || "http://localhost:3000").replace(/\/$/, "")

// Set synchronously, before the first sign-in check even starts, so nothing ever reads a view
// that hasn't been decided yet (see showView below).
document.body.dataset.view = "checking"

// The view is also mirrored onto body[data-view] — a plain, unambiguous "is a check in flight"
// signal (tests wait on it; display:none alone can't tell "already this view" from "just arrived").
function showView(view) {
  document.body.dataset.view = view
  signedOut.style.display = view === "out" ? "block" : "none"
  signedIn.style.display = view === "in" ? "block" : "none"
  unreachable.style.display = view === "unreachable" ? "block" : "none"
}

// Every check (and the 401 reaction below) is tagged with a rising token so a slower, now-stale
// call can never clobber a newer one's result — not the view, and not the cache clear either.
let checkToken = 0

// The server has already answered 401 — forget the cache and show the sign-in prompt right away,
// no second round trip to ask again what we were just told (used by checkSignedIn and the save
// handler alike, so the rule lives in one place).
async function showSignedOut() {
  const token = ++checkToken
  document.body.dataset.checkSeq = String(token)
  await forgetSession()
  if (token !== checkToken) return // a newer check started while the cache was clearing
  signInLink.href = `${base()}/login`
  showView("out")
}

async function checkSignedIn() {
  const token = ++checkToken
  document.body.dataset.checkSeq = String(token)
  showView("checking")
  signInLink.href = `${base()}/login`
  let res
  try {
    res = await fetch(`${base()}/api/cards?limit=1`, { credentials: "include" })
  } catch {
    if (token === checkToken) showView("unreachable")
    return
  }
  if (token !== checkToken) return // a newer check has already started; this result is stale
  if (res.status === 401) return showSignedOut()
  showView(res.ok ? "in" : "unreachable") // any other non-2xx (5xx, 429, …) is an error, not "sign in"
}

// An open popup reacts even to a cache clear it didn't cause itself — a right-click or
// Ctrl+Shift+S save's 401 is handled entirely in the service worker, but the popup still updates.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local") checkSignedIn()
})

chrome.storage.sync.get("endpoint").then(({ endpoint }) => {
  endpointField.value = endpoint || "http://localhost:3000"
  checkSignedIn()
})

// Switching zen address means any cache built for the old one is stale.
endpointField.addEventListener("change", async () => {
  await chrome.storage.sync.set({ endpoint: base() })
  await chrome.storage.local.clear()
  checkSignedIn()
})

saveButton.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  let res
  try {
    res = await fetch(`${base()}/api/cards`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: tab.url, title: tab.title, note: noteField.value || null }),
      credentials: "include",
    })
  } catch {
    saveButton.textContent = "zen unreachable — try again"
    return
  }
  if (res.ok) return window.close()
  if (res.status === 401) return showSignedOut()
  saveButton.textContent = "could not save"
})
