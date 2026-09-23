const noteField = document.getElementById("note")
const endpointField = document.getElementById("endpoint")

chrome.storage.sync.get("endpoint").then(({ endpoint }) => {
  endpointField.value = endpoint || "http://localhost:3000"
})

endpointField.addEventListener("change", () =>
  chrome.storage.sync.set({ endpoint: endpointField.value.replace(/\/$/, "") }),
)

document.getElementById("save").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const base = endpointField.value.replace(/\/$/, "") || "http://localhost:3000"
  const res = await fetch(`${base}/api/cards`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: tab.url, title: tab.title, note: noteField.value || null }),
    credentials: "include",
  })
  if (res.ok) return window.close()
  document.getElementById("save").textContent = res.status === 401 ? "sign in to zen first" : "could not save"
})
