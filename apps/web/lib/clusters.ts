import Graph from "graphology"
import louvain from "graphology-communities-louvain"
import { sql } from "./db"
import { generateJson } from "./ai"
import { languageOf } from "./settings"

// Ties weigh most, a shared entity next, closeness in meaning least: the user's own hand beats the model's.
const WEIGHT = { tie: 3, entity: 1.5, near: 1 }
const NEIGHBOURS = 5
const MIN_SIMILARITY = 0.45 // bge-m3 / Gemini cosine; below this two cards are not "alike"

/** Same seed, same clusters: a map that reshuffles on every visit cannot be learned. */
function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type ClusterView = { id: string; name: string | null; pinned: boolean; card_ids: string[] }

/**
 * Rebuilds a mind's clusters. Cards in one of the user's (non-smart) spaces stay in that space's pinned
 * cluster; everything else is grouped by Louvain over ties, shared entities and nearest neighbours.
 * ponytail: rebuilds the whole mind each run (fine to a few thousand cards); go incremental past that.
 */
export async function recluster(me: string) {
  const cards = await sql<{ id: string; title: string | null; tags: string[] }[]>`
    SELECT id, coalesce(title, left(note, 60)) AS title, tags FROM cards WHERE user_id = ${me} AND deleted_at IS NULL`
  const pinnedRows = await sql<{ card_id: string; space_id: string; name: string }[]>`
    SELECT DISTINCT ON (cs.card_id) cs.card_id, s.id AS space_id, s.name
    FROM card_spaces cs JOIN spaces s ON s.id = cs.space_id
    WHERE s.user_id = ${me} AND s.query IS NULL
    ORDER BY cs.card_id, s.created_at`
  const pinnedOf = new Map(pinnedRows.map((row) => [row.card_id, row]))

  const graph = new Graph({ type: "undirected" })
  for (const card of cards) if (!pinnedOf.has(card.id)) graph.addNode(card.id)
  const link = (a: string, b: string, weight: number) => {
    if (a === b || !graph.hasNode(a) || !graph.hasNode(b)) return
    if (graph.hasEdge(a, b)) graph.updateEdgeAttribute(a, b, "weight", (w: number) => w + weight)
    else graph.addEdge(a, b, { weight })
  }

  for (const { from_id, to_id } of await sql<{ from_id: string; to_id: string }[]>`
    SELECT l.from_id, l.to_id FROM card_links l JOIN cards c ON c.id = l.from_id WHERE c.user_id = ${me}`)
    link(from_id, to_id, WEIGHT.tie)

  for (const { a, b } of await sql<{ a: string; b: string }[]>`
    SELECT x.card_id AS a, y.card_id AS b FROM card_entities x
    JOIN card_entities y ON y.entity_id = x.entity_id AND y.card_id > x.card_id
    JOIN cards c ON c.id = x.card_id WHERE c.user_id = ${me}`)
    link(a, b, WEIGHT.entity)

  for (const { a, b, similarity } of await sql<{ a: string; b: string; similarity: number }[]>`
    SELECT c.id AS a, n.id AS b, 1 - (c.embedding <=> n.embedding) AS similarity
    FROM cards c
    CROSS JOIN LATERAL (
      SELECT id, embedding FROM cards o
      WHERE o.user_id = ${me} AND o.deleted_at IS NULL AND o.id <> c.id AND o.embedding IS NOT NULL
      ORDER BY o.embedding <=> c.embedding LIMIT ${NEIGHBOURS}) n
    WHERE c.user_id = ${me} AND c.deleted_at IS NULL AND c.embedding IS NOT NULL`)
    if (similarity >= MIN_SIMILARITY) link(a, b, WEIGHT.near * similarity)

  const community: Record<string, number> =
    graph.size > 0 ? louvain(graph, { getEdgeWeight: "weight", rng: seeded(42) }) : {}

  // Machine clusters of two or more cards; a lone card stays loose rather than a cluster of one.
  const groups = new Map<number, string[]>()
  for (const [id, group] of Object.entries(community)) groups.set(group, [...(groups.get(group) ?? []), id])
  const machine = [...groups.values()].filter((ids) => ids.length > 1)
  const pinned = new Map<string, { name: string; ids: string[] }>()
  for (const row of pinnedRows) {
    const entry = pinned.get(row.space_id) ?? { name: row.name, ids: [] }
    entry.ids.push(row.card_id)
    pinned.set(row.space_id, entry)
  }

  const titleOf = new Map(cards.map((card) => [card.id, card]))
  const names = await nameClusters(machine.map((ids) => ids.map((id) => titleOf.get(id)!)), await languageOf(me))

  await sql.begin(async (tx) => {
    await tx`DELETE FROM clusters WHERE user_id = ${me}`
    for (const [spaceId, { name, ids }] of pinned) {
      const [row] = await tx<{ id: string }[]>`
        INSERT INTO clusters (user_id, name, space_id) VALUES (${me}, ${name}, ${spaceId}) RETURNING id`
      for (const id of ids) await tx`INSERT INTO card_clusters VALUES (${id}, ${row!.id})`
    }
    for (const [index, ids] of machine.entries()) {
      const [row] = await tx<{ id: string }[]>`
        INSERT INTO clusters (user_id, name) VALUES (${me}, ${names[index] ?? null}) RETURNING id`
      for (const id of ids) await tx`INSERT INTO card_clusters VALUES (${id}, ${row!.id})`
    }
    await tx`INSERT INTO agent_log (user_id, action, summary)
      VALUES (${me}, 'recluster', ${`gom ${machine.length} cụm, giữ ${pinned.size} không gian`})`
  })
  return { machine: machine.length, pinned: pinned.size, loose: cards.length - machine.flat().length - pinnedRows.length }
}

/** The model only names clusters; without it the commonest tag stands in. */
async function nameClusters(groups: { title: string | null; tags: string[] }[][], lang: string) {
  if (!groups.length) return []
  const named = await generateJson<{ names: string[] }>(
    `Name each group of saved items with 1-3 lowercase words a person would use for it, written in ${lang}.
Reply as JSON: {"names": ["..."]} with exactly ${groups.length} names, in order.
${groups.map((group, index) => `${index + 1}. ${group.map((card) => card.title ?? "").filter(Boolean).slice(0, 12).join(" | ")}`).join("\n")}`,
  )
  return groups.map((group, index) => {
    const name = named?.names?.[index]
    if (typeof name === "string" && name.trim()) return name.trim().toLowerCase().slice(0, 40)
    const counts = new Map<string, number>()
    for (const tag of group.flatMap((card) => card.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  })
}

export async function clustersOf(me: string) {
  return sql<ClusterView[]>`
    SELECT c.id, c.name, c.space_id IS NOT NULL AS pinned,
           coalesce(array_agg(cc.card_id) FILTER (WHERE cc.card_id IS NOT NULL), '{}') AS card_ids
    FROM clusters c LEFT JOIN card_clusters cc ON cc.cluster_id = c.id
    WHERE c.user_id = ${me}
    GROUP BY c.id ORDER BY count(cc.card_id) DESC`
}
