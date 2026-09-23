import { addToSpace, createCard, createSpace, linkCards, spend } from "@/lib/cards"
import type { Card } from "@/lib/types"
import { queueCards } from "@/lib/jobs"
import { json } from "@/lib/http"
import { fromCsv, fromHtml, type Incoming } from "@/lib/import"
import { withUser } from "@/lib/user"

type Export = {
  cards?: Incoming[]
  spaces?: { id: string; name: string; query: string | null }[]
  members?: { card_id: string; space_id: string }[]
  links?: { from_id: string; to_id: string }[]
}

/** A zen export (cards, spaces, members, links), a JSON array of {url,title,note}, bookmark HTML, or CSV. */
export const POST = withUser(async (me, request: Request) => {
  const text = await request.text()
  const start = text.trimStart()[0]
  let data: Export
  if (start === "{" || start === "[") {
    const parsed = JSON.parse(text)
    data = Array.isArray(parsed) ? { cards: parsed } : parsed
  } else {
    data = { cards: /<a\s/i.test(text) ? fromHtml(text) : fromCsv(text) }
  }

  const items = (data.cards ?? []).slice(0, 2000)
  if (!(await spend(me, items.length))) return json({ error: "daily limit" }, 429)

  const ids = new Map<string, string>()
  const created: Card[] = []
  for (const item of items) {
    // Files are not in an export, and a path or file name from outside must never point at
    // this server's disk or at someone else's upload: drop them.
    const { file: _file, poster: _poster, ...meta } = (item.meta ?? {}) as Record<string, unknown>
    const card = await createCard(me, {
      url: item.url ?? null,
      title: item.title ?? null,
      note: item.note ?? null,
      content: item.content ?? null,
      kind: item.kind ?? (item.url ? "link" : "note"),
      meta,
      colors: item.colors ?? [],
      tags: item.tags ?? [],
    })
    if (item.id) ids.set(item.id, card.id)
    created.push(card)
  }
  for (const space of data.spaces ?? []) ids.set(space.id, (await createSpace(me, space.name, space.query)).id)
  for (const { card_id, space_id } of data.members ?? []) {
    if (ids.has(card_id) && ids.has(space_id)) await addToSpace(me, ids.get(card_id)!, ids.get(space_id)!)
  }
  for (const { from_id, to_id } of data.links ?? []) {
    if (ids.has(from_id) && ids.has(to_id)) await linkCards(me, ids.get(from_id)!, ids.get(to_id)!)
  }

  await queueCards(created.map((card) => card.id), me)
  return json({ imported: created.length }, 201)
})
