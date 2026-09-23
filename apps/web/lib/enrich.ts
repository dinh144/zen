
import { sql } from "./db"
import { sanitizeArticle } from "./sanitize"
import { safeFetch } from "./safe-fetch"
import { cloud } from "./supabase"
import { embed, enrichImage, enrichText } from "./ai"
import { readPdf } from "./pdf"
import { getFile } from "./storage"
import type { Kind } from "./types"


const meta = (html: string, prop: string) => {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`,
    "i",
  )
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`,
    "i",
  )
  return html.match(re)?.[1] ?? html.match(alt)?.[1] ?? null
}

const decode = (s: string | null) =>
  s
    ?.replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">") ?? null

// Postgres rejects NUL bytes, and scraped pages are full of them.
const clean = (value: string | null) => value?.replace(/\u0000/g, "") ?? null

const strip = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

// A note like "#B23A2F" is a colour card: its colours are the ones written in it.
const hexesIn = (text: string) => [...new Set(text.match(/#[0-9a-f]{6}\b/gi) ?? [])].slice(0, 5)

// Kind from the host and the page's own metadata, before any model call.
function detectKind(url: string, html: string): Kind {
  const host = new URL(url).hostname.replace(/^www\./, "")
  if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com/.test(host)) return "video"
  if (/twitter\.com|x\.com/.test(host)) return "tweet"
  if (/imdb\.com|letterboxd\.com/.test(host)) return "movie"
  if (/goodreads\.com|amazon\.[a-z.]+\/.*\/dp\/|books\.google/.test(url)) return "book"
  if (/linkedin\.com\/in\//.test(url)) return "person"
  if (/fonts\.google\.com\/specimen|fontshare\.com\/fonts|myfonts\.com\/collections|dafont\.com|fontsquirrel\.com\/fonts|\.(woff2?|ttf|otf)($|\?)/i.test(url))
    return "font"
  if (/\.pdf($|\?)/i.test(url)) return "pdf"
  const ogType = meta(html, "og:type")
  if (ogType === "video.other" || ogType === "video.movie") return "video"
  if (ogType === "product" || meta(html, "product:price:amount")) return "product"
  if (ogType === "article" || meta(html, "article:published_time")) return "article"
  if (/recipe/i.test(html.slice(0, 4000)) && /ingredient/i.test(html)) return "recipe"
  return "link"
}

// A 5000px photo costs minutes on a CPU model and adds nothing: 768px is plenty.
async function shrink(buf: Buffer) {
  const sharp = (await import("sharp")).default
  return sharp(buf).resize(768, 768, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()
}

// Real pixels, not the model's guess: a 3x3 downsample is the picture's palette.
async function palette(buf: Buffer) {
  const sharp = (await import("sharp")).default
  const { data } = await sharp(buf).resize(3, 3, { fit: "cover" }).raw().toBuffer({ resolveWithObject: true })
  const hexes: string[] = []
  for (let index = 0; index < data.length; index += 3) {
    const hex = `#${[data[index]!, data[index + 1]!, data[index + 2]!]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("")}`
    if (!hexes.some((seen) => near(seen, hex))) hexes.push(hex)
  }
  return hexes.slice(0, 5)
}

const channel = (hex: string, at: number) => parseInt(hex.slice(at, at + 2), 16)
const near = (a: string, b: string) =>
  [1, 3, 5].every((at) => Math.abs(channel(a, at) - channel(b, at)) < 40)

async function fetchImageBase64(url: string) {
  try {
    const res = await safeFetch(url, { headers: { "user-agent": "Mozilla/5.0 zen" } }, cloud)
    if (!res.ok) return null
    const type = res.headers.get("content-type") ?? "image/jpeg"
    if (!type.startsWith("image/")) return null
    const raw = Buffer.from(await res.arrayBuffer())
    const buf = await shrink(raw)
    return { base64: buf.toString("base64"), mime: "image/jpeg", colors: await palette(raw) }
  } catch {
    return null
  }
}

/** Runs after the card row exists, so capture stays instant. */
export async function enrichCard(id: string) {
  const [card] = await sql`SELECT * FROM cards WHERE id = ${id}`
  if (!card) return

  let kind: Kind = card.kind
  let title: string | null = card.title
  let content = card.content ?? ""
  const patch: Record<string, unknown> = {}

  if (card.url && !card.image_path) {
    try {
      const res = await safeFetch(card.url, { headers: { "user-agent": "Mozilla/5.0 (compatible; zen/1.0)" } }, cloud)
      // A direct image URL is an image card, not a link card.
      const contentType = res.headers.get("content-type") ?? ""
      if (contentType.startsWith("image/")) {
        await sql`UPDATE cards SET kind = 'image', meta = ${sql.json({ ...card.meta, image: card.url } as never)} WHERE id = ${id}`
        const [again] = await sql`SELECT * FROM cards WHERE id = ${id}`
        card.kind = again!.kind
        card.meta = again!.meta
      }
      const html = contentType.startsWith("image/") ? "" : (await res.text()).slice(0, 400_000)
      if (!html) {
        kind = "image"
        patch.meta = { ...card.meta, image: card.url }
      } else {
      kind = detectKind(card.url, html)
      title =
        decode(meta(html, "og:title")) ??
        decode(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null) ??
        title
      const description = decode(meta(html, "og:description")) ?? ""
      const image = decode(meta(html, "og:image"))
      content = strip(html).slice(0, 8000)
      // Reading Mode + article backup: keep the readable article, not the page.
      const readable = readArticle(html, card.url)
      if (readable) {
        // If it reads like an article, it is one, whatever the page claims.
        if (kind === "link") kind = "article"
        patch.article_html = sanitizeArticle(readable.html)
        await sql`INSERT INTO achievements (user_id, key) VALUES (${card.user_id}, 'first-article') ON CONFLICT DO NOTHING`
        content = readable.text.slice(0, 20000)
        if (!title) title = readable.title
      }
      patch.meta = {
        ...card.meta,
        description,
        image,
        site: decode(meta(html, "og:site_name")),
        author: decode(meta(html, "author")) ?? decode(meta(html, "article:author")),
        price: decode(meta(html, "product:price:amount")),
        currency: decode(meta(html, "product:price:currency")),
        published: decode(meta(html, "article:published_time")),
        readingMinutes: Math.max(1, Math.round(content.split(" ").length / 220)),
      }

      // YouTube and friends hide og tags behind a consent page; oEmbed does not.
      if (!title || kind === "video") {
        const oembed = await fetchOEmbed(card.url)
        if (oembed) {
          title = oembed.title ?? title
          patch.meta = { ...(patch.meta as object), image: oembed.thumbnail_url, author: oembed.author_name }
        }
      }
      }
    } catch {
      /* unreachable page: keep what the capture gave us */
    }
  }

  // A PDF is read page by page; a video is judged by its poster frame.
  const pdfBytes = card.kind === "pdf" && card.image_path ? await getFile(card.image_path) : null
  if (pdfBytes) {
    const pdf = await readPdf(pdfBytes)
    content = pdf.text.slice(0, 20000)
    patch.meta = { ...card.meta, pages: pdf.pages, poster: pdf.poster ?? (card.meta as { poster?: string }).poster }
  }

  const visual =
    card.kind === "pdf" || card.kind === "video"
      ? ((patch.meta ?? card.meta) as { poster?: string }).poster
      : null

  const image = visual
    ? await readUpload(visual)
    : card.image_path
    ? await readUpload(card.image_path)
    : (patch.meta as { image?: string } | undefined)?.image
      ? await fetchImageBase64((patch.meta as { image: string }).image)
      : null

  const ai =
    image && image.base64
      ? await enrichImage(image.base64, image.mime, `${title ?? ""}\n${content.slice(0, 1500)}`)
      : await enrichText(
          [title, card.note, content].filter(Boolean).join("\n").slice(0, 8000),
        )

  if (ai) {
    // Only the model's guess for a bare note, and only among kinds a piece of
    // text can actually be — it keeps calling notes "image".
    const TEXT_KINDS: Kind[] = ["note", "quote", "color", "person", "recipe"]
    if (ai.kind && !card.url && card.kind === "note" && TEXT_KINDS.includes(ai.kind as Kind)) {
      kind = ai.kind as Kind
    }
    if (!title && ai.title) title = ai.title
    // OCR only applies to a picture; for text items the model just echoes the input.
    if (ai.text && image?.base64) content = `${content}\n${ai.text}`.trim()
    patch.tags = ai.tags.slice(0, 12)
    // Colours only mean something when a picture was actually looked at.
    patch.colors = image?.colors?.length
      ? image.colors
      : image?.base64
        ? ai.colors.slice(0, 5)
        : hexesIn(`${title ?? ""} ${card.note ?? ""} ${content}`)
    // A note that is little more than hex codes is a colour card, whatever the model said.
    const bare = (card.note ?? "").replace(/#[0-9a-f]{6}\b/gi, "").trim()
    if (!card.url && card.kind === "note" && hexesIn(card.note ?? "").length && bare.length < 30) kind = "color"
    patch.meta = { ...(patch.meta ?? card.meta), summary: ai.summary }
  }

  const vector = await embed(
    [title, card.note, (patch.tags as string[])?.join(" "), content.slice(0, 4000)]
      .filter(Boolean)
      .join("\n"),
  )

  await sql`
    UPDATE cards SET
      kind = ${kind},
      article_html = ${(patch.article_html as string | undefined) ?? null},
      title = ${clean(title)},
      content = ${clean(content) || null},
      tags = ${(patch.tags as string[]) ?? card.tags},
      colors = ${(patch.colors as string[]) ?? card.colors},
      meta = ${sql.json((patch.meta ?? card.meta) as never)},
      embedding = ${vector ? JSON.stringify(vector) : null},
      enriched_at = now(),
      updated_at = now()
    WHERE id = ${id}`
}

/** Readability gives the article body; we keep the HTML for Reading Mode. */
function readArticle(html: string, url: string) {
  try {
    const { JSDOM } = require("jsdom") as typeof import("jsdom")
    const { Readability } = require("@mozilla/readability") as typeof import("@mozilla/readability")
    const dom = new JSDOM(html, { url })
    const parsed = new Readability(dom.window.document).parse()
    if (!parsed?.content || (parsed.textContent?.length ?? 0) < 1200) return null
    return { html: clean(parsed.content)!, text: clean(parsed.textContent ?? null) ?? "", title: parsed.title ?? null }
  } catch {
    return null
  }
}

type OEmbed = { title?: string; thumbnail_url?: string; author_name?: string }

async function fetchOEmbed(url: string): Promise<OEmbed | null> {
  const host = new URL(url).hostname.replace(/^www\./, "")
  const endpoint = /youtube\.com|youtu\.be/.test(host)
    ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
    : /vimeo\.com/.test(host)
      ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`
      : null
  if (!endpoint) return null
  try {
    const res = await fetch(endpoint)
    return res.ok ? ((await res.json()) as OEmbed) : null
  } catch {
    return null
  }
}

async function readUpload(name: string) {
  try {
    const raw = await getFile(name)
    if (!raw) return null
    return { base64: (await shrink(raw)).toString("base64"), mime: "image/jpeg", colors: await palette(raw) }
  } catch {
    return null
  }
}
