"use client"

import * as React from "react"
import { STRINGS, translate, type Locale } from "@/lib/i18n"

type Section = keyof typeof STRINGS

const Context = React.createContext<{ locale: Locale; setLocale: (next: Locale) => void } | null>(null)
const KEY = "zen_locale"

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>("vi")

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved === "vi" || saved === "en") setLocaleState(saved)
    } catch {
      /* private window: stay Vietnamese */
    }
  }, [])

  React.useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(KEY, next)
    } catch {
      /* ignore */
    }
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
