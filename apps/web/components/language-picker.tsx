"use client"

import { useLocale, useT } from "@/components/locale"
import { LOCALES, type Locale } from "@/lib/i18n"

const LABEL: Record<Locale, string> = { vi: "tiếng việt", en: "english" }

export function LanguagePicker() {
  const { locale, setLocale } = useLocale()
  const t = useT()

  return (
    <section>
      <h2 className="text-muted-foreground mb-4 text-[10px] tracking-[0.25em] lowercase">{t("settings", "language")}</h2>
      <div className="flex gap-6">
        {LOCALES.map((code) => (
          <button
            key={code}
            onClick={() => setLocale(code)}
            className={`text-[11px] tracking-[0.2em] lowercase transition-colors ${
              locale === code ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {LABEL[code]}
          </button>
        ))}
      </div>
    </section>
  )
}
