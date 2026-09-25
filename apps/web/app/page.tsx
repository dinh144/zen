import { currentUser } from "@/lib/user"
import { listSpaces, pinnedCards, seedIfEmpty } from "@/lib/cards"
import { apiForMe } from "@/lib/api/server"
import { Board } from "@/components/board"
import { Landing } from "@/components/landing"

export const dynamic = "force-dynamic"

export default async function EverythingPage() {
  // Signed out, the front door; signed in, the board.
  const me = await currentUser()
  if (!me) return <Landing />
  await seedIfEmpty(me)
  const api = await apiForMe()
  if (!api) throw new Error("signed in but no token to reach the API with")
  const [cardsResult, spaces, pinned] = await Promise.all([api.GET("/cards", {}), listSpaces(me), pinnedCards(me)])
  if (cardsResult.error) throw new Error("the API turned the board list down")
  return <Board initialCards={cardsResult.data.cards} spaces={spaces} pinned={pinned} />
}
