"use client"

import * as React from "react"
import { ViewTransition } from "react"
import { Droplet } from "@/components/droplet"
import { dropDataUri, INK_TEXT, INKS, type Expression, type Ink } from "@/lib/drop"

type DropContext = {
  ink: Ink
  setInk: (ink: Ink) => void
  mood: Expression
  /** Flash a mood; it falls back to resting after `ms`. */
  feel: (mood: Expression, ms?: number) => void
  rest: (mood: Expression) => void
}

const Context = React.createContext<DropContext | null>(null)
const INK_KEY = "zen_ink"

export function useDrop() {
  const context = React.useContext(Context)
  if (!context) throw new Error("useDrop outside DropProvider")
  return context
}

/** Holds the drop's colour and its current mood for the whole app. */
export function DropProvider({ children, resting = "neutral" }: { children: React.ReactNode; resting?: Expression }) {
  const [ink, setInkState] = React.useState<Ink>("vermilion")
  const [base, setBase] = React.useState<Expression>(resting)
  const [mood, setMood] = React.useState<Expression>(resting)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const paint = React.useCallback((next: Ink) => {
    // Per theme, so the .dark tokens still win at night and every ink stays legible.
    document.documentElement.style.setProperty("--ink-light", INK_TEXT.light[next])
    document.documentElement.style.setProperty("--ink-dark", INK_TEXT.dark[next])
    const link = (document.querySelector("link[rel='icon']") ?? document.createElement("link")) as HTMLLinkElement
    link.rel = "icon"
    link.href = dropDataUri(next)
    document.head.appendChild(link)
  }, [])

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(INK_KEY) as Ink | null
      if (saved && saved in INKS) {
        setInkState(saved)
        paint(saved)
        return
      }
    } catch {
      /* private window: keep the default ink */
    }
    paint("vermilion")
  }, [paint])

  const setInk = React.useCallback(
    (next: Ink) => {
      setInkState(next)
      paint(next)
      try {
        localStorage.setItem(INK_KEY, next)
      } catch {
        /* ignore */
      }
    },
    [paint],
  )

  const feel = React.useCallback(
    (next: Expression, ms = 2200) => {
      setMood(next)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setMood(base), ms)
    },
    [base],
  )

  const rest = React.useCallback((next: Expression) => {
    setBase(next)
    setMood(next)
  }, [])

  return <Context value={{ ink, setInk, mood, feel, rest }}>{children}</Context>
}

/** The corner mark: the drop, wearing whatever the app is feeling. */
export function Mark({ readOnly }: { readOnly?: boolean }) {
  const { mood } = useDrop()
  return (
    <span className="inline-flex items-center gap-2.5">
      {/* One drop across every page: a tab change carries it over and it takes the new page's mood. */}
      <ViewTransition name="zen-drop" share="morph" default="none">
        <span data-drop className="inline-flex">
          <Droplet expression={mood} className="text-primary h-6 w-[18px]" motion={readOnly ? "still" : "fall"} />
        </span>
      </ViewTransition>
      <span className="font-display text-base tracking-[0.3em] lowercase">zen ai</span>
    </span>
  )
}
