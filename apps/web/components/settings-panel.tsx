"use client"

import * as React from "react"
import { Settings } from "lucide-react"
import { useTheme } from "next-themes"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@workspace/ui/components/sheet"
import { Switch } from "@workspace/ui/components/switch"
import { DeleteAccount } from "@/components/delete-account"
import { DropPicker } from "@/components/drop-picker"
import { ImportBox } from "@/components/import-box"
import { useLocale, useT } from "@/components/locale"
import { CLOUD } from "@/lib/cloud"
import { LOCALES, type Locale } from "@/lib/i18n"

const LABEL: Record<Locale, string> = { vi: "tiếng việt", en: "english", ko: "한국어", zh: "中文", ja: "日本語" }
const HEAD = "text-muted-foreground mb-4 text-[12px] tracking-[0.25em] lowercase"
const LINK = "text-primary w-fit text-[12px] tracking-[0.22em] lowercase"

/** Everything you can set, the same on the /settings page and in the sheet. */
export function SettingsPanel() {
  const t = useT()
  const { locale, setLocale } = useLocale()
  const { resolvedTheme, setTheme } = useTheme()
  // The theme is only known in the browser: the server renders the switch off, then it catches up.
  const hydrated = React.useSyncExternalStore(() => () => {}, () => true, () => false)

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className={HEAD}>{t("settings", "language")}</h2>
        <Select value={locale} onValueChange={(next) => setLocale(next as Locale)}>
          <SelectTrigger aria-label={t("settings", "language")} className="w-48">
            <SelectValue>{(value: Locale) => LABEL[value]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {LOCALES.map((code) => (
              <SelectItem key={code} value={code}>
                {LABEL[code]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <section>
        <label className="flex w-fit items-center gap-4 text-[15px]">
          <Switch checked={hydrated && resolvedTheme === "dark"} onCheckedChange={(on) => setTheme(on ? "dark" : "light")} />
          {t("panelUi", "night")}
        </label>
        <p className="text-muted-foreground mt-4 max-w-sm text-[14px] leading-relaxed">{t("panelUi", "motion")}</p>
      </section>

      <section>
        <h2 className={HEAD}>{t("settings", "yourDrop")}</h2>
        <DropPicker />
      </section>

      <div className="flex flex-col gap-4">
        <a href="/api/export" className={LINK}>
          {t("settings", "export")}
        </a>
        <ImportBox />
        {CLOUD ? (
          <form action="/auth/logout" method="post">
            <button className="text-muted-foreground hover:text-primary text-[12px] tracking-[0.22em] lowercase transition-colors">
              {t("login", "out")}
            </button>
          </form>
        ) : null}
        {CLOUD ? <DeleteAccount /> : null}
      </div>
    </div>
  )
}

/** The same panel sliding in from the right, without leaving the page you are on. */
export function SettingsSheet() {
  const t = useT()
  return (
    <Sheet>
      <SheetTrigger
        aria-label={t("settings", "title")}
        className="text-muted-foreground hover:text-primary transition-colors"
      >
        <Settings className="size-3.5" strokeWidth={1.25} />
      </SheetTrigger>
      <SheetContent side="right" className="overflow-x-hidden overflow-y-auto px-8 pt-14 pb-10 sm:max-w-md">
        <SheetTitle className="font-display mb-8 text-2xl tracking-wide">{t("settings", "title")}</SheetTitle>
        <SettingsPanel />
      </SheetContent>
    </Sheet>
  )
}
