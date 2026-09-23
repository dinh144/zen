"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { morph } from "@/lib/morph"
import { scatter } from "@/lib/ink-flow"

// The root template keeps its key across top-level routes (its own segment never changes),
// so the page is keyed by path here: every route change mounts a fresh page.
export default function Template({ children }: { children: React.ReactNode }) {
  return <Page key={usePathname()}>{children}</Page>
}

// A page asked for by a tab (and the very first page) is born out of zen's drop: the drop that
// gathered the old page shoots a drop to each part of this one (lib/ink-flow.ts).
function Page({ children }: { children: React.ReactNode }) {
  const page = React.useRef<HTMLDivElement>(null)
  const asked = React.useRef(-1e9) // when a tab asked for this page to be born

  // Next keeps visited pages alive but hidden and only reveals them again, so the flag is read in the
  // layout effect (which runs on every reveal), not at render. Children read it in their own effects,
  // which run before this component's passive effect spends it.
  React.useEffect(() => {
    morph.pending = false
  }, [])

  React.useLayoutEffect(() => {
    if (morph.at === 0) {
      morph.at = performance.now()
      morph.pending = true
      morph.kind = "ink"
    }
    const root = page.current
    // Dev runs this twice in a row, after the flag is spent: the first run's decision holds for a moment.
    if (morph.pending && morph.kind === "ink") asked.current = performance.now()
    if (performance.now() - asked.current > 1000 || !root) return
    scatter(root)
  }, [])

  return (
    <div ref={page} className="bg-background min-h-svh">
      {children}
    </div>
  )
}
