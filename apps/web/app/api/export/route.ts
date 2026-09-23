import { sql } from "@/lib/db"
import { withUser } from "@/lib/user"

// Your mind, as one file. mymind sells this as "your data stays yours".
export const GET = withUser(async (me) => {
  const cards = await sql`SELECT * FROM cards WHERE user_id = ${me} AND deleted_at IS NULL ORDER BY created_at`
  // Embeddings are 1024 floats each and the importer recomputes them.
  for (const card of cards) delete card.embedding
  const spaces = await sql`SELECT * FROM spaces WHERE user_id = ${me} ORDER BY created_at`
  const members = await sql`SELECT cs.* FROM card_spaces cs JOIN spaces s ON s.id = cs.space_id WHERE s.user_id = ${me}`
  const links = await sql`SELECT l.* FROM card_links l JOIN cards c ON c.id = l.from_id WHERE c.user_id = ${me}`
  const body = JSON.stringify({ exported_at: new Date(), cards, spaces, members, links }, null, 2)
  return new Response(body, {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="zen-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  })
})
