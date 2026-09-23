import { currentUser } from "@/lib/user"
import { listCards, listSpaces, pinnedCards, seedIfEmpty } from "@/lib/cards"
import { Board } from "@/components/board"
import { Landing } from "@/components/landing"

export const dynamic = "force-dynamic"

export default async function EverythingPage() {
  // Signed out, the front door; signed in, the board.
  const me = await currentUser()
  if (!me) return <Landing />
  await seedIfEmpty(me)
  const [cards, spaces, pinned] = await Promise.all([listCards(me), listSpaces(me), pinnedCards(me)])
  return <Board initialCards={cards} spaces={spaces} pinned={pinned} />
}
