import {
  deleteCard,
  getCard,
  linkByTitles,
  linkCards,
  linkedCards,
  markSeen,
  relatedCards,
  restoreCard,
  resurfaceOf,
  setResurface,
  setPinned,
  unlinkCards,
  unlock,
  updateCard,
} from "@/lib/cards"
import { queueCard } from "@/lib/jobs"
import { wikiTitles } from "@/lib/wiki"
import { json, parse } from "@/lib/http"
import { withUser } from "@/lib/user"
import { CardPatch } from "@/lib/schemas"

export { OPTIONS } from "@/lib/http"

type Params = { params: Promise<{ id: string }> }

export const GET = withUser(async (me, _: Request, { params }: Params) => {
  const { id } = await params
  const card = await getCard(me, id)
  if (!card) return json({ error: "not found" }, 404)
  const [related, links, resurface] = await Promise.all([relatedCards(me, id), linkedCards(me, id), resurfaceOf(me, id)])
  return json({ card, related, links, resurface })
})

export const PATCH = withUser(async (me, request: Request, { params }: Params) => {
  const { id } = await params
  const body = parse(CardPatch, await request.json())
  if (!body) return json({ error: "invalid card patch" }, 400)
  if (body.pinned !== undefined) {
    await setPinned(me, id, body.pinned)
    if (body.pinned) await unlock(me, "first-pin")
  }
  if (body.seen) await markSeen(me, id)
  if (body.link) {
    await linkCards(me, id, body.link)
    await unlock(me, "first-link")
  }
  if (body.unlink) await unlinkCards(me, id, body.unlink)
  if (body.restore) await restoreCard(me, id)
  if (body.resurface !== undefined) {
    await setResurface(me, id, body.resurface ? new Date(body.resurface) : null)
  }
  const card = await updateCard(me, id, body)
  if (card && body.note !== undefined) {
    await linkByTitles(me, id, wikiTitles(card.note))
    await queueCard(id, me)
  }
  return card ? json({ card }) : json({ error: "not found" }, 404)
})

export const DELETE = withUser(async (me, _: Request, { params }: Params) => {
  const { id } = await params
  await deleteCard(me, id)
  return json({ ok: true })
})
