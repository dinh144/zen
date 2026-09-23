import { randomBytes } from "node:crypto"

import { sql } from "./db"
import { embed } from "./ai"
import type { Card, Space } from "./types"

// Vietnamese needs the accents folded away on both sides of the comparison.
const DOC = sql`to_tsvector('simple', zen_unaccent(
  coalesce(title,'') || ' ' || coalesce(note,'') || ' ' || coalesce(content,'') || ' ' || coalesce(domain,'')))`

const COLUMNS = sql`id, kind, title, url, domain, note, content, image_path, meta, colors, tags,
  ARRAY(SELECT space_id FROM card_spaces WHERE card_id = cards.id) AS space_ids,
  article_html IS NOT NULL AS has_article, pinned_at, seen_at, enriched_at, created_at, updated_at`

/** Newest first; `after` is the id of the last card seen. Its row is the cursor, so
 *  equal timestamps never skip a card and JSON's millisecond dates never drift. */
export async function listCards(me: string, limit = 60, after?: string) {
  return sql<Card[]>`
    SELECT ${COLUMNS} FROM cards
    WHERE user_id = ${me} AND deleted_at IS NULL
      ${after ? sql`AND (created_at, id) < (SELECT created_at, id FROM cards WHERE id = ${after} AND user_id = ${me})` : sql``}
    ORDER BY created_at DESC, id DESC LIMIT ${limit}`
}

/** Top of Mind: the few cards pinned above everything else. */
export async function pinnedCards(me: string) {
  return sql<Card[]>`
    SELECT ${COLUMNS} FROM cards
    WHERE user_id = ${me} AND deleted_at IS NULL AND pinned_at IS NOT NULL
    ORDER BY pinned_at DESC LIMIT 12`
}

export const setPinned = (me: string, id: string, pinned: boolean) =>
  sql`UPDATE cards SET pinned_at = ${pinned ? sql`now()` : null} WHERE id = ${id} AND user_id = ${me}`

/** Serendipity's Keep: stop this card resurfacing for a while. */
export const markSeen = (me: string, id: string) =>
  sql`UPDATE cards SET seen_at = now() WHERE id = ${id} AND user_id = ${me}`

export async function article(me: string, id: string) {
  const [row] = await sql<{ article_html: string | null; title: string | null; url: string | null; domain: string | null }[]>`
    SELECT article_html, title, url, domain FROM cards WHERE id = ${id} AND user_id = ${me} AND deleted_at IS NULL`
  return row ?? null
}

/** Same Vibe: the images that feel like this one. */
export async function sameVibe(me: string, id: string, limit = 24) {
  return sql<Card[]>`
    SELECT ${COLUMNS} FROM cards
    WHERE user_id = ${me} AND deleted_at IS NULL AND id <> ${id} AND embedding IS NOT NULL
      AND kind IN ('image', 'video', 'link', 'article', 'product')
    ORDER BY embedding <=> (SELECT embedding FROM cards WHERE id = ${id} AND user_id = ${me})
    LIMIT ${limit}`
}

/** Both ends must be yours: the SELECT finds nothing to insert otherwise. */
export const linkCards = (me: string, from: string, to: string) =>
  sql`INSERT INTO card_links (from_id, to_id)
    SELECT a.id, b.id FROM cards a, cards b
    WHERE a.id = ${from} AND b.id = ${to} AND a.user_id = ${me} AND b.user_id = ${me}
    ON CONFLICT DO NOTHING`

export const unlinkCards = (me: string, from: string, to: string) =>
  sql`DELETE FROM card_links WHERE (from_id, to_id) IN ((${from}, ${to}), (${to}, ${from}))
    AND from_id IN (SELECT id FROM cards WHERE user_id = ${me})`

