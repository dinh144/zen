"use client"

import * as React from "react"
import { fresh } from "@/lib/morph"

/** Cards settle in as they reach the viewport, each a beat after the last. */
export function Reveal({
  index = 0,
  as: Tag = "div",
  className = "",
  children,
}: {
  index?: number
  /** "li" when the reveal sits directly inside a list, so the list stays a list. */
  as?: "div" | "li"
  className?: string
  children: React.ReactNode
}) {
  const ref = React.useRef<HTMLElement>(null)

  React.useEffect(() => {
    const node = ref.current
    if (!node) return
    if (fresh()) {
      node.classList.add("in", "now")
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        node.style.animationDelay = `${Math.min(index, 12) * 45}ms`
        node.classList.add("in")
        observer.disconnect()
      },
      { rootMargin: "80px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [index])

  return (
    <Tag ref={ref as never} className={`settle ${className}`}>
      {children}
    </Tag>
  )
}
