"use client"

import { useT } from "@/components/locale"

export function MarksHeading() {
  const t = useT()
  return <h1 className="font-display px-6 py-14 text-3xl tracking-wide sm:px-12">{t("marks", "title")}</h1>
}
