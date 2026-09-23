"use client"

import * as React from "react"
import Link from "next/link"
import { Droplet } from "@/components/droplet"
import { useDrop } from "@/components/drop-state"
import { useLocale, useT } from "@/components/locale"
import { Reveal } from "@/components/reveal"
import { BoardDemo, CaptureDemo, DriftDemo, SearchDemo, ThinkingDemo } from "@/components/landing-demos"
import { EXPRESSIONS, INKS, KIND_INK, type Ink } from "@/lib/drop"

const INK_ORDER = Object.keys(INKS) as Ink[]
const KINDS = ["note", "quote", "link", "article", "image", "video", "pdf", "product", "book", "color"] as const

/** zen's front door: a claim, then the thing itself, doing what it claims. */
export function Landing() {
  const t = useT()
  const { locale, setLocale } = useLocale()
  const { ink } = useDrop()
  const [mood, setMood] = React.useState(0)

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const timer = setInterval(() => setMood((value) => (value + 1) % EXPRESSIONS.length), 1600)
    return () => clearInterval(timer)
  }, [])

  const blocks = [
    { title: "captureTitle", body: "captureBody", demo: <CaptureDemo /> },
    { title: "demoSearchTitle", body: "demoSearchBody", demo: <SearchDemo /> },
    { title: "readTitle", body: "readBody", demo: <ThinkingDemo /> },
    { title: "keepTitle", body: "keepBody", demo: <DriftDemo /> },
  ] as const

  return (
    <div data-page className="min-h-screen">
      <nav className="flex items-center justify-between px-6 pt-8 sm:px-12">
        <span className="inline-flex items-center gap-2.5">
          <Droplet expression="neutral" ink={ink} className="h-6 w-[18px]" motion="fall" />
          <span className="font-display text-base tracking-[0.3em] lowercase">zen</span>
        </span>
        <div className="flex items-center gap-6 text-[11px] tracking-[0.2em] lowercase">
          <button
            onClick={() => setLocale(locale === "vi" ? "en" : "vi")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {locale === "vi" ? "english" : "tiếng việt"}
          </button>
          <Link href="/login" className="text-primary">
            {t("landing", "enter")}
          </Link>
        </div>
      </nav>

      <header className="relative grid items-center gap-16 px-6 pt-20 pb-24 sm:px-12 lg:grid-cols-[1.1fr_1fr]">
        <span
          aria-hidden
          className="font-display text-foreground pointer-events-none absolute -top-12 right-4 hidden select-none opacity-[0.04] lg:block"
          style={{ fontSize: "clamp(200px, 22vw, 380px)", lineHeight: 0.8 }}
        >
          禅
        </span>
        <div>
          <Droplet expression="happy" ink={ink} className="mb-10 h-24 w-[72px]" motion="fall" />
          <h1 className="font-display max-w-2xl text-4xl leading-[1.35] tracking-wide sm:text-[52px]">
            {t("landing", "tagline")}
          </h1>
          <p className="text-muted-foreground mt-8 max-w-lg text-[15px] leading-[1.95]">{t("landing", "sub")}</p>
          <Link
            href="/login"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground mt-12 inline-flex items-center gap-3 border px-6 py-3 text-[10px] tracking-[0.28em] lowercase transition-colors duration-500"
          >
            <Droplet expression="excited" ink="current" className="h-4 w-3" motion="idle" />
            {t("landing", "enter")}
          </Link>
        </div>
        <Reveal>
          <BoardDemo />
        </Reveal>
      </header>

      <section className="border-border/70 border-y px-6 py-14 sm:px-12">
        <p className="text-muted-foreground mb-5 text-[10px] tracking-[0.25em] lowercase">{t("landing", "refuseTitle")}</p>
        <p className="font-display text-xl leading-[1.8] tracking-wide sm:text-[26px]">{t("landing", "refuse")}</p>
      </section>

      {blocks.map((block, index) => (
        <Reveal key={block.title} index={index}>
          <section className="border-border/70 grid gap-10 border-b px-6 py-20 sm:px-12 lg:grid-cols-[1fr_1.15fr] lg:items-center">
            <div>
              <h2 className="font-display text-2xl leading-snug tracking-wide">{t("landing", block.title)}</h2>
              <p className="text-muted-foreground mt-5 max-w-md text-[15px] leading-[1.95]">{t("landing", block.body)}</p>
            </div>
            {block.demo}
          </section>
        </Reveal>
      ))}

      <Reveal>
        <section className="border-border/70 border-b px-6 py-20 sm:px-12">
          <h2 className="font-display text-2xl tracking-wide">{t("landing", "kindsTitle")}</h2>
          <p className="text-muted-foreground mt-5 max-w-xl text-[15px] leading-[1.95]">{t("landing", "kindsBody")}</p>
          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-5">
            {KINDS.map((kind) => (
              <li key={kind} className="flex items-center gap-2">
                <Droplet expression="neutral" ink={KIND_INK[kind]!} className="h-4 w-3" motion="still" />
                <span className="text-muted-foreground text-[11px] tracking-[0.18em] lowercase">{t("kinds", kind)}</span>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      <Reveal>
        <section className="border-border/70 grid gap-10 border-b px-6 py-20 sm:px-12 lg:grid-cols-[1fr_1fr]">
          <div>
            <h2 className="font-display text-2xl leading-snug tracking-wide">{t("landing", "localTitle")}</h2>
            <p className="text-muted-foreground mt-5 max-w-md text-[15px] leading-[1.95]">{t("landing", "localBody")}</p>
          </div>
          <p className="font-display self-end text-[13px] tracking-[0.2em] lowercase">{t("landing", "stack")}</p>
        </section>
      </Reveal>

      <section className="border-border/70 border-b px-6 py-20 sm:px-12">
        <h2 className="font-display text-2xl tracking-wide">{t("landing", "moodsTitle")}</h2>
        <p className="text-muted-foreground mt-5 max-w-xl text-[15px] leading-[1.95]">{t("landing", "moodsBody")}</p>
        <div className="mt-12 flex flex-wrap gap-6">
          {EXPRESSIONS.map((expression, index) => (
            <Droplet
              key={expression}
              expression={expression}
              ink={INK_ORDER[index % INK_ORDER.length]!}
              className={`h-12 w-9 transition-opacity duration-700 ${index === mood ? "opacity-100" : "opacity-40"}`}
              motion={index === mood ? "idle" : "still"}
              title={expression}
            />
          ))}
        </div>
      </section>

      <Reveal>
        <section className="border-border/70 border-b px-6 py-16 sm:px-12">
          <p className="text-muted-foreground mb-4 text-[10px] tracking-[0.25em] lowercase">{t("landing", "forTitle")}</p>
          <p className="font-display text-xl leading-[1.8] tracking-wide">{t("landing", "forList")}</p>
        </section>
      </Reveal>

      <section className="flex flex-col items-start gap-8 px-6 py-24 sm:px-12">
        <Droplet expression="proud" ink={ink} className="h-16 w-12" motion="idle" />
        <h2 className="font-display max-w-2xl text-3xl leading-snug tracking-wide">{t("landing", "ctaTitle")}</h2>
        <Link
          href="/login"
          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground inline-flex items-center gap-3 border px-6 py-3 text-[10px] tracking-[0.28em] lowercase transition-colors duration-500"
        >
          {t("landing", "enter")}
        </Link>
      </section>

      <footer className="border-border/70 flex flex-wrap items-center justify-between gap-4 border-t px-6 py-12 text-[10px] tracking-[0.22em] lowercase sm:px-12">
        <span className="text-muted-foreground">{t("landing", "footer")}</span>
        <span className="text-muted-foreground">禅</span>
      </footer>
    </div>
  )
}
