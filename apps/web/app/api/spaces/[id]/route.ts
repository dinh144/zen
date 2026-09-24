import { addToSpace, deleteSpace, removeFromSpace, setSpaceShared, spaceCards } from "@/lib/cards"
import { json, parse } from "@/lib/http"
import { withUser } from "@/lib/user"
import { SpacePatch } from "@/lib/schemas"

export { OPTIONS } from "@/lib/http"

type Params = { params: Promise<{ id: string }> }

export const GET = withUser(async (me, _: Request, { params }: Params) => {
  const { id } = await params
  return json({ cards: await spaceCards(me, id) })
})

export const PATCH = withUser(async (me, request: Request, { params }: Params) => {
  const { id } = await params
  const body = parse(SpacePatch, await request.json())
  if (!body) return json({ error: "invalid" }, 400)
  if (body.add) await addToSpace(me, body.add, id)
  if (body.remove) await removeFromSpace(me, body.remove, id)
  if (body.shared !== undefined) return json({ space: await setSpaceShared(me, id, body.shared) })
  return json({ ok: true })
})

export const DELETE = withUser(async (me, _: Request, { params }: Params) => {
  const { id } = await params
  await deleteSpace(me, id)
  return json({ ok: true })
})
