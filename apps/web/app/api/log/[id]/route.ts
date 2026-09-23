import { sql } from "@/lib/db"
import { deleteSpace, unlinkCards } from "@/lib/cards"
import { json } from "@/lib/http"
import { withUser } from "@/lib/user"

type Params = { params: Promise<{ id: string }> }
type Undo = { unlink?: [string, string]; deleteSpace?: string }

/** Takes back one thing the drop did on its own. */
export const DELETE = withUser(async (me, _: Request, { params }: Params) => {
  const { id } = await params
  const [row] = await sql<{ undo: Undo | null }[]>`
    SELECT undo FROM agent_log WHERE id = ${id} AND user_id = ${me} AND undone_at IS NULL AND action IN ('tie', 'space')`
  if (!row?.undo) return json({ error: "nothing to undo" }, 404)
  if (row.undo.unlink) await unlinkCards(me, row.undo.unlink[0], row.undo.unlink[1])
  if (row.undo.deleteSpace) await deleteSpace(me, row.undo.deleteSpace)
  await sql`UPDATE agent_log SET undone_at = now() WHERE id = ${id}`
  return json({ ok: true })
})