/** Both directions at once — a link you made from either end is the same link. */
export async function linkedCards(me: string, id: string) {
  return sql<Card[]>`
    SELECT ${COLUMNS} FROM cards
    WHERE user_id = ${me} AND deleted_at IS NULL AND id IN (
      SELECT to_id FROM card_links WHERE from_id = ${id}
      UNION SELECT from_id FROM card_links WHERE to_id = ${id})
    ORDER BY created_at DESC`
}

export async function getCard(me: string, id: string) {
  const [card] = await sql<Card[]>`SELECT ${COLUMNS} FROM cards WHERE id = ${id} AND user_id = ${me} AND deleted_at IS NULL`
  return card ?? null
}

// Colour words search the sampled palette, the way mymind finds "that orange chair".
const COLOR_WORDS: Record<string, [number, number, number]> = {
  red: [220, 40, 40],
  orange: [255, 120, 30],
  yellow: [240, 210, 60],
  green: [70, 170, 80],
  blue: [50, 110, 210],
  purple: [140, 80, 190],
  pink: [240, 140, 180],
  brown: [120, 80, 50],
  black: [20, 20, 20],
  white: [245, 245, 245],
  grey: [130, 130, 130],
  gray: [130, 130, 130],
  // Vietnamese asks for colours by their own names.
  "đỏ": [220, 40, 40],
  cam: [255, 120, 30],
  "vàng": [240, 210, 60],
  "xanh lá": [70, 170, 80],
  "xanh dương": [50, 110, 210],
  "tím": [140, 80, 190],
  "hồng": [240, 140, 180],
  "nâu": [120, 80, 50],
  "đen": [20, 20, 20],
  "trắng": [245, 245, 245],
  "xám": [130, 130, 130],
}

