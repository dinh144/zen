import createDOMPurify from "dompurify"
import { JSDOM } from "jsdom"

const purify = createDOMPurify(new JSDOM("").window)

// Only the one ARIA attribute Reading Mode needs stays allowed: aria-label carries the
// accessible name for an icon-only link or image a scraped page left unlabelled. Every other
// aria-* (aria-hidden in particular, which can hide real article text from a screen reader)
// stays stripped, same as before.
purify.setConfig({
  FORBID_TAGS: ["style", "form", "iframe", "object", "embed"],
  FORBID_ATTR: ["style", "role"],
  ALLOW_ARIA_ATTR: false,
  ADD_ATTR: ["aria-label"],
})

// The current call's article URL, for resolving a relative href to a hostname. Safe as a module
// variable: sanitize() is synchronous, so no other call's hook can see the wrong value mid-flight.
let base: string | undefined

// Scraped pages routinely drop alt text, and axe fails an unlabelled image or a link whose only
// content is one. Fixed up here, inside DOMPurify's own tree walk, rather than a second full
// re-parse — Reading Mode sanitizes on every view, not just once at save time. Never overwrites
// an alt or aria-label the source already had; only fills what is genuinely missing, and never
// bakes in an English word — an unlabelled image gets an empty (decorative) alt, and a link falls
// back to its own destination's host, never a literal.
purify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "IMG" && !node.hasAttribute("alt")) node.setAttribute("alt", "")
  if (node.tagName !== "A") return
  if (node.textContent?.trim() || node.getAttribute("aria-label")?.trim()) return
  if (node.querySelector("img")?.getAttribute("alt")?.trim()) return
  const href = node.getAttribute("href")
  if (!href) return
  try {
    node.setAttribute("aria-label", new URL(href, base).hostname)
  } catch {
    /* relative href, no article URL to resolve it against: leave it as the source had it */
  }
})

/** Saved articles come from any page on the web: strip scripts, handlers and javascript: links. */
export function sanitizeArticle(html: string, articleUrl?: string) {
  base = articleUrl
  return purify.sanitize(html)
}
