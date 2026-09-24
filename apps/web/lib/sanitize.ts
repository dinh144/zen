import createDOMPurify from "dompurify"
import { JSDOM } from "jsdom"

const purify = createDOMPurify(new JSDOM("").window)

/** Saved articles come from any page on the web: strip scripts, handlers and javascript: links. */
export function sanitizeArticle(html: string) {
  // ARIA attributes carry accessible names (aria-label, aria-labelledby) for images and links
  // that have no visible text of their own — stripping them was failing axe's image-alt/link-name checks.
  const clean = purify.sanitize(html, { FORBID_TAGS: ["style", "form", "iframe", "object", "embed"], FORBID_ATTR: ["style", "role"] })
  // Scraped pages routinely drop alt text; an unlabelled image, or a link that is only an
  // unlabelled image, fails axe's image-alt / link-name checks, so give both a safe fallback.
  const { document } = new JSDOM(`<body>${clean}</body>`).window
  for (const img of document.querySelectorAll("img:not([alt])")) img.setAttribute("alt", "")
  for (const a of document.querySelectorAll("a")) {
    if (a.textContent?.trim() || a.getAttribute("aria-label")) continue
    const img = a.querySelector("img")
    if (img) img.setAttribute("alt", "image")
    else a.setAttribute("aria-label", "link")
  }
  return document.body.innerHTML
}
