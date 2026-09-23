import { sql } from "./db"
import { embed, generateJson, STYLE } from "./ai"

// Bump when the extraction prompt or types change: cards read by an older version get re-read.
export const EXTRACT_VERSION = 1
export const ENTITY_TYPES = ["person", "place", "organization", "product", "food", "topic", "event", "work"] as const
type EntityType = (typeof ENTITY_TYPES)[number]

type Extracted = {
  entities: { name: string; type: EntityType; description: string }[]
  relations: { source: string; predicate: string; target: string }[]
}

// The four guidelines each close one failure mode (Anthropic KG playbook, section III.C):
// recall/noise, disambiguation, traversable predicates, no dangling edges.
const EXTRACT = (text: string) => `Extract a small knowledge graph from one item a person saved.

<item>
${text}
</item>

Guidelines:
- Extract only entities central to what this item is about; skip incidental mentions. At most 8.
- type is one of: ${ENTITY_TYPES.join(", ")}.
- For each entity write a one-sentence description grounded in this item, in the item's own language. It is used later to tell apart entities with similar names.
- Keep names as the item writes them (do not translate).
- Predicates are short verb phrases ("made with", "located in", "written by", "part of").
- Every relation connects two entities you extracted.

Reply as JSON: {"entities":[{"name":"","type":"","description":""}],"relations":[{"source":"","predicate":"","target":""}]}`

const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()

/** Reads one card into entities and relations, resolved against the mind's existing entities. */
export async function extractCard(cardId: string) {
  const [card] = await sql<{ user_id: string; title: string | null; note: string | null; content: string | null; tags: string[] }[]>`
    SELECT user_id, title, note, content, tags FROM cards WHERE id = ${cardId} AND deleted_at IS NULL`
  if (!card) return null
  const text = [card.title, card.note, card.content?.slice(0, 4000), card.tags.length ? `tags: ${card.tags.join(", ")}` : null]
    .filter(Boolean)
    .join("\n")
  if (text.trim().length < 12) return null

  const raw = await generateJson<Extracted>(EXTRACT(text))
  if (!raw || !Array.isArray(raw.entities)) return null
  const entities = raw.entities
    .filter((entity) => entity?.name?.trim() && ENTITY_TYPES.includes(entity.type))
    .slice(0, 8)
  const idOf = new Map<string, string>()
  for (const entity of entities) idOf.set(fold(entity.name), await resolve(card.user_id, entity))

  await sql.begin(async (tx) => {
    await tx`DELETE FROM card_entities WHERE card_id = ${cardId}`
    await tx`DELETE FROM relations WHERE card_id = ${cardId}`
    for (const id of new Set(idOf.values())) {
      await tx`INSERT INTO card_entities (card_id, entity_id) VALUES (${cardId}, ${id}) ON CONFLICT DO NOTHING`
    }
    for (const relation of Array.isArray(raw.relations) ? raw.relations : []) {
      const source = idOf.get(fold(relation?.source ?? ""))
      const target = idOf.get(fold(relation?.target ?? ""))
      const predicate = String(relation?.predicate ?? "").trim().slice(0, 60)
      if (!source || !target || source === target || !predicate) continue // a dangling edge is dropped, not guessed
      await tx`INSERT INTO relations (user_id, source_id, target_id, predicate, card_id)
        VALUES (${card.user_id}, ${source}, ${target}, ${predicate}, ${cardId}) ON CONFLICT DO NOTHING`
    }
    await tx`UPDATE cards SET extracted_at = now(), extract_version = ${EXTRACT_VERSION} WHERE id = ${cardId}`
  })
  return { entities: idOf.size }
}

/**
 * Finds the canonical entity for a new mention, or makes one. Cheap signals first (an alias that
 * folds to the same text, then trigram and meaning neighbours of the same type), the model only
 * arbitrates within that small block. Nothing is ever dropped: no match means a new entity.
 */
