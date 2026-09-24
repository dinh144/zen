import { after } from "next/server"
import { createCard, listCards, searchCards, spend, stats, unlock } from "@/lib/cards"
import { queueCard } from "@/lib/jobs"
import { json, parse } from "@/lib/http"
import { withUser } from "@/lib/user"
import { CardInput, CardsQuery } from "@/lib/schemas"

export { OPTIONS } from "@/lib/http"

export const GET = withUser(async (me, request: Request) => {
  // Every field falls back on a bad value (.catch in the schema), so this never rejects a read.
  const query = CardsQuery.parse(Object.fromEntries(new URL(request.url).searchParams))
  const cards = query.q
    ? await searchCards(me, query.q)
    : await listCards(me, query.limit ?? 60, query.after)
  return json({ cards })
})

export const POST = withUser(async (me, request: Request) => {
  if (!(await spend(me))) return json({ error: "daily limit" }, 429)
  const body = parse(CardInput, await request.json())
  if (!body) return json({ error: "invalid card" }, 400)
  const card = await createCard(me, {
    url: body.url ?? null,
    note: body.note ?? null,
    title: body.title ?? null,
    kind: body.kind ?? (body.quote ? "quote" : body.url ? "link" : "note"),
    content: body.quote ?? body.content ?? null,
    meta: body.quote ? { quote: body.quote, source: body.url } : {},
  })

  // Capture returns immediately; tagging, OCR and embedding run after the response.
  await queueCard(card.id, me)
  after(async () => {
    const { total } = await stats(me)
    if (total >= 1) await unlock(me, "first-card")
    if (total >= 10) await unlock(me, "ten-cards")
    if (total >= 100) await unlock(me, "hundred-cards")
  })

  return json({ card }, 201)
})
