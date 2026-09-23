import { after } from "next/server"
import { Inngest } from "inngest"
import { enrichCard } from "./enrich"
import { recluster } from "./clusters"
import { EXTRACT_VERSION, extractCard, profileHubs } from "./graph"
import { sql } from "./db"
import { lint, morningBrief } from "./tasks"
import { languageOf } from "./settings"

// Durable background work: retries, checkpoints between steps, and a history to replay.
// Local dev runs `npx inngest-cli dev -u http://localhost:3000/api/inngest`; the cloud uses INNGEST_EVENT_KEY.
// No signing key means development: talk to the local dev server (or fall back when it is not running).
export const inngest = new Inngest({ id: "zen", isDev: !process.env.INNGEST_SIGNING_KEY })

export type Jobs = {
  "zen/card.saved": { data: { cardId: string; userId: string; batch?: boolean; force?: boolean } }
  "zen/mind.changed": { data: { userId: string } }
}

export const cardSaved = inngest.createFunction(
  {
    id: "card-saved",
    triggers: [{ event: "zen/card.saved" }],
    retries: 3,
    // A local model answers one prompt at a time; a burst of saves would time out waiting in its queue.
    concurrency: { limit: process.env.GEMINI_API_KEY ? 10 : 1 },
    // A card someone just saved goes ahead of a bulk import still working through the queue.
    priority: { run: "event.data.batch == true ? -600 : 600" },
  },
  async ({ event, step }) => {
    const { cardId, force } = event.data
    // A card queued twice (a re-import, a double save) is read once: skip what is already current.
    const [card] = await step.run("look", () =>
      sql<{ fresh: boolean; read: boolean }[]>`
        SELECT deleted_at IS NULL AND enriched_at IS NOT NULL AND enriched_at >= updated_at AND embedding IS NOT NULL AS fresh,
               extracted_at IS NOT NULL AND extracted_at >= updated_at AND extract_version = ${EXTRACT_VERSION} AS read
        FROM cards WHERE id = ${cardId} AND deleted_at IS NULL`,
    )
    if (!card) return
    if (force || !card.fresh) await step.run("enrich", () => enrichCard(cardId))
    if (force || !card.fresh || !card.read) await step.run("extract", () => extractCard(cardId))
    await step.sendEvent("mind-changed", { name: "zen/mind.changed", data: { userId: event.data.userId } })
  },
)

// Many saves in a row rebuild the map once, a minute after the last one.
export const mindChanged = inngest.createFunction(
  {
    id: "recluster",
    triggers: [{ event: "zen/mind.changed" }],
    debounce: { key: "event.data.userId", period: "60s" },
  },
  async ({ event, step }) => {
    await step.run("recluster", () => recluster(event.data.userId))
  },
)

const minds = async () =>
  (await sql<{ user_id: string }[]>`SELECT DISTINCT user_id FROM cards WHERE deleted_at IS NULL`).map((row) => row.user_id)

// 07:00 in Vietnam: the day's note from the drop.
export const brief = inngest.createFunction(
  { id: "morning-brief", triggers: [{ cron: "TZ=Asia/Ho_Chi_Minh 0 7 * * *" }] },
  async ({ step }) => {
    for (const me of await step.run("minds", minds)) {
      await step.run(`brief-${me}`, async () => morningBrief(me, await languageOf(me)))
    }
  },
)

// Sunday night: profiles for hub entities, and the cleanup proposals the weekly grill walks through.
export const weekly = inngest.createFunction(
  { id: "weekly-tidy", triggers: [{ cron: "TZ=Asia/Ho_Chi_Minh 0 21 * * 0" }] },
  async ({ step }) => {
    for (const me of await step.run("minds", minds)) {
      await step.run(`profiles-${me}`, async () => profileHubs(me, await languageOf(me)))
      await step.run(`lint-${me}`, async () => {
        const found = await lint(me)
        await sql`INSERT INTO agent_log (user_id, action, summary, undo)
          VALUES (${me}, 'lint', ${`${found.duplicates.length} · ${found.orphans.length}`}, ${sql.json(found)})`
      })
    }
  },
)

export const functions = [cardSaved, mindChanged, brief, weekly]

/**
 * Queues a saved card. Without a reachable Inngest (no dev server, no event key) the work still
 * happens, in-process after the response, the way zen ran before the queue.
 */
export const queueCard = (cardId: string, userId: string) => queueCards([cardId], userId)

/** A batch (import, re-enrich): one send, and without Inngest one recluster at the end, not one per card. */
export async function queueCards(cardIds: string[], userId: string, force = false) {
  if (!cardIds.length) return
  try {
    const batch = cardIds.length > 1
    await inngest.send(cardIds.map((cardId) => ({ name: "zen/card.saved", data: { cardId, userId, batch, force } })))
  } catch {
    after(async () => {
      for (const cardId of cardIds) {
        await enrichCard(cardId)
        await extractCard(cardId)
      }
      await recluster(userId)
    })
  }
}
