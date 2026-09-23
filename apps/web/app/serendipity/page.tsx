import { redirect } from "next/navigation"
import { currentUser } from "@/lib/user"
import { listSpaces, randomCards } from "@/lib/cards"
import { Board } from "@/components/board"
import { STRINGS } from "@/lib/i18n"

export const dynamic = "force-dynamic"

// mymind's Serendipity: no search, just old things coming back.
export default async function SerendipityPage() {
  const me = await currentUser()
  if (!me) redirect("/login")
  const [cards, spaces] = await Promise.all([randomCards(me), listSpaces(me)])
  return <Board initialCards={cards} spaces={spaces} heading={STRINGS.nav.drift} mode="serendipity" />
}
