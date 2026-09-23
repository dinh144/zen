import { createSpace, listSpaces, unlock } from "@/lib/cards"
import { json } from "@/lib/http"
import { withUser } from "@/lib/user"

export { OPTIONS } from "@/lib/http"

export const GET = withUser(async (me) => {
  return json({ spaces: await listSpaces(me) })
})

export const POST = withUser(async (me, request: Request) => {
  const { name, query, parent } = await request.json()
  if (!name?.trim()) return json({ error: "name required" }, 400)
  const space = await createSpace(me, name.trim(), query?.trim() || null, /^[0-9a-f-]{36}$/i.test(parent ?? "") ? parent : null)
  await unlock(me, query?.trim() ? "smart-space" : "first-space")
  return json({ space }, 201)
})
