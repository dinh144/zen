"use client"

import { useLocale } from "@/components/locale"
import { LOCALES } from "@/lib/i18n"

/** A [vi, en, ko, zh, ja] tuple from a server component, shown in whichever language is on. */
export function Pair({ v }: { v: readonly [string, string, string, string, string] }) {
  const { locale } = useLocale()
  return <>{v[LOCALES.indexOf(locale)]}</>
}
