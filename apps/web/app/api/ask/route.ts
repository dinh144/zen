import { ask, grill } from "@/lib/agent"
import { recluster } from "@/lib/clusters"
import { json, parse } from "@/lib/http"
import { languageOf } from "@/lib/settings"
import { withUser } from "@/lib/user"
import { findOnWeb, lint } from "@/lib/tasks"
import { runTask } from "@/lib/agent-tools"
import { AskInput } from "@/lib/schemas"

/** Ask the drop. Tasks it can do on its own right away run here; the rest come back for the UI. */
export const POST = withUser(async (me, request: Request) => {
  const body = parse(AskInput, await request.json())
  if (!body) return json({ error: "question" }, 400)
  const lang = await languageOf(me)
  const reply = await ask(me, body.question.slice(0, 500), lang)
  if (reply.kind === "task" && reply.task === "organize") {
    // Grouping is a light action: done now, logged, undone by the next recluster.
    return json({ ...reply, done: await recluster(me) })
  }
  // Anything else asked of the drop runs the tool loop; its text field carries the learned rules.
  if (reply.kind === "task" && reply.task === "other") {
    const result = await runTask(me, reply.topic, lang, reply.text)
    return json(result ? { kind: "answer", text: result.answer, cards: result.cards, edges: [], findings: result.findings, done: result.done } : { kind: "none", text: "" })
  }
  // Web finds and cleanup are proposals: nothing is saved or removed until the person presses.
  if (reply.kind === "task" && reply.task === "web") return json({ ...reply, findings: await findOnWeb(me, reply.topic, lang) })
  if (reply.kind === "task" && reply.task === "lint") return json({ ...reply, lint: await lint(me) })
  if (reply.kind === "task" && reply.task === "grill_me") {
    return json(await grill(me, reply.topic, "what they want from this topic", lang))
  }
  return json(reply)
})
