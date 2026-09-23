"use client"

import * as React from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@workspace/ui/components/hover-card"
import { imageOf } from "@/components/card-tile"
import { useT } from "@/components/locale"
import { todosOf, toggleTodo } from "@/lib/checklist"
import { withWikiLinks } from "@/lib/wiki"
import type { Card } from "@/lib/types"

// Markdown with tables and code, checklists that tick in place, and [[Title]] links to other cards.
// Reading is the default; press the note (or "edit") to write, leave the field to save.

// One lookup per title per page: the hover preview and the click both ask for the same card.
const titled = new Map<string, Promise<Card | null>>()
const fold = (value: string | null) => (value ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()

/** The card a [[title]] points at: an exact title match, else the best search hit. */
function cardTitled(title: string) {
  if (!titled.has(title)) {
    titled.set(
      title,
      fetch(`/api/cards?q=${encodeURIComponent(title)}`)
        .then((res) => (res.ok ? res.json() : { cards: [] }))
        .then(({ cards }: { cards: Card[] }) => cards.find((card) => fold(card.title) === fold(title)) ?? cards[0] ?? null)
        .catch(() => null),
    )
  }
  return titled.get(title)!
}

/** What a [[link]] leads to, shown on hover before you follow it. */
function WikiPeek({ title }: { title: string }) {
  const [card, setCard] = React.useState<Card | null | undefined>(undefined)
  React.useEffect(() => {
    cardTitled(title).then(setCard)
  }, [title])
  if (card === undefined) return <p className="text-muted-foreground text-[13px]">…</p>
  if (!card) return <p className="text-muted-foreground text-[14px]">{title}</p>
  const image = imageOf(card)
  const summary = (card.meta as Record<string, string | undefined>).summary ?? card.note?.split("\n").find((line) => line.trim())
  return (
    <div className="flex flex-col gap-2">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="aspect-[16/10] w-full object-cover" />
      ) : null}
      <p className="font-display text-[16px] leading-snug">{card.title}</p>
      {summary ? <p className="text-muted-foreground line-clamp-3 text-[14px] leading-relaxed">{summary}</p> : null}
    </div>
  )
}

/** The note as runs of markdown and runs of to-dos, in their original order. */
function blocks(note: string) {
  const todos = new Map(todosOf(note).map((todo) => [todo.index, todo]))
  const out: ({ kind: "md"; text: string } | { kind: "todo"; items: ReturnType<typeof todosOf> })[] = []
  note.split("\n").forEach((line, index) => {
    const todo = todos.get(index)
    const last = out[out.length - 1]
    if (todo) {
      if (last?.kind === "todo") last.items.push(todo)
      else out.push({ kind: "todo", items: [todo] })
    } else if (last?.kind === "md") last.text += `\n${line}`
    else out.push({ kind: "md", text: line })
  })
  return out
}

