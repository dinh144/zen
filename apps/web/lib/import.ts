import type { Card } from "./types"

export type Incoming = Partial<Card> & { id?: string }

/** Browser/Pocket bookmark HTML: <A HREF="…" TAGS="a,b">title</A>. */
export function fromHtml(text: string): Incoming[] {
  return [...text.matchAll(/<a\s[^>]*href="(https?:[^"]+)"[^>]*>([^<]*)<\/a>/gi)].map(([tag, url, title]) => ({
    url,
    title: title?.trim() || null,
    tags: /tags="([^"]*)"/i.exec(tag)?.[1]?.split(",").filter(Boolean) ?? [],
  }))
}

/** Raindrop and Pocket CSV: a header row naming url, title, note/excerpt, tags. */
export function fromCsv(text: string): Incoming[] {
  const rows: string[][] = [[]]
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted && ch === '"' && text[i + 1] === '"') {
      field += '"'
      i++
    } else if (ch === '"') {
      quoted = !quoted
    } else if (!quoted && (ch === "," || ch === "\n")) {
      rows.at(-1)!.push(field.replace(/\r$/, ""))
      field = ""
      if (ch === "\n") rows.push([])
    } else {
      field += ch
    }
  }
  rows.at(-1)!.push(field)
  const [head = [], ...body] = rows
  const col = (...names: string[]) => head.findIndex((name) => names.includes(name.trim().toLowerCase()))
  const [url, title, note, tags] = [col("url"), col("title"), col("note", "excerpt"), col("tags")]
  return body
    .filter((row) => url >= 0 && /^https?:/.test(row[url] ?? ""))
    .map((row) => ({
      url: row[url],
      title: row[title] || null,
      note: row[note] || null,
      tags: (row[tags] ?? "").split(/[,|]/).map((tag) => tag.trim()).filter(Boolean),
    }))
}
