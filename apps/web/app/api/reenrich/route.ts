import { after } from "next/server"
import { sql } from "@/lib/db"
import { enrichCard } from "@/lib/enrich"
import { json } from "@/lib/http"
import { withUser } from "@/lib/user"

/** Re-runs tagging and embeddings — after changing model, or for cards saved while Ollama was down. */
export const POST = withUser(async (me, request: Request) => {
  const all = new URL(request.url).searchParams.get("all") === "1"
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM cards
    WHERE user_id = ${me} AND deleted_at IS NULL ${all ? sql`` : sql`AND (embedding IS NULL OR tags = '{}')`}
    ORDER BY created_at DESC LIMIT 200`

  after(async () => {
    for (const row of rows) await enrichCard(row.id)
  })

  return json({ queued: rows.length })
})
