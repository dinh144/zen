import { randomUUID } from "node:crypto"
import { putFile } from "./storage"

/** PDF analysis: the text of every page, plus a picture of the first one. */
export async function readPdf(bytes: Uint8Array) {
  const { extractText, getDocumentProxy, renderPageAsImage } = await import("unpdf")
  const data = new Uint8Array(bytes)

  const pdf = await getDocumentProxy(data.slice())
  const { text, totalPages } = await extractText(pdf, { mergePages: false })
  const pages = (text as string[]).map((page, index) => `--- page ${index + 1} ---\n${page.trim()}`)

  let poster: string | null = null
  try {
    const image = await renderPageAsImage(data.slice(), 1, { canvasImport: () => import("@napi-rs/canvas") })
    poster = `${randomUUID()}.png`
    await putFile(poster, new Uint8Array(image), "image/png")
  } catch {
    poster = null
  }

  return { pages: totalPages, text: pages.join("\n\n"), poster }
}