/** mymind's one input: plain words, plus `#tag`, `is:kind`, `site:domain`. */
export async function searchCards(me: string, raw: string, limit = 60) {
  const filters = {
    tags: [] as string[],
    kinds: [] as string[],
    sites: [] as string[],
    after: null as string | null,
    before: null as string | null,
  }
  let words = raw
    .split(/\s+/)
    .filter((word) => {
      if (word.startsWith("#")) return !filters.tags.push(word.slice(1).toLowerCase())
      if (word.startsWith("is:")) return !filters.kinds.push(word.slice(3).toLowerCase())
      if (word.startsWith("site:")) return !filters.sites.push(word.slice(5).toLowerCase())
      if (word.startsWith("loai:")) return !filters.kinds.push(word.slice(5).toLowerCase())
      if (word.startsWith("trang:")) return !filters.sites.push(word.slice(6).toLowerCase())
      if (word.startsWith("after:")) {
        filters.after = word.slice(6)
        return false
      }
      if (word.startsWith("before:")) {
        filters.before = word.slice(7)
        return false
      }
      return true
    })
    .join(" ")
    .trim()

  // "today", "yesterday", "last week", "this month" read as dates, not words.
  const phrases: Record<string, string> = {
    today: "1 day",
    yesterday: "2 days",
    "this week": "7 days",
    "last week": "14 days",
    "this month": "31 days",
    "this year": "365 days",
    "hôm nay": "1 day",
    "hôm qua": "2 days",
    "tuần này": "7 days",
    "tuần trước": "14 days",
    "tháng này": "31 days",
    "năm nay": "365 days",
  }
  for (const [phrase, interval] of Object.entries(phrases)) {
    if (words.toLowerCase().includes(phrase)) {
      filters.after = filters.after ?? `now-${interval}`
      words = words.toLowerCase().replace(phrase, "").trim()
    }
  }

  const since = filters.after?.startsWith("now-")
    ? sql`now() - ${filters.after.slice(4)}::interval`
    : filters.after
      ? sql`${filters.after}::timestamptz`
      : null

  const color = COLOR_WORDS[words.trim().toLowerCase()]
  if (color) {
    const [red, green, blue] = color
    return sql<Card[]>`
      SELECT ${COLUMNS} FROM cards
      WHERE user_id = ${me} AND deleted_at IS NULL AND EXISTS (
        SELECT 1 FROM unnest(colors) AS hex
        WHERE abs(('x' || substr(hex, 2, 2))::bit(8)::int - ${red}) < 95
          AND abs(('x' || substr(hex, 4, 2))::bit(8)::int - ${green}) < 95
          AND abs(('x' || substr(hex, 6, 2))::bit(8)::int - ${blue}) < 95)
      ORDER BY created_at DESC LIMIT ${limit}`
  }

  const vector = words ? await embed(words, "RETRIEVAL_QUERY") : null
  const vec = vector ? JSON.stringify(vector) : null

  const match = words
    ? sql`(${DOC} @@ plainto_tsquery('simple', zen_unaccent(${words}))
        OR zen_unaccent(coalesce(title,'')) ILIKE zen_unaccent(${"%" + words + "%"})
        OR zen_unaccent(coalesce(note,'')) ILIKE zen_unaccent(${"%" + words + "%"})
        OR EXISTS (SELECT 1 FROM unnest(tags) tag WHERE zen_unaccent(tag) ILIKE zen_unaccent(${"%" + words + "%"})))`
    : sql`true`

  const rows = await sql<(Card & { vscore: number; lex: boolean })[]>`
    SELECT ${COLUMNS}, ${match} AS lex,
      CASE WHEN ${vec}::vector IS NULL OR embedding IS NULL THEN 0
           ELSE 1 - (embedding <=> ${vec}::vector) END AS vscore,
      ts_rank(${DOC}, plainto_tsquery('simple', zen_unaccent(${words || "zzzz"}))) AS tscore
    FROM cards
    WHERE user_id = ${me} AND deleted_at IS NULL
      ${filters.tags.length ? sql`AND tags && ${filters.tags}` : sql``}
      ${filters.kinds.length ? sql`AND kind = ANY(${filters.kinds})` : sql``}
      ${filters.sites.length ? sql`AND domain = ANY(${filters.sites})` : sql``}
      ${since ? sql`AND created_at >= ${since}` : sql``}
      ${filters.before ? sql`AND created_at < ${filters.before}::timestamptz` : sql``}
      ${
        words
          ? sql`AND (${match}
              OR (${vec}::vector IS NOT NULL AND embedding IS NOT NULL AND 1 - (embedding <=> ${vec}::vector) > 0.38))`
          : sql``
      }
    ORDER BY (0.65 * CASE WHEN ${vec}::vector IS NULL OR embedding IS NULL THEN 0
                          ELSE 1 - (embedding <=> ${vec}::vector) END)
           + (0.35 * ts_rank(${DOC}, plainto_tsquery('simple', zen_unaccent(${words || "zzzz"})))) DESC,
             created_at DESC
    LIMIT ${limit}`

  // bge-m3 scores a right match ~0.39–0.60 and a wrong one up to ~0.48 when a
  // better one exists, across languages, so a meaning-only hit must sit near the best.
  // ponytail: cut tuned by hand on bge-m3; retune if the embed model changes.
  const best = Math.max(0, ...rows.map((row) => row.vscore))
  return rows.filter((row) => row.lex || row.vscore >= best - 0.06) as Card[]
}

/** Serendipity: old cards, shuffled, the way mymind resurfaces things. */
export async function randomCards(me: string, limit = 12) {
  return sql<Card[]>`
    SELECT ${COLUMNS} FROM cards
    WHERE user_id = ${me} AND deleted_at IS NULL
      AND (seen_at IS NULL OR seen_at < now() - interval '30 days')
    ORDER BY random() LIMIT ${limit}`
}

export async function relatedCards(me: string, id: string, limit = 12) {
  return sql<Card[]>`
    SELECT ${COLUMNS} FROM cards
    WHERE user_id = ${me} AND deleted_at IS NULL AND id <> ${id} AND embedding IS NOT NULL
      AND embedding <=> (SELECT embedding FROM cards WHERE id = ${id} AND user_id = ${me}) IS NOT NULL
    ORDER BY embedding <=> (SELECT embedding FROM cards WHERE id = ${id} AND user_id = ${me})
    LIMIT ${limit}`
}

