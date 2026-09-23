"use client"

import { useT } from "@/components/locale"

export function SpacesHeading() {
  const t = useT()
  return <h1 className="font-display px-6 py-14 text-3xl tracking-wide sm:px-12">{t("spaces", "title")}</h1>
}

export function SpacesEmpty() {
  const t = useT()
  return (
    <p className="text-muted-foreground font-display mt-10 px-6 text-[15px] leading-relaxed sm:px-12">
      {t("spaces", "none")}
    </p>
  )
}

export function SpaceMeta({ query, count }: { query: string | null; count: number }) {
  const t = useT()
  return (
    <p className="text-muted-foreground mt-2 text-[10px] tracking-[0.2em] lowercase">
      {query ? `${t("spaces", "gathers")}: ${query}` : `${count} ${t("spaces", "cards")}`}
    </p>
  )
}
