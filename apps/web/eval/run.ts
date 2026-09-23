// The evaluation harness (Anthropic KG playbook, section VIII): load the gold cards into a throwaway
// mind, extract, ask the gold questions, score, then delete the mind.
//   bun eval/run.ts            → prints F1 / recall / citation accuracy; exits 1 below the bar
// Change a prompt, rerun, watch the numbers move.
import { randomUUID } from "node:crypto"
import gold from "./gold.json"
import { sql } from "../lib/db"
import { createCard } from "../lib/cards"
import { enrichCard } from "../lib/enrich"
import { extractCard } from "../lib/graph"
import { ask } from "../lib/agent"

const fold = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/\s+/g, " ").trim()
const same = (a: string, b: string) => fold(a) === fold(b) || fold(a).includes(fold(b)) || fold(b).includes(fold(a))

const me = randomUUID()
const idOf = new Map<string, string>()
let tp = 0
let fp = 0
let fn = 0
let relHit = 0
let relAll = 0

try {
  for (const item of gold.cards) {
    const card = await createCard(me, { note: item.note })
    idOf.set(item.key, card.id)
    await enrichCard(card.id)
    await extractCard(card.id)
    const found = (
      await sql<{ name: string; aliases: string[] }[]>`
        SELECT e.name, array_agg(a.alias) AS aliases FROM card_entities ce
        JOIN entities e ON e.id = ce.entity_id LEFT JOIN aliases a ON a.entity_id = e.id
        WHERE ce.card_id = ${card.id} GROUP BY e.id`
    ).map((row) => [row.name, ...row.aliases])
    const hit = item.entities.filter((want) => found.some((names) => names.some((name) => same(name, want))))
    tp += hit.length
    fn += item.entities.length - hit.length
    fp += found.filter((names) => !item.entities.some((want) => names.some((name) => same(name, want)))).length

    const edges = await sql<{ source: string; target: string }[]>`
      SELECT s.name AS source, t.name AS target FROM relations r
      JOIN entities s ON s.id = r.source_id JOIN entities t ON t.id = r.target_id WHERE r.card_id = ${card.id}`
    for (const [source, target] of item.relations as [string, string][]) {
      relAll++
      // Scored on (source, target) regardless of direction and predicate wording, as the playbook does.
      if (edges.some((edge) => (same(edge.source, source) && same(edge.target, target)) || (same(edge.source, target) && same(edge.target, source)))) relHit++
    }
    process.stdout.write(".")
  }

  let cited = 0
  for (const question of gold.questions) {
    const reply = await ask(me, question.q, "the language of the question")
    const want = question.cards.map((key) => idOf.get(key))
    const got = reply.kind === "answer" ? reply.cards : []
    if (want.some((id) => id && got.includes(id))) cited++
    console.log(`\n${reply.kind === "answer" && want.some((id) => id && got.includes(id)) ? "✓" : "✗"} ${question.q}\n  ${reply.kind === "answer" ? reply.text : reply.kind}`)
  }

  const precision = tp / (tp + fp || 1)
  const recall = tp / (tp + fn || 1)
  const f1 = (2 * precision * recall) / (precision + recall || 1)
  const report = {
    entity_precision: +precision.toFixed(2),
    entity_recall: +recall.toFixed(2),
    entity_f1: +f1.toFixed(2),
    relation_recall: +(relHit / (relAll || 1)).toFixed(2),
    citation_accuracy: +(cited / gold.questions.length).toFixed(2),
  }
  console.log("\n", report)
  // ponytail: bars set from the first Gemini run; raise them as prompts improve.
  process.exitCode = report.entity_f1 >= 0.5 && report.citation_accuracy >= 0.7 ? 0 : 1
} finally {
  await sql`DELETE FROM cards WHERE user_id = ${me}`
  await sql`DELETE FROM entities WHERE user_id = ${me}`
  await sql`DELETE FROM agent_log WHERE user_id = ${me}`
  await sql`DELETE FROM agent_questions WHERE user_id = ${me}`
  await sql.end()
}