/** Only web links are links: a javascript: or data: URL would run in zen's origin once clicked. */
export const webUrl = (value: unknown) => {
  try {
    const url = new URL(String(value))
    return url.protocol === "http:" || url.protocol === "https:" ? url : null
  } catch {
    return null
  }
}

export async function createCard(me: string, input: Partial<Card>) {
  const safe = input.url ? webUrl(input.url) : null
  input = { ...input, url: safe?.href ?? null }
  const domain = safe ? safe.hostname.replace(/^www\./, "") : null
  const row = {
      user_id: me,
      kind: input.kind ?? (input.url ? "link" : "note"),
      title: input.title ?? null,
      url: input.url ?? null,
      domain,
      note: input.note ?? null,
      content: input.content ?? null,
      image_path: input.image_path ?? null,
      meta: input.meta ?? {},
      colors: input.colors ?? [],
      tags: input.tags ?? [],
  }
  const [card] = await sql<Card[]>`
    INSERT INTO cards ${sql(row as never)} RETURNING ${COLUMNS}`
  return card!
}

export async function updateCard(me: string, id: string, patch: Partial<Card>) {
  const fields: Record<string, unknown> = { updated_at: new Date() }
  for (const key of ["kind", "title", "note", "tags", "colors"] as const) {
    if (patch[key] !== undefined) fields[key] = patch[key]
  }
  const [card] = await sql<Card[]>`
    UPDATE cards SET ${sql(fields as never)} WHERE id = ${id} AND user_id = ${me} RETURNING ${COLUMNS}`
  return card ?? null
}

export const deleteCard = (me: string, id: string) =>
  sql`UPDATE cards SET deleted_at = now() WHERE id = ${id} AND user_id = ${me}`

/** `counts` runs each Smart Space's search (an embedding call apiece): only the spaces page shows them. */
export async function listSpaces(me: string, counts = false) {
  const spaces = await sql<Space[]>`
    SELECT s.id, s.name, s.query, s.share_token, s.created_at,
           count(cs.card_id)::int AS card_count,
           coalesce(array_agg(c.image_path) FILTER (WHERE c.image_path IS NOT NULL), '{}') AS cover
    FROM spaces s
    LEFT JOIN card_spaces cs ON cs.space_id = s.id
    LEFT JOIN cards c ON c.id = cs.card_id AND c.deleted_at IS NULL
    WHERE s.user_id = ${me}
    GROUP BY s.id ORDER BY s.created_at DESC`
  // A Smart Space has no card_spaces rows: count what its search returns instead.
  if (!counts) return spaces
  await Promise.all(
    spaces
      .filter((item) => item.query)
      .map(async (space) => {
        const cards = await searchCards(me, space.query!, 120)
        space.card_count = cards.length
        space.cover = cards.flatMap((card) => (card.image_path ? [card.image_path] : []))
      }),
  )
  return spaces
}

/** A space's cards: yours by id, or anyone's by its share token (then the owner's cards, nobody else's). */
export async function spaceCards(me: string | null, idOrToken: string, byToken = false) {
  const [space] = await sql<{ id: string; query: string | null; user_id: string }[]>`
    SELECT id, query, user_id FROM spaces
    WHERE ${byToken ? sql`share_token = ${idOrToken}` : sql`id = ${idOrToken} AND user_id = ${me}`}`
  if (!space) return []
  if (space.query) return searchCards(space.user_id, space.query, 120)

  return sql<Card[]>`
    SELECT ${COLUMNS} FROM cards
    WHERE user_id = ${space.user_id} AND deleted_at IS NULL
      AND id IN (SELECT card_id FROM card_spaces WHERE space_id = ${space.id})
    ORDER BY created_at DESC`
}

