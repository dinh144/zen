export const KINDS = [
  "note",
  "quote",
  "link",
  "article",
  "image",
  "video",
  "product",
  "book",
  "movie",
  "recipe",
  "tweet",
  "person",
  "color",
  "font",
  "pdf",
  "file",
] as const

export type Kind = (typeof KINDS)[number]

export type Card = {
  id: string
  kind: Kind
  title: string | null
  url: string | null
  domain: string | null
  note: string | null
  content: string | null
  image_path: string | null
  meta: Record<string, unknown>
  colors: string[]
  tags: string[]
  space_ids?: string[]
  has_article: boolean
  pinned_at: string | null
  seen_at: string | null
  enriched_at: string | null
  created_at: string
  updated_at: string
}

export type Space = {
  id: string
  name: string
  query: string | null
  share_token: string | null
  created_at: string
  parent_id?: string | null
  card_count?: number
  cover?: string[]
}
