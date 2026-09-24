import { answerGrill } from "@/lib/agent"
import { json, parse } from "@/lib/http"
import { withUser } from "@/lib/user"
import { AskAnswerInput } from "@/lib/schemas"

/** One answered grill question: stored, and kept as a rule so it is never asked again. */
export const POST = withUser(async (me, request: Request) => {
  const body = parse(AskAnswerInput, await request.json())
  if (!body) return json({ error: "answer" }, 400)
  return (await answerGrill(me, body.id, body.answer.slice(0, 300))) ? json({ ok: true }) : json({ error: "not found" }, 404)
})
