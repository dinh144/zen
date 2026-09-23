"use client"

import { useT } from "@/components/locale"
import { STRINGS } from "@/lib/i18n"

export function SettingsCopy({ kind }: { kind: keyof typeof STRINGS.settings }) {
  const t = useT()
  if (kind === "title") return <h1 className="font-display py-14 text-3xl tracking-wide">{t("settings", kind)}</h1>
  return <>{t("settings", kind)}</>
}
