"use client"

import { useLocale } from "@/components/locale"

/** A [vi, en] pair from a server component, shown in whichever language is on. */
export function Pair({ v }: { v: readonly [string, string] }) {
  const { locale } = useLocale()
  return <>{locale === "vi" ? v[0] : v[1]}</>
}
