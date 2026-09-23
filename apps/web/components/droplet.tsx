"use client"

import * as React from "react"
import { DROP_PATH, FACE_MARKUP, INKS, type Expression, type Ink } from "@/lib/drop"

type Props = {
  expression?: Expression
  ink?: Ink | "current"
  className?: string
  /** "fall" drops it in once, "idle" breathes, "still" holds. */
  motion?: "fall" | "idle" | "still"
  title?: string
}

/** A drop of ink with a face. zen's mark, and its only mascot. */
export function Droplet({ expression = "neutral", ink = "current", className = "h-6 w-[18px]", motion = "idle", title }: Props) {
  return (
    <span className={`drop-wrap ${className}`} data-motion={motion} title={title}>
      <svg viewBox="0 0 24 32" className="size-full" role={title ? "img" : undefined} aria-label={title} aria-hidden={!title}>
        <path d={DROP_PATH} fill={ink === "current" ? "currentColor" : INKS[ink]} />
        <g
          className="drop-face"
          dangerouslySetInnerHTML={{ __html: FACE_MARKUP[expression] }}
        />
      </svg>
      <span className="drop-ring" aria-hidden />
    </span>
  )
}
