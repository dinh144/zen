"use client"

import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from "@workspace/ui/components/empty"
import { Droplet } from "@/components/droplet"
import { useT } from "@/components/locale"

export function SpacesHeading() {
  const t = useT()
  return <h1 className="font-display px-6 py-14 text-3xl tracking-wide sm:px-12">{t("spaces", "title")}</h1>
}

export function SpacesEmpty() {
  const t = useT()
  return (
    <Empty className="mt-10 items-start px-6 text-start sm:px-12">
      <EmptyHeader className="items-start text-start">
        <EmptyMedia>
          <Droplet ink="shell" expression="sleepy" className="h-8 w-6" motion="idle" />
        </EmptyMedia>
        <EmptyDescription className="font-display text-[17px] leading-relaxed">{t("spaces", "none")}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function SpaceMeta({ query, count }: { query: string | null; count: number }) {
  const t = useT()
  return (
    <p className="text-muted-foreground mt-2 text-[12px] tracking-[0.2em] lowercase">
      {query ? `${t("spaces", "gathers")}: ${query}` : `${count} ${t("spaces", "cards")}`}
    </p>
  )
}
