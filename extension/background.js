const DEFAULT_ENDPOINT = "http://localhost:3000"

const endpoint = async () =>
  (await chrome.storage.sync.get("endpoint")).endpoint || DEFAULT_ENDPOINT

// A 401 means the session ended (signed out, or the mind switched zen address): forget every
// local cache so no trace of one mind shows up for another.
async function guard(res) {
  if (res.status === 401) await chrome.storage.local.clear()
  return res
}

async function save(body) {
  const base = await endpoint()
  const res = await guard(
    await fetch(`${base}/api/cards`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    }),
  )
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: res.ok ? "Saved to zen" : "zen could not save that",
    message: body.url ?? body.quote ?? body.note ?? "",
  })
  return res.ok
}

async function saveImage(src, pageUrl) {
  const base = await endpoint()
  const blob = await (await fetch(src)).blob()
  const form = new FormData()
  form.append("file", blob, src.split("/").pop()?.slice(0, 40) || "image.png")
  form.append("url", pageUrl)
  const res = await guard(await fetch(`${base}/api/upload`, { method: "POST", body: form, credentials: "include" }))
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png",
    title: res.ok ? "Image saved to zen" : "zen could not save that image",
    message: pageUrl,
  })
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "page", title: "Save page to zen", contexts: ["page"] })
  chrome.contextMenus.create({ id: "selection", title: "Save selection as a quote", contexts: ["selection"] })
  chrome.contextMenus.create({ id: "image", title: "Save image to zen", contexts: ["image"] })
  chrome.contextMenus.create({ id: "link", title: "Save link to zen", contexts: ["link"] })
})

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "page") await save({ url: tab.url, title: tab.title })
  if (info.menuItemId === "link") await save({ url: info.linkUrl })
  if (info.menuItemId === "selection")
    await save({ kind: "quote", quote: info.selectionText, url: tab.url, title: tab.title })
  if (info.menuItemId === "image") await saveImage(info.srcUrl, tab.url)
})

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "save-page") return
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  await save({ url: tab.url, title: tab.title })
})
