"use client"

import * as React from "react"
import { Droplet } from "@/components/droplet"
import { KIND_INK } from "@/lib/drop"

/** Ink strokes standing in for text, so a demo card reads as a card. */
function Lines({ widths }: { widths: number[] }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      {widths.map((width, index) => (
        <span key={index} className="bg-foreground/15 block h-[3px]" style={{ width: `${width}%` }} />
      ))}
    </div>
  )
}

/** A board that builds itself: the same masonry, in miniature, on a loop. */
export function BoardDemo() {
  const tiles = [
    { h: 92, kind: "image" as const, tint: "#94b0bd" },
    { h: 58, kind: "note" as const, lines: [90, 70] },
    { h: 120, kind: "article" as const, tint: "#c8b9a6", lines: [80, 55] },
    { h: 70, kind: "quote" as const, lines: [95, 85, 60] },
    { h: 104, kind: "video" as const, tint: "#3a3a44" },
    { h: 64, kind: "color" as const, tint: "#b23a2f" },
    { h: 86, kind: "pdf" as const, lines: [88, 92, 70, 45] },
    { h: 74, kind: "link" as const, lines: [75, 50] },
  ]

  return (
    <div className="grid grid-cols-4 gap-3" aria-hidden>
      {tiles.map((tile, index) => (
        <div
          key={index}
          className="sheet demo-tile flex flex-col justify-between gap-2 overflow-hidden p-2"
          style={{ height: tile.h, animationDelay: `${index * 160}ms` }}
        >
          {tile.tint ? (
            <span
              className="block w-full flex-1 rounded-[1px]"
              style={{ background: tile.tint, opacity: tile.kind === "color" ? 1 : 0.55 }}
            />
          ) : null}
          {tile.lines ? <Lines widths={tile.lines} /> : null}
          <Droplet expression="neutral" ink={KIND_INK[tile.kind]!} className="h-3.5 w-[10px] shrink-0" motion="still" />
        </div>
      ))}
    </div>
  )
}

/** Three ways in, one card out. */
export function CaptureDemo() {
  const routes = [
    ["dán", "https://…"],
    ["thả", "ảnh · pdf · video"],
    ["gõ", "một ý nghĩ"],
  ]

  return (
    <div className="grid gap-4" aria-hidden>
      {routes.map(([label, value], index) => (
        <div
          key={label}
          className="sheet settle in flex items-center gap-4 px-5 py-4"
          style={{ animationDelay: `${index * 260}ms` }}
        >
          <span className="text-primary w-12 shrink-0 text-[12px] tracking-[0.2em] lowercase">{label}</span>
          <span className="text-muted-foreground font-display text-[16px]">{value}</span>
          <Droplet
            expression={index === 2 ? "excited" : "attentive"}
            ink={["indigo", "jade", "sumi"][index] as "indigo"}
            className="ml-auto h-4 w-3"
            motion="still"
          />
        </div>
      ))}
    </div>
  )
}

const QUERIES = ["quán cà phê đà nẵng", "cai ghe mau cam", "ảnh có chữ", "tuần trước"]

/** The search line types itself, and the cards answer. */
export function SearchDemo() {
  const [index, setIndex] = React.useState(0)
  const [typed, setTyped] = React.useState("")

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(QUERIES[0]!)
      return
    }
    let letter = 0
    const query = QUERIES[index % QUERIES.length]!
    const typing = setInterval(() => {
      letter += 1
      setTyped(query.slice(0, letter))
      if (letter >= query.length) {
        clearInterval(typing)
        setTimeout(() => setIndex((value) => value + 1), 1900)
      }
    }, 85)
    return () => clearInterval(typing)
  }, [index])

  return (
    <div className="sheet px-6 py-7" aria-hidden>
      <p className="font-display text-[22px] leading-relaxed">
        {typed}
        <span className="bg-primary ml-0.5 inline-block h-5 w-px align-middle" style={{ animation: "caret 1s steps(2) infinite" }} />
      </p>
      <span className="bg-primary mt-3 block h-px w-full origin-left" style={{ animation: "ink-line 500ms cubic-bezier(0.22,1,0.36,1)" }} />
      <div key={index} className="results-in mt-6 grid grid-cols-3 gap-3">
        {[
          { height: 72, tint: "#c58a52" },
          { height: 96, tint: "#8fa9a0" },
          { height: 60, tint: "#b23a2f" },
        ].map((result, position) => (
          <div key={position} className="border-border flex flex-col gap-2 border p-2" style={{ height: result.height }}>
            <span className="block w-full flex-1 rounded-[1px]" style={{ background: result.tint, opacity: 0.5 }} />
            <Lines widths={[80, 55]} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** What the local model adds, appearing one line at a time. */
export function ThinkingDemo() {
  const rows = [
    ["thẻ", "macbook air · apple · laptop · bạc"],
    ["chữ trong ảnh", "M5 · 18 giờ pin · 13 và 15 inch"],
    ["bảng màu", "#94b0bd · #d2e5ef · #405d6c"],
    ["tóm tắt", "So sánh hai đời MacBook Air."],
  ]

  return (
    <div className="sheet divide-border divide-y" aria-hidden>
      {rows.map(([label, value], index) => (
        <div key={label} className="settle in grid grid-cols-[110px_1fr] gap-4 px-6 py-4" style={{ animationDelay: `${index * 220}ms` }}>
          <span className="text-muted-foreground text-[12px] tracking-[0.2em] lowercase">{label}</span>
          <span className="text-[15px]">{value}</span>
        </div>
      ))}
    </div>
  )
}

/** Drift: three cards breathing, waiting to be kept or let go. */
export function DriftDemo() {
  return (
    <div className="flex gap-4" aria-hidden>
      {[0, 1, 2].map((index) => (
        <div key={index} className="adrift flex-1" style={{ animationDelay: `${index * 1200}ms` }}>
          <div className="sheet flex h-28 flex-col justify-between p-3">
            <span
              className="block w-full flex-1 rounded-[1px]"
              style={{ background: ["#8fa9a0", "#c58a52", "#7a5cad"][index], opacity: 0.45 }}
            />
            <Lines widths={[70, 45]} />
          </div>
          <div className="text-muted-foreground mt-2 flex gap-4 text-[11px] tracking-[0.2em] lowercase">
            <span className="text-primary">giữ</span>
            <span>buông</span>
          </div>
        </div>
      ))}
    </div>
  )
}
