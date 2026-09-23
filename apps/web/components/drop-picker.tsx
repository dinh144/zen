"use client"

import * as React from "react"
import { useT } from "@/components/locale"
import { Droplet } from "@/components/droplet"
import { useDrop } from "@/components/drop-state"
import { EXPRESSIONS, INKS, type Expression, type Ink } from "@/lib/drop"

/** Settings: choose the ink your drop is made of, and meet all sixteen moods. */
export function DropPicker() {
  const { ink, setInk, feel } = useDrop()
  const t = useT()
  const [preview, setPreview] = React.useState<Expression>("neutral")

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end gap-8">
        <Droplet expression={preview} ink={ink} className="h-20 w-[60px]" motion="idle" />
        <p className="text-muted-foreground text-[12px] tracking-[0.25em] lowercase">
          {t("inks", ink)} · {t("moods", preview)}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {(Object.keys(INKS) as Ink[]).map((name) => (
          <button
            key={name}
            onClick={() => {
              setInk(name)
              feel("excited", 1600)
            }}
            aria-label={t("inks", name)}
            aria-pressed={ink === name}
            className={`size-7 rounded-full transition-transform duration-300 hover:scale-110 ${
              ink === name ? "ring-foreground ring-1 ring-offset-2 ring-offset-[var(--card)]" : ""
            }`}
            style={{ background: INKS[name] }}
          />
        ))}
      </div>

      <div className="grid grid-cols-4 gap-x-4 gap-y-5 sm:grid-cols-8">
        {EXPRESSIONS.map((expression) => (
          <button
            key={expression}
            onMouseEnter={() => setPreview(expression)}
            onFocus={() => setPreview(expression)}
            onClick={() => {
              setPreview(expression)
              feel(expression, 2600)
            }}
            className="flex flex-col items-center gap-2"
          >
            <Droplet expression={expression} ink={ink} className="h-9 w-[27px]" motion="still" />
            <span
              className={`text-[11px] tracking-[0.14em] lowercase ${
                preview === expression ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {t("moods", expression)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
