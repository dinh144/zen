// [[Title]] in a note ties it to the card with that title, both ways, like Obsidian.
const WIKI = /\[\[([^\[\]\n]{1,120})\]\]/g

export const wikiTitles = (note: string | null) => [...new Set([...(note ?? "").matchAll(WIKI)].map((match) => match[1]!.trim()))]

/** Markdown with each [[Title]] as a link the note view turns into a button. */
export const withWikiLinks = (markdown: string) =>
  markdown.replace(WIKI, (_, title: string) => `[${title.trim()}](#wiki:${encodeURIComponent(title.trim())})`)
