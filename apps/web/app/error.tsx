"use client"

import { useEffect } from "react"
import { Droplet } from "@/components/droplet"
import { useT } from "@/components/locale"

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useT()
  useEffect(() => console.error(error), [error])
  return (
    <div role="alert" className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <Droplet expression="scared" className="text-primary h-16 w-12" motion="still" />
      <p className="font-display text-[17px] leading-relaxed">{t("errors", "broke")}</p>
      <button onClick={retry} className="text-primary w-fit text-[10px] tracking-[0.25em] lowercase">
        {t("errors", "retry")}
      </button>
    </div>
  )
}
