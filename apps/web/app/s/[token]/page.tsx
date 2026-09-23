import { spaceCards } from "@/lib/cards"
import { sql } from "@/lib/db"
import { Board } from "@/components/board"
import NotFound from "@/app/not-found"
import { STRINGS } from "@/lib/i18n"

export const dynamic = "force-dynamic"

// Public, no login: the shared-space link.
export default async function SharedSpacePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [space] = await sql<{ name: string }[]>`SELECT name FROM spaces WHERE share_token = ${token}`
  if (!space) return <NotFound message={STRINGS.share.notShared} />
  const cards = await spaceCards(null, token, true)
  return <Board initialCards={cards} spaces={[]} heading={space.name} mode="static" publicView />
}
