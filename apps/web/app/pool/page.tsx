import { currentUser } from "@/lib/user"
import { listCards, listSpaces, seedIfEmpty } from "@/lib/cards"
import { clustersOf } from "@/lib/clusters"
import { sql } from "@/lib/db"
import { redirect } from "next/navigation"
import { PoolMap } from "@/components/pool-map"
import { TopNav } from "@/components/top-nav"

export const dynamic = "force-dynamic"

// The graph: every card as a node, clusters as colours, and "ask zen".
export default async function PoolPage() {
  const me = await currentUser()
  if (!me) redirect("/login")
  await seedIfEmpty(me)
  // ponytail: draws the newest 400 cards; collapse far clusters into supernodes past that.
  const [cards, clusters, spaces, edges] = await Promise.all([
    listCards(me, 400),
    clustersOf(me),
    listSpaces(me),
    // Edges: ties the person made, cards that share an entity, and each card's two nearest in meaning.
    sql<{ from_id: string; to_id: string; kind: "tie" | "entity" | "near" }[]>`
      SELECT l.from_id, l.to_id, 'tie' AS kind FROM card_links l JOIN cards c ON c.id = l.from_id
        WHERE c.user_id = ${me} AND c.deleted_at IS NULL
      UNION
      SELECT DISTINCT a.card_id, b.card_id, 'entity' FROM card_entities a
        JOIN card_entities b ON b.entity_id = a.entity_id AND b.card_id > a.card_id
        JOIN cards c ON c.id = a.card_id WHERE c.user_id = ${me} AND c.deleted_at IS NULL
      UNION
      SELECT c.id, n.id, 'near' FROM cards c CROSS JOIN LATERAL (
        SELECT d.id FROM cards d WHERE d.user_id = ${me} AND d.id <> c.id AND d.deleted_at IS NULL AND d.embedding IS NOT NULL
          AND 1 - (d.embedding <=> c.embedding) > 0.5
        ORDER BY d.embedding <=> c.embedding LIMIT 2) n
        WHERE c.user_id = ${me} AND c.deleted_at IS NULL AND c.embedding IS NOT NULL`,
  ])
  return (
    <div data-page className="relative">
      <div className="absolute inset-x-0 top-0 z-10">
        <TopNav />
      </div>
      <PoolMap cards={cards} clusters={clusters} edges={[...edges]} spaces={spaces} />
    </div>
  )
}
