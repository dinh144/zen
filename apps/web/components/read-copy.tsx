"use client"

import Link from "next/link"
import { useT } from "@/components/locale"

export function ReadBack() {
  const t = useT()
  return (
    <Link href="/" className="text-muted-foreground hover:text-foreground text-[10px] tracking-[0.22em] lowercase">
      {t("read", "back")}
    </Link>
  )
}

export function ReadMissing() {
  const t = useT()
  return <p className="text-muted-foreground font-display text-[15px]">{t("read", "none")}</p>
}