export function NoteView({
  note,
  readOnly,
  onSave,
  onOpen,
}: {
  note: string
  readOnly?: boolean
  onSave: (next: string) => void
  onOpen: (card: Card) => void
}) {
  const t = useT()
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(note)
  const [suggest, setSuggest] = React.useState<{ from: number; cards: Card[] } | null>(null)
  const field = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => setDraft(note), [note])
  React.useLayoutEffect(() => {
    const el = field.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight + 2}px`
  }, [draft, editing])

  async function openTitle(title: string) {
    const hit = await cardTitled(title)
    if (hit) onOpen(hit)
  }

  // Typing "[[" lists cards by title; picking one closes the link.
  async function watch(value: string, caret: number) {
    const open = value.lastIndexOf("[[", caret)
    const typed = open >= 0 ? value.slice(open + 2, caret) : ""
    if (open < 0 || /[\]\n]/.test(typed)) return setSuggest(null)
    const res = await fetch(typed ? `/api/cards?q=${encodeURIComponent(typed)}` : "/api/cards")
    const cards = res.ok ? ((await res.json()) as { cards: Card[] }).cards.filter((card) => card.title) : []
    setSuggest(cards.length ? { from: open + 2, cards: cards.slice(0, 6) } : null)
  }

  function pick(card: Card) {
    const el = field.current
    if (!el || !suggest) return
    const next = `${draft.slice(0, suggest.from)}${card.title}]]${draft.slice(el.selectionStart)}`
    setDraft(next)
    setSuggest(null)
    requestAnimationFrame(() => {
      el.focus()
      const at = suggest.from + card.title!.length + 2
      el.setSelectionRange(at, at)
    })
  }

  if (readOnly || (!editing && draft.trim())) {
    return (
      <div className="group relative">
        <div
          className="note-md font-display text-[16px] leading-[1.9]"
          onClick={(event) => {
            if (!readOnly && !(event.target as HTMLElement).closest("a,button,input,label")) setEditing(true)
          }}
        >
          <NoteBody
            note={draft}
            onToggle={
              readOnly
                ? undefined
                : (index) => {
                    const next = toggleTodo(draft, index)
                    setDraft(next)
                    onSave(next)
                  }
            }
            onWiki={openTitle}
          />
        </div>
        {readOnly ? null : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-primary absolute -top-6 right-0 text-[12px] tracking-[0.22em] lowercase opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            {t("card", "edit")}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="relative">
      <textarea
        ref={field}
        autoFocus={editing}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value)
          watch(event.target.value, event.target.selectionStart)
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && suggest) {
            event.stopPropagation()
            setSuggest(null)
          }
        }}
        onBlur={() => {
          // Let a click on a suggestion land before the field closes.
          setTimeout(() => {
            if (document.activeElement === field.current) return
            setSuggest(null)
            setEditing(false)
            if (draft !== note) onSave(draft)
          }, 120)
        }}
        rows={3}
        placeholder={t("card", "thought")}
        className="bg-muted/50 w-full resize-none p-4 font-mono text-[15px] leading-[1.8] outline-none"
      />
      <p className="text-muted-foreground mt-1 text-[12px] tracking-[0.12em]">{t("card", "mdHint")}</p>
      {suggest ? (
        <ul role="listbox" className="sheet absolute inset-x-0 top-full z-10 mt-1 py-1">
          {suggest.cards.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(card)}
                className="hover:bg-muted w-full truncate px-3 py-2 text-left text-[15px]"
              >
                {card.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** A note read as Markdown. Without onToggle the to-dos are glyphs; without onWiki, [[links]] are plain ink. */
export function NoteBody({
  note,
  onToggle,
  onWiki,
}: {
  note: string
  onToggle?: (index: number) => void
  onWiki?: (title: string) => void
}) {
  return (
    <>
      {blocks(note).map((block, index) =>
        block.kind === "todo" ? (
          <ul key={index} className="todos my-3 flex flex-col gap-2 font-sans">
            {block.items.map((todo) => (
              <li key={todo.index}>
                {onToggle ? (
                  <label className="flex cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={todo.done} onChange={() => onToggle(todo.index)} className="accent-primary mt-1.5" />
                    <span className={todo.done ? "text-muted-foreground line-through" : ""}>{todo.text}</span>
                  </label>
                ) : (
                  <span className={`flex gap-2 ${todo.done ? "text-muted-foreground line-through" : ""}`}>
                    <span aria-hidden>{todo.done ? "☑" : "☐"}</span>
                    {todo.text}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : block.text.trim() ? (
          <Markdown
            key={index}
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) =>
                href?.startsWith("#wiki:") ? (
                  onWiki ? (
                    <HoverCard>
                      <HoverCardTrigger
                        delay={250}
                        render={
                          <button
                            type="button"
                            onClick={() => onWiki(decodeURIComponent(href.slice(6)))}
                            className="text-primary decoration-primary/40 hover:decoration-primary underline underline-offset-4"
                          />
                        }
                      >
                        {children}
                      </HoverCardTrigger>
                      <HoverCardContent className="bg-card text-foreground border-border w-64 rounded-none border p-3 font-sans shadow-none ring-0">
                        <WikiPeek title={decodeURIComponent(href.slice(6))} />
                      </HoverCardContent>
                    </HoverCard>
                  ) : (
                    <span className="text-primary">{children}</span>
                  )
                ) : onWiki ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    {children}
                  </a>
                ) : (
                  <span className="text-primary">{children}</span>
                ),
            }}
          >
            {withWikiLinks(block.text)}
          </Markdown>
        ) : null,
      )}
    </>
  )
}
