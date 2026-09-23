"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Mark } from "@/components/drop-state"
import { useT } from "@/components/locale"
import { SettingsSheet } from "@/components/settings-panel"
import { morph } from "@/lib/morph"
import { gather } from "@/lib/ink-flow"

// A tab press: the moment it happened (arriving pages check it) and the tiles on screen, for the graph.
function inkFrom(kind: "ink" | "graph") {
  morph.at = performance.now()
  morph.pending = true
  morph.kind = kind
  // Every tile on screen leaves its box, for the graph to grow its nodes out of.
  morph.tiles.clear()
  for (const el of document.querySelectorAll<HTMLElement>("main [data-card]")) {
    const box = el.getBoundingClientRect()
    if (box.bottom > 0 && box.top < innerHeight) morph.tiles.set(el.dataset.card!, box)
  }
}

/** To or from the graph, cards melt into nodes; everywhere else, the drop gathers the page first. */
function useGo() {
  const router = useRouter()
  const path = usePathname()
  return (href: string) => (event: React.MouseEvent) => {
    const graph = href === "/pool" || path === "/pool"
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0 || href === path) return
    inkFrom(graph ? "graph" : "ink")
    if (graph) return
    event.preventDefault()
    router.prefetch(href)
    // Whatever the drop does, the page always changes (and never waits more than 2.4s for it).
    void Promise.race([gather().catch((error) => console.warn("[ink] gather", error)), new Promise((resolve) => setTimeout(resolve, 2400))]).then(() => router.push(href))
  }
}

// Lowercase, spaced, quiet. The names are zen's, not a bookmark manager's.
export function TopNav({ readOnly }: { readOnly?: boolean }) {
  const t = useT()
  const path = usePathname()
  const go = useGo()
  const tabs = [
    { href: "/", label: t("nav", "everything") },
    { href: "/pool", label: t("nav", "pool") },
    { href: "/spaces", label: t("nav", "spaces") },
    { href: "/serendipity", label: t("nav", "drift") },
  ]

  return (
    <nav className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 px-6 pt-8 sm:px-12">
      <Link href="/" onClick={go("/")}>
        <Mark readOnly={readOnly} />
      </Link>
      {readOnly ? null : (
        <div className="flex items-center gap-5 text-[15px] tracking-[0.18em] whitespace-nowrap lowercase sm:gap-8">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={go(tab.href)}
              aria-current={path === tab.href ? "page" : undefined}
              className={`${path === tab.href ? "text-foreground" : "text-muted-foreground"} hover:text-foreground transition-colors`}
            >
              {tab.label}
            </Link>
          ))}
          <Link href="/achievements" onClick={go("/achievements")} className="text-primary transition-colors">
            {t("nav", "marks")}
          </Link>
          <SettingsSheet />
        </div>
      )}
    </nav>
  )
}
