import { redirect } from "next/navigation"
import { currentUser } from "@/lib/user"
import { listSpaces, spaceCards } from "@/lib/cards"
import { Board } from "@/components/board"

export const dynamic = "force-dynamic"

export default async function SpacePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await currentUser()
  if (!me) redirect("/login")
  const { id } = await params
  const [cards, spaces] = await Promise.all([spaceCards(me, id), listSpaces(me)])
  const space = spaces.find((item) => item.id === id)
  return <Board initialCards={cards} spaces={spaces} heading={space?.name ?? "space"} mode="static" />
}
