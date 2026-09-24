import { createSpace, listSpaces, unlock } from "@/lib/cards"
import { json, parse } from "@/lib/http"
import { withUser } from "@/lib/user"
import { SpaceInput } from "@/lib/schemas"

export { OPTIONS } from "@/lib/http"

export const GET = withUser(async (me) => {
  return json({ spaces: await listSpaces(me) })
})

export const POST = withUser(async (me, request: Request) => {
  const body = parse(SpaceInput, await request.json())
  if (!body) return json({ error: "name required" }, 400)
  const space = await createSpace(me, body.name, body.query?.trim() || null, body.parent ?? null)
  await unlock(me, body.query?.trim() ? "smart-space" : "first-space")
  return json({ space }, 201)
})
