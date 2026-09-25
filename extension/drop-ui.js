// The drop's DOM: a button plus its menu. Pure DOM, no chrome.* calls — mounted into a closed
// shadow root by bubble.js on real pages, and into a plain element by the e2e a11y fixture
// (extension-a11y.mjs), since axe cannot see inside a closed shadow root. Same markup, same
// behaviour, either way, so what axe checks is what a mind actually gets.
;(function () {
  const CORNERS = ["bottom-right", "bottom-left", "top-left", "top-right"]

  function faceSvg(mood) {
    const face = (self.ZEN_DROP && self.ZEN_DROP.faces[mood]) || ""
    const path = self.ZEN_DROP ? self.ZEN_DROP.path : ""
    return `<svg viewBox="0 0 24 32" width="22" height="28" aria-hidden="true"><path d="${path}" fill="currentColor"/>${face}</svg>`
  }

  const CSS = `
    /* Fixed viewport positioning lives on the host element itself (bubble.js), not here — a
       shadow host's box always wraps its rendered shadow content, so the host being fixed is
       enough; this just gives the menu something to anchor to. */
    .zen-root { all: initial; display: block; position: relative; font: 13px/1.4 system-ui, sans-serif; }
    .zen-drop { all: unset; box-sizing: border-box; display: flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: 999px; background: #F4F1EA; color: #B23A2F;
      border: 1px solid #DED7C8; box-shadow: 0 1px 2px rgba(0,0,0,.25); cursor: pointer; }
    .zen-drop:focus-visible { outline: 2px solid #B23A2F; outline-offset: 2px; }
    @media (prefers-color-scheme: dark) { .zen-drop { background: #1C1A16; color: #D3645A; border-color: #3A352C; } }
    @media (prefers-reduced-motion: no-preference) { .zen-drop { transition: transform .2s ease; } .zen-drop:hover { transform: scale(1.05); } }
    .zen-menu { all: unset; box-sizing: border-box; position: absolute; display: none; flex-direction: column;
      min-width: 190px; padding: 4px; background: #FBF9F4; border: 1px solid #DED7C8; border-radius: 2px;
      box-shadow: 0 2px 8px rgba(0,0,0,.2); }
    .zen-root[data-menu="open"] .zen-menu { display: flex; }
    .zen-root[data-corner^="bottom"] .zen-menu { bottom: 48px; }
    .zen-root[data-corner^="top"] .zen-menu { top: 48px; }
    .zen-root[data-corner$="right"] .zen-menu { right: 0; }
    .zen-root[data-corner$="left"] .zen-menu { left: 0; }
    .zen-item { all: unset; box-sizing: border-box; display: block; width: 100%; padding: 8px 10px;
      color: #1A1A18; cursor: pointer; border-radius: 2px; }
    .zen-item:focus-visible, .zen-item:hover { background: #F4F1EA; }
    @media (prefers-color-scheme: dark) {
      .zen-menu { background: #1C1A16; border-color: #3A352C; }
      .zen-item { color: #EFE9DC; }
      .zen-item:focus-visible, .zen-item:hover { background: #14120F; }
    }
  `

  /** Mounts the drop into `root` (a ShadowRoot or a plain element, which is cleared first).
   *  `t(key)` returns localized text. Returns a handle to update mood/corner/label and to tear
   *  the drop down. */
  function mount(root, { t, corner = "bottom-right", mood = "neutral", onMove, onHide, onMute, onMenuChange }) {
    // document.activeElement stops at a shadow host and never reports what's actually focused
    // inside it — only the ShadowRoot's own .activeElement does. A plain mounted element (the
    // e2e a11y fixture) has no such property, so document.activeElement is right there instead.
    const activeItem = () => (items.indexOf("activeElement" in root ? root.activeElement : document.activeElement))
    root.innerHTML = ""
    const style = document.createElement("style")
    style.textContent = CSS

    const wrap = document.createElement("div")
    wrap.className = "zen-root"
    wrap.dataset.corner = corner
    wrap.dataset.menu = "closed"

    const button = document.createElement("button")
    button.type = "button"
    button.className = "zen-drop"
    button.innerHTML = faceSvg(mood)
    button.setAttribute("aria-haspopup", "menu")
    button.setAttribute("aria-expanded", "false")
    button.setAttribute("aria-label", t("dropOpenMenu"))

    const menu = document.createElement("div")
    menu.setAttribute("role", "menu")
    menu.className = "zen-menu"

    const items = [
      { key: "move", label: t("dropMenuMove"), run: () => onMove && onMove() },
      { key: "hide", label: t("dropMenuHide"), run: () => onHide && onHide() },
      { key: "mute", label: t("dropMenuMute"), run: () => onMute && onMute() },
    ].map(({ key, label, run }) => {
      const el = document.createElement("button")
      el.type = "button"
      el.setAttribute("role", "menuitem")
      el.className = "zen-item"
      el.dataset.zenItem = key
      el.textContent = label
      el.addEventListener("click", () => {
        run()
        closeMenu()
      })
      menu.appendChild(el)
      return el
    })

    function openMenu() {
      wrap.dataset.menu = "open"
      button.setAttribute("aria-expanded", "true")
      items[0].focus()
      if (onMenuChange) onMenuChange(true)
    }
    function closeMenu() {
      wrap.dataset.menu = "closed"
      button.setAttribute("aria-expanded", "false")
      button.focus()
      if (onMenuChange) onMenuChange(false)
    }
    button.addEventListener("click", () => (wrap.dataset.menu === "open" ? closeMenu() : openMenu()))
    // Focus trap: Tab/Shift+Tab and the arrow keys all stay inside the menu; Escape closes it and
    // returns focus to the drop.
    menu.addEventListener("keydown", (e) => {
      const i = activeItem()
      if (e.key === "Escape") {
        e.preventDefault()
        closeMenu()
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        items[(i + 1) % items.length].focus()
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        items[(i - 1 + items.length) % items.length].focus()
      } else if (e.key === "Tab") {
        e.preventDefault()
        const next = e.shiftKey ? (i - 1 + items.length) % items.length : (i + 1) % items.length
        items[next].focus()
      }
    })

    wrap.append(button, menu)
    root.append(style, wrap)

    return {
      setMood(next) {
        button.innerHTML = faceSvg(next)
      },
      setCorner(next) {
        wrap.dataset.corner = next
      },
      isMenuOpen: () => wrap.dataset.menu === "open",
      destroy() {
        root.innerHTML = ""
      },
    }
  }

  self.ZenDropUI = { mount, CORNERS }
})()
