"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { Card, Space } from "@/lib/types"
import { CLOUD } from "@/lib/cloud"
import { CardTile } from "@/components/card-tile"
import { Droplet } from "@/components/droplet"
import { useDrop } from "@/components/drop-state"
import { useLocale, useT } from "@/components/locale"
import { Reveal } from "@/components/reveal"
import { CardDetail } from "@/components/card-detail"
import { LeftRail } from "@/components/left-rail"
import { TopNav } from "@/components/top-nav"
import { cn } from "@workspace/ui/lib/utils"

type Mode = "everything" | "serendipity" | "static"

type Props = {
  initialCards: Card[]
  spaces: Space[]
  heading?: string | readonly [string, string]
  mode?: Mode
  pinned?: Card[]
  publicView?: boolean
}


const formWith = (file: File) => {
  const form = new FormData()
  form.append("file", file)
  return form
}

const post = (body: unknown) =>
  fetch("/api/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })

async function uploadDirect(file: File) {
  const ticket = await post({ intent: "ticket", name: file.name, type: file.type, size: file.size })
  if (!ticket.ok) return ticket
  const { name, url } = await ticket.json()
  const put = await fetch(url, { method: "PUT", headers: { "content-type": file.type || "application/octet-stream" }, body: file })
  if (!put.ok) return put
  return post({ intent: "done", file: name, name: file.name, type: file.type })
}

export function Board({
  initialCards,
  spaces,
  heading: headingProp,
  mode = "everything",
  pinned = [],
  publicView,
}: Props) {
  const readOnly = mode !== "everything"
  const { feel, rest, ink } = useDrop()
  const t = useT()
  const { locale } = useLocale()
  const heading = Array.isArray(headingProp) ? headingProp[locale === "vi" ? 0 : 1] : (headingProp as string | undefined)
  const router = useRouter()
  const [cards, setCards] = React.useState(initialCards)
  const [query, setQuery] = React.useState("")
  const [resultsKey, setResultsKey] = React.useState(0)
  const [busy, setBusy] = React.useState(false)
  const [dense, setDense] = React.useState(false)
  const [open, setOpen] = React.useState<Card | null>(null)
  const [draft, setDraft] = React.useState("")
  const [top, setTop] = React.useState(pinned)
  const [leaving, setLeaving] = React.useState<string | null>(null)
  const [blooming, setBlooming] = React.useState<string | null>(null)
  const [catching, setCatching] = React.useState(false)

  // Each surface has its own resting face.
  React.useEffect(() => {
    rest(publicView ? "shy" : mode === "serendipity" ? "sleepy" : mode === "static" ? "proud" : "neutral")
  }, [mode, publicView, rest])
  const search = React.useRef<HTMLInputElement>(null)

  // Compare by id, not by array identity: a default `[]` prop is a new array every render.
  const cardKey = initialCards.map((card) => card.id).join()
  const pinnedKey = pinned.map((card) => card.id).join()
  React.useEffect(() => setCards(initialCards), [cardKey])
  React.useEffect(() => setTop(pinned), [pinnedKey])

  // Serendipity: keep it (stop resurfacing for a month) or forget it (delete).
  async function decide(card: Card, keep: boolean) {
    setLeaving(card.id)
    feel(keep ? "happy" : "scared", 1500)
    await new Promise((resolve) => setTimeout(resolve, keep ? 0 : 420))
    await fetch(`/api/cards/${card.id}`, {
      method: keep ? "PATCH" : "DELETE",
      headers: { "content-type": "application/json" },
      body: keep ? JSON.stringify({ seen: true }) : undefined,
    })
    setCards((current) => current.filter((item) => item.id !== card.id))
  }

  // The board arrives 60 at a time; the rest follows as you scroll to the end.
  const PAGE = 60
  const [more, setMore] = React.useState(initialCards.length >= PAGE)
  const end = React.useRef<HTMLDivElement>(null)
  const loading = React.useRef(false)
  React.useEffect(() => {
    const node = end.current
    if (!node || mode !== "everything" || query.trim() || !more) return
    const observer = new IntersectionObserver(async ([entry]) => {
      const last = cards.at(-1)
      if (!entry?.isIntersecting || loading.current || !last) return
      loading.current = true
      const res = await fetch(`/api/cards?limit=${PAGE}&after=${last.id}`)
      if (!res.ok) {
        // Signed out or the server stumbled: stop asking; the next visit starts over.
        loading.current = false
        return setMore(false)
      }
      const { cards: next } = (await res.json()) as { cards: Card[] }
      setCards((current) => [...current, ...next.filter((card) => !current.some((item) => item.id === card.id))])
      setMore(next.length >= PAGE)
      loading.current = false
    }, { rootMargin: "600px" })
    observer.observe(node)
    return () => observer.disconnect()
  }, [cards, more, mode, query])

  // Search as you type, like mymind's single field.
  React.useEffect(() => {
    if (readOnly) return
    const id = setTimeout(async () => {
      const res = await fetch(`/api/cards?q=${encodeURIComponent(query)}`)
      const { cards } = await res.json()
      setCards(cards)
      // A new answer settles in once per search, not once per keystroke.
      setResultsKey((key) => key + 1)
      setMore(!query.trim() && cards.length >= PAGE)
      if (query.trim()) feel(cards.length ? "surprised" : "confused", cards.length ? 1200 : 2600)
    }, 180)
    return () => clearTimeout(id)
  }, [query, readOnly])

  // A save the server turned down: say so, and let the drop show it.
  const [notice, setNotice] = React.useState("")
  function refused(status: number) {
    setBusy(false)
    feel("sad", 2600)
    setNotice(t("board", status === 429 ? "limit" : "failed"))
    setTimeout(() => setNotice(""), 5000)
  }

  const save = React.useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true)
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) return refused(res.status)
      const { card } = await res.json()
      setCards((current) => [card, ...current])
      setBusy(false)
      feel("excited", 1800)
      // The tags land later (a CPU model takes up to minutes); pull the row in until they do.
      setTimeout(() => refresh(card.id), 4000)
    },
    [],
  )

  const upload = React.useCallback(async (file: File) => {
    setBusy(true)
    const res = CLOUD ? await uploadDirect(file) : await fetch("/api/upload", { method: "POST", body: formWith(file) })
    if (!res.ok) return refused(res.status)
    const { card } = await res.json()
    setCards((current) => [card, ...current])
    setBusy(false)
    feel("excited", 1800)
    setTimeout(() => refresh(card.id), 4000)
  }, [])

  // Enrichment gives up after 180s, so 50 tries 4s apart always outlast it.
  async function refresh(id: string, tries = 50) {
    const res = await fetch(`/api/cards/${id}`)
    if (!res.ok) return
    const { card } = await res.json()
    setCards((current) => current.map((item) => (item.id === id ? card : item)))
    if (!card.enriched_at && tries > 1) return void setTimeout(() => refresh(id, tries - 1), 4000)
    if (card.enriched_at) {
      feel("happy", 1800)
      // The card blooms once when its tags land.
      setBlooming(id)
      setTimeout(() => setBlooming(null), 1200)
    }
  }

  // Type anywhere to search; paste or drop anything to save it.
  React.useEffect(() => {
    if (readOnly) return
    const typing = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      (target.isContentEditable || ["INPUT", "TEXTAREA"].includes(target.tagName))

    const onKey = (event: KeyboardEvent) => {
      // Esc clears the search even from inside the search field; other keys leave fields alone.
      if (event.key === "Escape" && (event.target === search.current || !typing(event.target))) return setQuery("")
      if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return
      // Shift+D belongs to the theme toggle, not to the search field.
      if (event.shiftKey && event.key.toLowerCase() === "d") return
      if (event.key.length === 1) search.current?.focus()
    }
    const onPaste = (event: ClipboardEvent) => {
      if (typing(event.target)) return
      const file = event.clipboardData?.files?.[0]
      if (file) return void upload(file)
      const text = event.clipboardData?.getData("text")?.trim()
      if (!text) return
      if (/^https?:\/\//.test(text)) void save({ url: text })
      else void save({ note: text })
    }
    const onDrop = (event: DragEvent) => {
      event.preventDefault()
      setCatching(false)
      const file = event.dataTransfer?.files?.[0]
      if (file) void upload(file)
      const text = event.dataTransfer?.getData("text")
      if (!file && text) void save(/^https?:\/\//.test(text) ? { url: text } : { note: text })
    }
    const stop = (event: DragEvent) => {
      event.preventDefault()
      setCatching(true)
    }
    const leave = (event: DragEvent) => {
      if (!event.relatedTarget) setCatching(false)
    }

    window.addEventListener("keydown", onKey)
    window.addEventListener("paste", onPaste)
    window.addEventListener("drop", onDrop)
    window.addEventListener("dragover", stop)
    window.addEventListener("dragleave", leave)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("paste", onPaste)
      window.removeEventListener("drop", onDrop)
      window.removeEventListener("dragover", stop)
      window.removeEventListener("dragleave", leave)
    }
  }, [readOnly, save, upload])

  return (
    <div data-page className={cn("min-h-screen pb-28 sm:pl-20", catching && "catching")}>
      {catching ? (
        <p className="text-primary pointer-events-none fixed inset-x-0 top-1/2 z-40 text-center text-[11px] tracking-[0.3em] lowercase">
          {t("board", "dropHere")}
        </p>
      ) : null}
      {!readOnly && <LeftRail dense={dense} onDense={() => {
            // Tightening the board takes away its air; the drop is not impressed.
            if (!dense) feel("unimpressed", 1800)
            setDense((value) => !value)
          }} onFile={upload} />}
      <TopNav readOnly={publicView} />

      <header className="relative px-6 pt-16 pb-14 sm:px-12">
        {/* 禅 — the name itself, pressed faintly into the paper. */}
        <span
          aria-hidden
          className="font-display text-foreground pointer-events-none absolute -top-4 right-4 hidden select-none opacity-[0.045] sm:block"
          style={{ fontSize: "clamp(160px, 22vw, 320px)", lineHeight: 0.8 }}
        >
          禅
        </span>
        {readOnly ? (
          <h1 className="font-display text-3xl tracking-wide sm:text-4xl">{heading}</h1>
        ) : (
          <div className="max-w-xl">
            <input
              ref={search}
              value={query}
              onFocus={() => feel("attentive", 1600)}
              onChange={(event) => {
                setQuery(event.target.value)
                if (event.target.value.trim()) feel("curious", 1400)
              }}
              placeholder={heading ?? t("board", "search")}
              aria-label={t("board", "search")}
              data-ruled
              className="peer font-display placeholder:text-muted-foreground/70 w-full bg-transparent pb-3 text-2xl leading-relaxed outline-none sm:text-[28px]"
            />
            <span className={cn("bg-border peer-focus-visible:bg-primary block h-px w-full transition-colors", query && "ink-line bg-primary")} />
            <p className="text-muted-foreground mt-3 flex items-center gap-2 text-[10px] tracking-[0.22em] lowercase">
              {busy ? <Droplet expression="excited" ink={ink} className="pulse-drop h-4 w-3" motion="still" /> : null}
              {busy ? t("board", "inking") : t("board", "hint")}
            </p>
          </div>
        )}
      </header>

      {top.length && mode === "everything" ? (
        <section className="px-6 pb-14 sm:px-12">
          <h2 className="text-muted-foreground mb-5 text-[10px] tracking-[0.25em] lowercase">{t("board", "atHand")}</h2>
          <div className="flex gap-8 overflow-x-auto overflow-y-hidden pt-1 pb-4">
            {top.map((card) => (
              <div key={card.id} className="w-60 shrink-0">
                <CardTile card={card} onOpen={setOpen} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <main key={resultsKey} className={cn("masonry results-in px-6 sm:px-12", dense && "dense")}>
        {!readOnly && !query ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!draft.trim()) return
              void save(/^https?:\/\//.test(draft.trim()) ? { url: draft.trim() } : { note: draft })
              setDraft("")
            }}
            className="sheet px-6 py-7"
          >
            <p className="text-primary mb-4 text-[10px] tracking-[0.25em] lowercase">{t("board", "ink")}</p>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit()
              }}
              rows={4}
              placeholder={t("board", "composer")}
              className="font-display w-full resize-none bg-transparent text-[15px] leading-[1.9] outline-none"
            />
            <button
              type="submit"
              className="text-muted-foreground hover:text-primary mt-3 text-[10px] tracking-[0.22em] lowercase transition-colors"
            >
              {t("board", "save")}
            </button>
            <p role="status" aria-live="polite" className="text-destructive mt-2 min-h-4 text-[12px]">
              {notice}
            </p>
          </form>
        ) : null}

        {cards.map((card, index) => (
          <Reveal key={card.id} index={index}>
            <div
              className={cn(
                mode === "serendipity" && "adrift",
                leaving === card.id && "letting-go",
                blooming === card.id && "bloom",
              )}
              style={mode === "serendipity" ? { animationDelay: `${(index % 5) * 900}ms` } : undefined}
            >
            <CardTile card={card} onOpen={setOpen} />
            {mode === "serendipity" ? (
              <div className="mt-3 flex gap-5 text-[10px] tracking-[0.22em] lowercase">
                <button onClick={() => decide(card, true)} className="text-muted-foreground hover:text-primary transition-colors">
                  {t("board", "keep")}
                </button>
                <button onClick={() => decide(card, false)} className="text-muted-foreground hover:text-destructive transition-colors">
                  {t("board", "letGo")}
                </button>
              </div>
            ) : null}
            </div>
          </Reveal>
        ))}
      </main>
      <div ref={end} aria-hidden />

      {cards.length === 0 ? (
        <div className="flex flex-col items-start gap-6 px-6 py-24 sm:px-12">
          <Droplet expression={query ? "confused" : "sleepy"} ink={ink} className="h-16 w-12" motion="idle" />
          <p className="text-muted-foreground font-display max-w-md text-[15px] leading-relaxed">
{query ? t("board", "emptyQuery") : t("board", "empty")}
          </p>
        </div>
      ) : null}

      <CardDetail
        card={open}
        spaces={spaces}
        readOnly={publicView}
        onClose={() => setOpen(null)}
        onTag={
          readOnly
            ? undefined
            : (tag) => {
                setOpen(null)
                setQuery(tag)
              }
        }
        onChanged={(card) => {
          setCards((current) => current.map((item) => (item.id === card.id ? card : item)))
          setOpen(card)
        }}
        onPinned={(card) =>
          setTop((current) =>
            card.pinned_at ? [card, ...current.filter((item) => item.id !== card.id)] : current.filter((item) => item.id !== card.id),
          )
        }
        onDeleted={(id) => {
          feel("scared", 1600)
          setCards((current) => current.filter((item) => item.id !== id))
          setTop((current) => current.filter((item) => item.id !== id))
          setOpen(null)
          router.refresh()
        }}
      />
    </div>
  )
}
