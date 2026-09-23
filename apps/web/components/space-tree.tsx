"use client"

import * as React from "react"
import Link from "next/link"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { useT } from "@/components/locale"
import { SpaceControls } from "@/components/space-controls"
import type { Space } from "@/lib/types"

// Spaces nest like folders. A space page shows where it sits and what sits inside it.

export function SpaceChildren({ spaces, parent }: { spaces: Space[]; parent: string }) {
  const t = useT()
  const children = spaces.filter((space) => space.parent_id === parent)
  if (!children.length) return null
  return (
    <ul aria-label={t("spaces", "inside")} className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
      {children.map((child) => (
        <li key={child.id}>
          <Link href={`/spaces/${child.id}`} transitionTypes={["ink"]} className="text-muted-foreground hover:text-primary text-[14px] transition-colors">
            ↳ {child.name} <span className="tabular-nums opacity-60">{child.card_count ?? 0}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function SpaceTree({ spaces, space }: { spaces: Space[]; space: Space }) {
  const t = useT()
  const trail: Space[] = []
  for (let at = spaces.find((item) => item.id === space.parent_id); at && trail.length < 12; at = spaces.find((item) => item.id === at!.parent_id)) {
    trail.unshift(at)
  }
  return (
    <div className="mt-3 flex flex-col gap-4">
      <Breadcrumb aria-label={t("spaces", "path")}>
        <BreadcrumbList className="text-[13px] tracking-[0.18em] lowercase">
          {[{ id: null, name: t("spaces", "title") }, ...trail].map((item) => (
            <React.Fragment key={item.id ?? "root"}>
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={<Link href={item.id ? `/spaces/${item.id}` : "/spaces"} transitionTypes={["ink"]} />}
                  className="hover:text-primary"
                >
                  {item.name}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>/</BreadcrumbSeparator>
            </React.Fragment>
          ))}
          <BreadcrumbItem>
            <BreadcrumbPage className="text-foreground">{space.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <SpaceChildren spaces={spaces} parent={space.id} />
      {space.query ? null : (
        <details className="group">
          <summary className="text-muted-foreground hover:text-primary w-fit list-none text-[12px] tracking-[0.22em] lowercase transition-colors">
            + {t("spaces", "newInside")}
          </summary>
          <div className="mt-4">
            <SpaceControls parent={space.id} />
          </div>
        </details>
      )}
    </div>
  )
}