async function resolve(me: string, entity: Extracted["entities"][number]) {
  const name = entity.name.trim().slice(0, 120)
  const [exact] = await sql<{ id: string }[]>`
    SELECT e.id FROM aliases a JOIN entities e ON e.id = a.entity_id
    WHERE e.user_id = ${me} AND e.type = ${entity.type} AND zen_unaccent(lower(a.alias)) = zen_unaccent(lower(${name}))
    LIMIT 1`
  if (exact) return exact.id

  const vector = await embed(`${name}: ${entity.description ?? ""}`)
  const vec = vector ? JSON.stringify(vector) : null
  const candidates = await sql<{ id: string; name: string; description: string | null }[]>`
    SELECT id, name, description FROM entities
    WHERE user_id = ${me} AND type = ${entity.type}
      AND (similarity(zen_unaccent(lower(name)), zen_unaccent(lower(${name}))) > 0.35
        OR (${vec}::vector IS NOT NULL AND embedding IS NOT NULL AND 1 - (embedding <=> ${vec}::vector) > 0.8))
    ORDER BY similarity(zen_unaccent(lower(name)), zen_unaccent(lower(${name}))) DESC
    LIMIT 6`

  if (candidates.length) {
    const verdict = await generateJson<{ same_as: number | null }>(
      `A new ${entity.type} was mentioned: "${name}" — ${entity.description ?? ""}
Known ${entity.type} entities:
${candidates.map((c, index) => `${index + 1}. "${c.name}" — ${c.description ?? ""}`).join("\n")}
Is the new one the same real-world thing as one of them? Use the descriptions; a shared name alone is not enough.
Reply as JSON: {"same_as": <number of the match, or null if it is distinct>}`,
      { reason: true },
    )
    const match = verdict?.same_as ? candidates[verdict.same_as - 1] : undefined
    if (match) {
      await sql`INSERT INTO aliases (entity_id, alias) VALUES (${match.id}, ${name}) ON CONFLICT DO NOTHING`
      // The most complete form becomes the canonical name.
      if (name.length > match.name.length) {
        await sql`UPDATE entities SET name = ${name}, updated_at = now() WHERE id = ${match.id}
          AND NOT EXISTS (SELECT 1 FROM entities WHERE user_id = ${me} AND type = ${entity.type} AND name = ${name})`
      }
      return match.id
    }
  }

  const [row] = await sql<{ id: string }[]>`
    INSERT INTO entities (user_id, name, type, description, embedding)
    VALUES (${me}, ${name}, ${entity.type}, ${entity.description ?? null}, ${vec}::vector)
    ON CONFLICT (user_id, type, name) DO UPDATE SET updated_at = now()
    RETURNING id`
  await sql`INSERT INTO aliases (entity_id, alias) VALUES (${row!.id}, ${name}) ON CONFLICT DO NOTHING`
  return row!.id
}

/** Hubs (entities in three or more cards) get a profile synthesized across every card that mentions them. */
export async function profileHubs(me: string, lang: string) {
  const hubs = await sql<{ id: string; name: string; type: string }[]>`
    SELECT e.id, e.name, e.type FROM entities e JOIN card_entities ce ON ce.entity_id = e.id
    WHERE e.user_id = ${me} GROUP BY e.id HAVING count(*) >= 3 AND (e.summary IS NULL OR max(ce.card_id::text) IS NOT NULL)
    ORDER BY count(*) DESC LIMIT 20`
  for (const hub of hubs) {
    const excerpts = await sql<{ id: string; text: string }[]>`
      SELECT c.id, left(coalesce(c.title, '') || ' — ' || coalesce(c.note, '') || ' ' || coalesce(c.content, ''), 600) AS text
      FROM card_entities ce JOIN cards c ON c.id = ce.card_id WHERE ce.entity_id = ${hub.id} AND c.deleted_at IS NULL LIMIT 12`
    const profile = await generateJson<{ summary: string; key_facts: string[] }>(
      `Write a short profile of "${hub.name}" (${hub.type}) from the saved items below, in ${lang}.
Resolve contradictions by preferring the most specific claim. Do not invent anything the items do not say.
${STYLE}
${excerpts.map((row, index) => `[${index + 1}] ${row.text}`).join("\n")}
Reply as JSON: {"summary": "2-4 sentences", "key_facts": ["3-5 atomic facts, each ending with the [n] it comes from"]}`,
      { reason: true },
    )
    if (profile?.summary) {
      await sql`UPDATE entities SET summary = ${profile.summary}, key_facts = ${sql.json(profile.key_facts ?? [])}, updated_at = now()
        WHERE id = ${hub.id}`
    }
  }
}
