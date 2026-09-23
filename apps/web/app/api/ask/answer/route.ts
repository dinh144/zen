import { answerGrill } from "@/lib/agent"
import { json } from "@/lib/http"
import { withUser } from "@/lib/user"

/** One answered grill question: stored, and kept as a rule so it is never asked again. */
export const POST = withUser(async (me, request: Request) => {
  const { id, answer } = await request.json()
  if (typeof id !== "string" || typeof answer !== "string") return json({ error: "answer" }, 400)
  return (await answerGrill(me, id, answer.slice(0, 300))) ? json({ ok: true }) : json({ error: "not found" }, 404)
})
