import { redirect } from "next/navigation"
import { currentUser } from "@/lib/user"
import { getCard, listSpaces, sameVibe } from "@/lib/cards"
import { Board } from "@/components/board"

export const dynamic = "force-dynamic"

// Same Vibe: a moodboard grown from one card.
export default async function VibePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentUser()
  if (!me) redirect("/login")
  const { id } = await params
  const [card, cards, spaces] = await Promise.all([getCard(me, id), sameVibe(me, id), listSpaces(me)])
  return <Board initialCards={cards} spaces={spaces} heading={[`cùng khí với ${card?.title ?? "thẻ này"}`, `same air as ${card?.title ?? "this"}`]} mode="static" />
}
