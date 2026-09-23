import { sameVibe } from "@/lib/cards"
import { json } from "@/lib/http"
import { withUser } from "@/lib/user"

/** Same Vibe: a moodboard built from one image. */
export const GET = withUser(async (me, _: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return json({ cards: await sameVibe(me, id) })
})
