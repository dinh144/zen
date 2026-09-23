import { after } from "next/server"
import { createCard, listCards, searchCards, spend, stats, unlock } from "@/lib/cards"
import { queueCard } from "@/lib/jobs"
import { json } from "@/lib/http"
import { withUser } from "@/lib/user"

export { OPTIONS } from "@/lib/http"

export const GET = withUser(async (me, request: Request) => {
  const params = new URL(request.url).searchParams
  const query = params.get("q")?.trim()
  const cards = query
    ? await searchCards(me, query)
    : await listCards(me, Number(params.get("limit") ?? 60), params.get("after") ?? undefined)
  return json({ cards })
})

export const POST = withUser(async (me, request: Request) => {
  if (!(await spend(me))) return json({ error: "daily limit" }, 429)
  const body = await request.json()
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
