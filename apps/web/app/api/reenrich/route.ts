import { sql } from "@/lib/db"
import { queueCards } from "@/lib/jobs"
import { json } from "@/lib/http"
import { withUser } from "@/lib/user"

/** Re-runs tagging and embeddings — after changing model, or for cards saved while Ollama was down. */
export const POST = withUser(async (me, request: Request) => {
  const all = new URL(request.url).searchParams.get("all") === "1"
  const rows = await sql<{ id: string }[]>`
    SELECT id FROM cards
    WHERE user_id = ${me} AND deleted_at IS NULL ${all ? sql`` : sql`AND (embedding IS NULL OR tags = '{}')`}
    ORDER BY created_at DESC LIMIT 200`

  await queueCards(rows.map((row) => row.id), me)

  return json({ queued: rows.length })
})
