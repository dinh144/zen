"use client"

import * as React from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Brush, Columns3, Droplet, Import, Languages, Settings, Wind } from "lucide-react"
import { useLocale, useT } from "@/components/locale"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip"

/** Five marks down the left margin — a bottom strip on a phone. */
export function LeftRail({
  dense,
  onDense,
  onFile,
}: {
  dense: boolean
  onDense: () => void
  onFile: (file: File) => void
}) {
  const { resolvedTheme, setTheme } = useTheme()
  const input = React.useRef<HTMLInputElement>(null)
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  const dark = mounted && resolvedTheme === "dark"
  const { locale, setLocale } = useLocale()
  const t = useT()

  const items = [
    { icon: Import, label: t("rail", "bringIn"), action: () => input.current?.click() },
    { icon: Brush, label: t("rail", "brush"), href: "/focus" },
    { icon: Wind, label: t("rail", "drift"), href: "/serendipity" },
    { icon: Droplet, label: t("rail", dark ? "paper" : "night"), action: () => setTheme(dark ? "light" : "dark") },
    { icon: Columns3, label: t("rail", dense ? "loosen" : "tighten"), action: onDense },
    { icon: Languages, label: t("rail", "language"), action: () => setLocale(locale === "vi" ? "en" : "vi") },
  ] satisfies { icon: typeof Import; label: string; action?: () => void; href?: string }[]

  return (
    <TooltipProvider>
      <aside className="border-border/70 bg-background/85 fixed inset-x-0 bottom-0 z-20 flex h-14 items-center justify-center gap-8 border-t backdrop-blur sm:inset-y-0 sm:right-auto sm:left-0 sm:h-auto sm:w-20 sm:flex-col sm:justify-center sm:gap-9 sm:border-t-0 sm:border-r sm:bg-transparent sm:backdrop-blur-none">
        {items.map((item) => (
          <Tooltip key={item.label}>
            <TooltipTrigger
              render={
                item.href ? (
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    className="text-muted-foreground hover:text-primary transition-colors duration-300"
                  />
                ) : (
                  <button
                    onClick={item.action}
                    aria-label={item.label}
                    className="text-muted-foreground hover:text-primary transition-colors duration-300"
                  />
                )
              }
            >
              <item.icon className="size-4" strokeWidth={1.25} />
            </TooltipTrigger>
            <TooltipContent side="right" className="text-[10px] tracking-[0.18em] lowercase">
              {item.label}
            </TooltipContent>
          </Tooltip>
        ))}
        <Tooltip>
          <TooltipTrigger
            render={
              <Link
                href="/settings"
                aria-label={t("settings", "title")}
                className="text-muted-foreground hover:text-primary transition-colors duration-300"
              />
            }
          >
            <Settings className="size-4" strokeWidth={1.25} />
          </TooltipTrigger>
          <TooltipContent side="right" className="text-[10px] tracking-[0.18em] lowercase">
            {t("settings", "title")}
          </TooltipContent>
        </Tooltip>
        <input
          ref={input}
          type="file"
          accept="image/*,application/pdf,video/*"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onFile(file)
            event.target.value = ""
          }}
        />
      </aside>
    </TooltipProvider>
  )
}
