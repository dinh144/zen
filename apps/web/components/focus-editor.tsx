"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Droplet } from "@/components/droplet"
import { useDrop } from "@/components/drop-state"
import { useT } from "@/components/locale"

/** Focus Mode: one note, nothing else on screen. ⌘+Enter saves, Esc leaves. */
export function FocusEditor() {
  const router = useRouter()
  const [text, setText] = React.useState("")
  const [saved, setSaved] = React.useState(false)
  const { ink, feel, rest, mood } = useDrop()
  const t = useT()

  React.useEffect(() => rest("attentive"), [rest])

  const save = React.useCallback(async () => {
    if (!text.trim()) return router.push("/")
    const [first, ...rest] = text.split("\n")
    await fetch("/api/cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: rest.length ? first : null, note: rest.length ? rest.join("\n").trim() : text }),
    })
    setSaved(true)
    feel("excited", 1800)
    router.push("/")
  }, [router, text, feel])

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void save()
      if (event.key === "Escape") router.push("/")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router, save])

  return (
    <div data-page className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-16">
      <textarea
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={t("focus", "placeholder")}
        data-sole
        className="font-display placeholder:text-muted-foreground/60 min-h-[60vh] w-full flex-1 resize-none bg-transparent text-[22px] leading-[2.1] outline-none"
      />
      <p className="text-muted-foreground flex items-center gap-3 text-[12px] tracking-[0.22em] lowercase">
        <Droplet expression={mood} ink={ink} className="h-5 w-[15px]" motion="idle" />
        {saved ? t("focus", "saved") : t("focus", "hint")}
      </p>
    </div>
  )
}
