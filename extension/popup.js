const noteField = document.getElementById("note")
const endpointField = document.getElementById("endpoint")
const signedOut = document.getElementById("signedOut")
const signedIn = document.getElementById("signedIn")
const signInLink = document.getElementById("signInLink")
const saveButton = document.getElementById("save")

const base = () => (endpointField.value || "http://localhost:3000").replace(/\/$/, "")

function showSignedIn(yes) {
  signedOut.style.display = yes ? "none" : "block"
  signedIn.style.display = yes ? "block" : "none"
}

// A 401 means the session ended: forget every local cache so no trace of one mind shows up for another.
async function checkSignedIn() {
  signInLink.href = `${base()}/login`
  const res = await fetch(`${base()}/api/cards?limit=1`, { credentials: "include" })
  if (res.status === 401) await chrome.storage.local.clear()
  showSignedIn(res.ok)
  return res.ok
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
  const res = await fetch(`${base()}/api/cards`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: tab.url, title: tab.title, note: noteField.value || null }),
    credentials: "include",
  })
  if (res.ok) return window.close()
  if (res.status === 401) {
    await chrome.storage.local.clear()
    return checkSignedIn()
  }
  saveButton.textContent = "could not save"
})
