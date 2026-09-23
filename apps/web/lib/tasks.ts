import { sql } from "./db"
import { generateJson, STYLE } from "./ai"
import { webUrl } from "./cards"

const GEMINI_KEY = process.env.GEMINI_API_KEY
const GEMINI = process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta"
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash"

export type Finding = { title: string; url: string; why: string }

/**
 * "Find more like this on the web": Gemini with Google Search grounding. Saving is a heavy action,
 * so this only proposes; the person saves each finding with one press.
 * Needs GEMINI_API_KEY; local mode without it has no web.
 */
export async function findOnWeb(me: string, topic: string, lang: string): Promise<Finding[]> {
  if (!GEMINI_KEY) return []
  const context = await sql<{ title: string | null }[]>`
    SELECT title FROM cards WHERE user_id = ${me} AND deleted_at IS NULL
      AND (title ILIKE ${"%" + topic + "%"} OR ${topic} = ANY(tags)) LIMIT 8`
  const res = await fetch(`${GEMINI}/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": GEMINI_KEY },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `Find 3-5 web pages worth saving about: ${topic}.
The person already saved: ${context.map((row) => row.title).filter(Boolean).join(" | ") || "nothing on this yet"}. Suggest new ones, not those.
For each, one line in ${lang} on why it fits. ${STYLE}`,
            },
          ],
        },
      ],
      tools: [{ google_search: {} }],
    }),
  }).catch(() => null)
  if (!res?.ok) return []
  const data = await res.json()
  const text: string = data?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? ""
  const chunks: { web?: { uri?: string; title?: string } }[] = data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []
  // Only links the search actually returned, never a URL the model wrote itself.
  return chunks
    .flatMap((chunk) => (chunk.web?.uri && webUrl(chunk.web.uri) ? [{ title: chunk.web.title ?? chunk.web.uri, url: chunk.web.uri, why: "" }] : []))
    .slice(0, 5)
    .map((finding, index) => ({ ...finding, why: text.split("\n").filter(Boolean)[index] ?? "" }))
}

export type Lint = {
  duplicates: { keep: string; drop: string; similarity: number }[]
  orphans: string[]
}

/** Cleanup proposals: near-identical cards (the 0.98 conservative bar) and old cards tied to nothing. */
export async function lint(me: string): Promise<Lint> {
  const duplicates = await sql<{ keep: string; drop: string; similarity: number }[]>`
    SELECT a.id AS keep, b.id AS drop, 1 - (a.embedding <=> b.embedding) AS similarity
    FROM cards a JOIN cards b ON b.user_id = a.user_id AND b.id <> a.id AND b.created_at > a.created_at
    WHERE a.user_id = ${me} AND a.deleted_at IS NULL AND b.deleted_at IS NULL
      AND a.embedding IS NOT NULL AND b.embedding IS NOT NULL
      AND (a.url IS NOT NULL AND a.url = b.url OR 1 - (a.embedding <=> b.embedding) > 0.98)
    LIMIT 20`
  const orphans = await sql<{ id: string }[]>`
    SELECT c.id FROM cards c
    WHERE c.user_id = ${me} AND c.deleted_at IS NULL AND c.created_at < now() - interval '30 days'
      AND c.pinned_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM card_clusters cc WHERE cc.card_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM card_links l WHERE c.id IN (l.from_id, l.to_id))
      AND NOT EXISTS (SELECT 1 FROM card_spaces cs WHERE cs.card_id = c.id)
    LIMIT 20`
  return { duplicates: [...duplicates], orphans: orphans.map((row) => row.id) }
}

export type Brief = { due: string[]; revisit: string[]; clusters: string[]; line: string }

/** The morning brief: what is due, what is worth another look, which clusters are new. */
export async function morningBrief(me: string, lang: string): Promise<Brief> {
  const due = await sql<{ id: string; title: string | null }[]>`
    SELECT id, coalesce(title, left(note, 60)) AS title FROM cards
    WHERE user_id = ${me} AND deleted_at IS NULL AND resurface_at BETWEEN now() - interval '1 day' AND now() + interval '1 day'
    LIMIT 5`
  const revisit = await sql<{ id: string; title: string | null }[]>`
    SELECT id, coalesce(title, left(note, 60)) AS title FROM cards
    WHERE user_id = ${me} AND deleted_at IS NULL AND created_at < now() - interval '14 days'
      AND (seen_at IS NULL OR seen_at < now() - interval '30 days')
    ORDER BY random() LIMIT 3`
  const clusters = await sql<{ name: string | null }[]>`
    SELECT name FROM clusters WHERE user_id = ${me} AND created_at > now() - interval '1 day' AND space_id IS NULL LIMIT 3`
  const said = await generateJson<{ line: string }>(
    `Write one calm sentence in ${lang} for a morning note from a personal memory app.
Due today: ${due.map((row) => row.title).join(" | ") || "nothing"}. Worth another look: ${revisit.map((row) => row.title).join(" | ") || "nothing"}.
New groups: ${clusters.map((row) => row.name).join(", ") || "none"}. No exclamation marks, no greeting cliché. ${STYLE}
Reply as JSON: {"line": "..."}`,
  )
  const brief = {
    due: due.map((row) => row.id),
    revisit: revisit.map((row) => row.id),
    clusters: clusters.map((row) => row.name ?? "").filter(Boolean),
    line: said?.line ?? "",
  }
  await sql`INSERT INTO agent_log (user_id, action, summary, undo) VALUES (${me}, 'brief', ${brief.line}, ${sql.json(brief)})`
  return brief
}
