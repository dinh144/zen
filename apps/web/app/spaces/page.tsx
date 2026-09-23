import Link from "next/link"
import { redirect } from "next/navigation"
import { currentUser } from "@/lib/user"
import { listSpaces } from "@/lib/cards"
import { TopNav } from "@/components/top-nav"
import { Reveal } from "@/components/reveal"
import { SpaceControls } from "@/components/space-controls"
import { SpacesHeading, SpacesEmpty, SpaceMeta } from "@/components/space-copy"
import { SpaceChildren } from "@/components/space-tree"

export const dynamic = "force-dynamic"

export default async function SpacesPage() {
  const me = await currentUser()
  if (!me) redirect("/login")
  const spaces = await listSpaces(me, true)
  return (
    <div data-page className="min-h-screen pb-24">
      <TopNav />
      <SpacesHeading />
      <div className="px-6 sm:px-12">
      <SpaceControls />
      </div>
      <ul className="mt-12 grid gap-8 px-6 sm:grid-cols-2 sm:px-12 lg:grid-cols-3">
        {spaces.filter((space) => !space.parent_id).map((space, index) => (
          <Reveal key={space.id} index={index} as="li" className="sheet px-6 py-7">
            <Link href={`/spaces/${space.id}`} transitionTypes={["ink"]} className="font-display text-[19px] tracking-wide">
              {space.name}
            </Link>
            <SpaceMeta query={space.query} count={space.card_count ?? 0} />
            <SpaceChildren spaces={spaces} parent={space.id} />
            <SpaceControls space={space} />
          </Reveal>
        ))}
      </ul>
      {spaces.length === 0 ? (
        <SpacesEmpty />
      ) : null}
    </div>
  )
}
