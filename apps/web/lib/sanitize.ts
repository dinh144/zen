import createDOMPurify from "dompurify"
import { JSDOM } from "jsdom"

const purify = createDOMPurify(new JSDOM("").window)

/** Saved articles come from any page on the web: strip scripts, handlers and javascript: links. */
export const sanitizeArticle = (html: string) =>
  purify.sanitize(html, { FORBID_TAGS: ["style", "form", "iframe", "object", "embed"], FORBID_ATTR: ["style", "role"], ALLOW_ARIA_ATTR: false })
