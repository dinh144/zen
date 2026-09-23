"use client"

import * as React from "react"
import { LOCALES, STRINGS, translate, type Locale } from "@/lib/i18n"

type Section = keyof typeof STRINGS

const Context = React.createContext<{ locale: Locale; setLocale: (next: Locale) => void } | null>(null)
export const KEY = "zen_locale"

// The server renders in the cookie's language (or the browser's), so the first paint is already right.
export function LocaleProvider({ initial, children }: { initial: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(initial)

  React.useEffect(() => {
    // Carry over a choice saved before the cookie existed.
    if (document.cookie.includes(`${KEY}=`)) return
    try {
      const saved = localStorage.getItem(KEY)
      if (LOCALES.includes(saved as Locale) && saved !== initial) setLocaleState(saved as Locale)
      const pick = saved && LOCALES.includes(saved as Locale) ? saved : initial
      document.cookie = `${KEY}=${pick}; path=/; max-age=31536000; samesite=lax`
      // First visit: the server's generated text follows the same language from here on.
      void fetch("/api/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: pick }),
      }).catch(() => {})
    } catch {
      /* private window: keep the server's pick */
    }
  }, [initial])

  React.useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next)
    document.cookie = `${KEY}=${next}; path=/; max-age=31536000; samesite=lax`
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* ignore */
    }
    // The server writes titles, summaries and cluster names in this language too; signed out, it just fails.
    void fetch("/api/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: next }),
    }).catch(() => {})
  }, [])

  return <Context value={{ locale, setLocale }}>{children}</Context>
}

export function useLocale() {
  const context = React.useContext(Context)
  if (!context) throw new Error("useLocale outside LocaleProvider")
  return context
}

/** t("board", "search") — the string in whichever language is on. */
export function useT() {
  const { locale } = useLocale()
  // Key hints are written for a Mac; everywhere else the same shortcut is Ctrl.
  const [mac, setMac] = React.useState(true)
  React.useEffect(() => setMac(/Mac|iPhone|iPad/.test(navigator.userAgent)), [])
  return React.useCallback(
    <S extends Section>(section: S, key: keyof (typeof STRINGS)[S]) => {
      const text = translate(locale, section, key)
      return mac ? text : text.replace(/⌘/g, "ctrl ")
    },
    [locale, mac],
  )
}