/** A space with a query is a Smart Space: it fills itself from that search. */
export async function createSpace(me: string, name: string, query?: string | null) {
  const [space] = await sql<Space[]>`
    INSERT INTO spaces (user_id, name, query) VALUES (${me}, ${name}, ${query ?? null}) RETURNING *`
  return space!
}

export async function setSpaceShared(me: string, id: string, shared: boolean) {
  const token = shared ? randomBytes(9).toString("hex") : null
  const [space] = await sql<Space[]>`
    UPDATE spaces SET share_token = ${token} WHERE id = ${id} AND user_id = ${me} RETURNING *`
  return space ?? null
}

export const addToSpace = (me: string, cardId: string, spaceId: string) =>
  sql`INSERT INTO card_spaces (card_id, space_id)
    SELECT c.id, s.id FROM cards c, spaces s
    WHERE c.id = ${cardId} AND s.id = ${spaceId} AND c.user_id = ${me} AND s.user_id = ${me}
    ON CONFLICT DO NOTHING`

export const removeFromSpace = (me: string, cardId: string, spaceId: string) =>
  sql`DELETE FROM card_spaces WHERE card_id = ${cardId}
    AND space_id IN (SELECT id FROM spaces WHERE id = ${spaceId} AND user_id = ${me})`

export const deleteSpace = (me: string, id: string) => sql`DELETE FROM spaces WHERE id = ${id} AND user_id = ${me}`

const SEED = [
  {
    kind: "note" as const,
    title: "Start here today",
    note: "Paste a link. Drop an image. Type a thought.\nEverything is tagged for you — no folders, no filing.\nSearch by what you remember: a colour, an object, a word inside a picture.",
  },
  {
    kind: "quote" as const,
    title: "Your mind, not a feed",
    content: "Remember everything. Organize nothing.",
    meta: { quote: "Remember everything. Organize nothing." },
  },
  {
    kind: "note" as const,
    title: "Keyboard",
    note: "Type anywhere to search.\n⌘+Enter saves the note you are writing.\nShift+D switches day and night.\nEsc clears the search.",
  },
]

/** A mind that has never been used gets three cards, the way mymind seeds one. */
export async function seedIfEmpty(me: string) {
  const [row] = await sql<{ count: number }[]>`SELECT count(*)::int FROM cards WHERE user_id = ${me}`
  if (row!.count > 0) return
  for (const card of SEED) await createCard(me, card)
}

export async function stats(me: string) {
  const [row] = await sql<{ total: number; tags: number; days: number }[]>`
    SELECT count(*)::int AS total,
           (SELECT count(DISTINCT t)::int FROM cards, unnest(tags) t WHERE user_id = ${me} AND deleted_at IS NULL) AS tags,
           (SELECT count(DISTINCT date_trunc('day', created_at))::int FROM cards WHERE user_id = ${me} AND deleted_at IS NULL) AS days
    FROM cards WHERE user_id = ${me} AND deleted_at IS NULL`
  return row!
}

export async function unlocked(me: string) {
  return sql<{ key: string; unlocked_at: string }[]>`SELECT key, unlocked_at FROM achievements WHERE user_id = ${me}`
}

export const unlock = (me: string, key: string) =>
  sql`INSERT INTO achievements (user_id, key) VALUES (${me}, ${key}) ON CONFLICT DO NOTHING`

const DAILY_CARDS = Number(process.env.ZEN_DAILY_CARDS ?? 500)

/** Counts `n` new cards against today's allowance; false once the day is spent. */
export async function spend(me: string, n = 1) {
  const [row] = await sql<{ cards: number }[]>`
    INSERT INTO usage (user_id, cards) VALUES (${me}, ${n})
    ON CONFLICT (user_id, day) DO UPDATE SET cards = usage.cards + ${n}
    RETURNING cards`
  return row!.cards <= DAILY_CARDS
}
