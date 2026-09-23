import { after } from "next/server"
import {
  deleteCard,
  getCard,
  linkCards,
  linkedCards,
  markSeen,
  relatedCards,
  setPinned,
  unlinkCards,
  unlock,
  updateCard,
} from "@/lib/cards"
import { enrichCard } from "@/lib/enrich"
import { json } from "@/lib/http"
import { withUser } from "@/lib/user"

export { OPTIONS } from "@/lib/http"

type Params = { params: Promise<{ id: string }> }

export const GET = withUser(async (me, _: Request, { params }: Params) => {
  const { id } = await params
  const card = await getCard(me, id)
  if (!card) return json({ error: "not found" }, 404)
  const [related, links] = await Promise.all([relatedCards(me, id), linkedCards(me, id)])
  return json({ card, related, links })
})

export const PATCH = withUser(async (me, request: Request, { params }: Params) => {
  const { id } = await params
  const body = await request.json()
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
  const card = await updateCard(me, id, body)
  if (card && body.note !== undefined) after(() => enrichCard(id))
  return card ? json({ card }) : json({ error: "not found" }, 404)
})

export const DELETE = withUser(async (me, _: Request, { params }: Params) => {
  const { id } = await params
  await deleteCard(me, id)
  return json({ ok: true })
})
