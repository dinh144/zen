// The resting drop: one per top-frame page load, once the page is idle (manifest run_at:
// document_idle). Guards run before anything is built: never incognito, never on a page with a
// password field (one inserted later removes the drop at once), never on a muted site.
;(async function () {
  if (chrome.extension.inIncognitoContext) return
  if (document.querySelector('input[type="password"]')) return

  const key = siteKey(location.href)
  const { mutedSites = [] } = await chrome.storage.sync.get("mutedSites")
  if (key && mutedSites.includes(key)) return

  let { corner = "bottom-right" } = await chrome.storage.sync.get("corner")
  const t = (msgKey) => chrome.i18n.getMessage(msgKey) || msgKey

  // Fixed viewport positioning lives on the host (a light-DOM element, so page CSS can in
  // principle still reach its own box — the one part of "styles cannot leak either way" that no
  // shadow host can fully avoid; its content stays protected). A shadow host's box always wraps
  // its rendered shadow content, so this alone places the visible drop correctly.
  function cornerStyle(next) {
    const [v, h] = next.split("-")
    return `all: initial; position: fixed; z-index: 2147483647; display: block; ${v}: 16px; ${h}: 16px;`
  }

  const host = document.createElement("div")
  host.dataset.zenDropHost = ""
  host.dataset.zenCorner = corner
  host.dataset.zenMenu = "closed"
  host.style.cssText = cornerStyle(corner)
  // Appended last, so it never takes the page's first tab stop.
  document.body.appendChild(host)
  const shadow = host.attachShadow({ mode: "closed" })

  const handle = ZenDropUI.mount(shadow, {
    t,
    corner,
    // Mirrored onto the host's own attribute — a normal light-DOM element, unlike its closed
    // shadow content, so the e2e harness can observe menu state without reaching inside it.
    onMenuChange(open) {
      host.dataset.zenMenu = open ? "open" : "closed"
    },
    async onMove() {
      corner = ZenDropUI.CORNERS[(ZenDropUI.CORNERS.indexOf(corner) + 1) % ZenDropUI.CORNERS.length]
      host.style.cssText = cornerStyle(corner)
      host.dataset.zenCorner = corner
      handle.setCorner(corner)
      await chrome.storage.sync.set({ corner })
    },
    onHide() {
      host.remove()
      observer.disconnect()
    },
    async onMute() {
      if (!key) return
      const { mutedSites: current = [] } = await chrome.storage.sync.get("mutedSites")
      if (!current.includes(key)) await chrome.storage.sync.set({ mutedSites: [...current, key] })
      host.remove()
      observer.disconnect()
    },
  })

  const observer = new MutationObserver(() => {
    if (document.querySelector('input[type="password"]')) {
      host.remove()
      observer.disconnect()
    }
  })
  observer.observe(document.documentElement, { childList: true, subtree: true })
})()
