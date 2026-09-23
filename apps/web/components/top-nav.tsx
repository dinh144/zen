"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Mark } from "@/components/drop-state"
import { useT } from "@/components/locale"

// Lowercase, spaced, quiet. The names are zen's, not a bookmark manager's.
export function TopNav({ readOnly }: { readOnly?: boolean }) {
  const t = useT()
  const path = usePathname()
  const tabs = [
    { href: "/", label: t("nav", "everything") },
    { href: "/spaces", label: t("nav", "spaces") },
    { href: "/serendipity", label: t("nav", "drift") },
  ]

  return (
    <nav className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 pt-8 sm:px-12">
      <Link href="/">
        <Mark readOnly={readOnly} />
      </Link>
      {readOnly ? null : (
        <div className="flex items-center gap-5 text-[13px] tracking-[0.18em] whitespace-nowrap lowercase sm:gap-8">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={path === tab.href ? "page" : undefined}
              className={`${path === tab.href ? "text-foreground" : "text-muted-foreground"} hover:text-foreground transition-colors`}
            >
              {tab.label}
            </Link>
          ))}
          <Link href="/achievements" className="text-primary transition-colors">
            {t("nav", "marks")}
          </Link>
        </div>
      )}
    </nav>
  )
}
