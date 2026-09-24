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

// A 401 means the session ended: forget every local cache so no trace of one mind shows up for
// another. Every call is tagged with a token so a slower, now-stale call (e.g. from the previous
// endpoint) can never clobber a newer one's result.
let checkToken = 0
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
  if (res.status === 401) await chrome.storage.local.clear()
  if (token === checkToken) showView(res.ok ? "in" : "out")
}

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
  if (res.status === 401) {
    await chrome.storage.local.clear()
    return checkSignedIn()
  }
  saveButton.textContent = "could not save"
})
