"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { BookOpen, ExternalLink, Link2, Pin, Sparkles, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@workspace/ui/components/dialog"
import { fileOf, imageOf } from "@/components/card-tile"
import { useT } from "@/components/locale"
import type { Card, Space } from "@/lib/types"

const ACTION =
  "inline-flex items-center gap-1.5 text-[10px] tracking-[0.22em] lowercase text-muted-foreground hover:text-primary transition-colors"

function Action({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
}) {
  return (
    <button onClick={onClick} className={`${ACTION} ${active ? "text-primary" : ""}`}>
      {children}
    </button>
  )
}

type Props = {
  card: Card | null
  spaces: Space[]
  readOnly?: boolean
  onClose: () => void
  onChanged: (card: Card) => void
  onPinned?: (card: Card) => void
  onDeleted: (id: string) => void
  /** Clicking a tag searches the board for it. */
  onTag?: (tag: string) => void
}

export function CardDetail({ card, spaces, readOnly, onClose, onChanged, onPinned, onDeleted, onTag }: Props) {
  const t = useT()
  const [note, setNote] = React.useState("")
  const [related, setRelated] = React.useState<Card[]>([])
  const [links, setLinks] = React.useState<Card[]>([])
  const [linking, setLinking] = React.useState(false)
  const [matches, setMatches] = React.useState<Card[]>([])

  React.useEffect(() => {
    if (!card) return
    setNote(card.note ?? "")
    setLinking(false)
    fetch(`/api/cards/${card.id}`)
      .then((res) => res.json())
      .then((data) => {
        setRelated(data.related ?? [])
        setLinks(data.links ?? [])
      })
  }, [card])

  if (!card) return null
  const image = imageOf(card)
  const meta = card.meta as Record<string, string | undefined>

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/cards/${card!.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.card) onChanged(data.card)
  }

  async function link(other: Card) {
    await patch({ link: other.id })
    setLinks((current) => [other, ...current])
    setLinking(false)
  }

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="border-border bg-card max-h-[90vh] grid-cols-[minmax(0,1fr)] space-y-6 overflow-x-hidden overflow-y-auto rounded-none p-5 shadow-none sm:p-8 sm:max-w-3xl">
        <DialogTitle className="font-display text-xl leading-relaxed tracking-wide">{card.title ?? t("kinds", card.kind)}</DialogTitle>

        {card.kind === "video" && fileOf(card) ? (
          <video src={fileOf(card)!} poster={image ?? undefined} controls className="w-full" />
        ) : card.kind === "pdf" && fileOf(card) ? (
          <iframe src={fileOf(card)!} title={card.title ?? "PDF"} className="h-[70vh] w-full bg-white" />
        ) : image ? (
          <Image src={image} alt={card.title ?? ""} width={1200} height={900} unoptimized className="w-full" />
        ) : null}

        {card.kind === "quote" ? (
          <blockquote className="font-display border-primary border-l pl-5 text-lg leading-[1.9]">
            <span className="text-primary">「</span>
            {card.content}
            <span className="text-primary">」</span>
          </blockquote>
        ) : null}

        {meta.summary ? <p className="text-muted-foreground text-sm">{meta.summary}</p> : null}

        {readOnly ? (
          card.note ? <p className="text-sm whitespace-pre-wrap">{card.note}</p> : null
        ) : (
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => note !== (card.note ?? "") && patch({ note })}
            rows={3}
            placeholder={t("card", "thought")}
            className="bg-muted/50 font-display w-full resize-none p-4 text-[14px] leading-[1.9] outline-none"
          />
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {card.colors.map((color) => (
            <span key={color} className="size-5 rounded-full ring-1 ring-white/20" style={{ background: color }} title={color} />
          ))}
          {card.tags.map((tag) =>
            onTag ? (
              <button
                key={tag}
                onClick={() => onTag(tag)}
                className="text-muted-foreground hover:text-primary text-[11px] tracking-[0.12em] lowercase transition-colors"
              >
                {tag}
              </button>
            ) : (
              <span key={tag} className="text-muted-foreground text-[11px] tracking-[0.12em] lowercase">
                {tag}
              </span>
            ),
          )}
        </div>

        {!readOnly ? (
          <div className="border-border flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-5">
            <Action
              active={Boolean(card.pinned_at)}
              onClick={async () => {
                const next = !card.pinned_at
                await patch({ pinned: next })
                onPinned?.({ ...card, pinned_at: next ? new Date().toISOString() : null })
              }}
            >
              <Pin className="size-3.5" strokeWidth={1.5} /> {card.pinned_at ? t("card", "pinned") : t("card", "pin")}
            </Action>
            {card.has_article ? (
              <Link href={`/read/${card.id}`} className={ACTION}>
                <BookOpen className="size-3.5" strokeWidth={1.5} /> {t("card", "read")}
              </Link>
            ) : null}
            <Link href={`/vibe/${card.id}`} className={ACTION}>
              <Sparkles className="size-3.5" strokeWidth={1.5} /> {t("card", "vibe")}
            </Link>
            <Action onClick={() => setLinking((value) => !value)}>
              <Link2 className="size-3.5" strokeWidth={1.5} /> {t("card", "tie")}
            </Action>
            {card.url ? (
              <a href={card.url} target="_blank" rel="noreferrer" className={ACTION}>
                <ExternalLink className="size-3.5" strokeWidth={1.5} /> {card.domain}
              </a>
            ) : null}
            {spaces
              .filter((space) => !space.query)
              .map((space) => {
                const inside = card.space_ids?.includes(space.id) ?? false
                return (
                  <Action
                    key={space.id}
                    active={inside}
                    onClick={async () => {
                      const res = await fetch(`/api/spaces/${space.id}`, {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify(inside ? { remove: card.id } : { add: card.id }),
                      })
                      if (!res.ok) return
                      const ids = card.space_ids ?? []
                      onChanged({ ...card, space_ids: inside ? ids.filter((id) => id !== space.id) : [...ids, space.id] })
                    }}
                  >
                    {inside ? "−" : "+"} {space.name}
                  </Action>
                )
              })}
            <button
              className={`${ACTION} text-muted-foreground hover:text-destructive ms-auto`}
              onClick={async () => {
                await fetch(`/api/cards/${card.id}`, { method: "DELETE" })
                onDeleted(card.id)
              }}
            >
              <Trash2 className="size-3.5" strokeWidth={1.5} /> {t("card", "letGo")}
            </button>
          </div>
        ) : null}

        {linking ? (
          <div className="space-y-2">
            <input
              autoFocus
              placeholder={t("card", "findToLink")}
              onChange={async (event) => {
                const query = event.target.value.trim()
                if (!query) return setMatches([])
                const res = await fetch(`/api/cards?q=${encodeURIComponent(query)}`)
                const data = await res.json()
                setMatches((data.cards as Card[]).filter((item) => item.id !== card.id).slice(0, 6))
              }}
              className="bg-muted/50 w-full p-3 text-[13px] outline-none"
            />
            {matches.map((match) => (
              <button
                key={match.id}
                onClick={() => link(match)}
                className="hover:bg-muted/60 block w-full truncate rounded-md p-2 text-left text-sm"
              >
                {match.title ?? match.note ?? match.url}
              </button>
            ))}
          </div>
        ) : null}

        {links.length ? (
          <section>
            <h3 className="text-muted-foreground mb-3 text-[10px] tracking-[0.25em] lowercase">{t("card", "tiedTo")}</h3>
            <ul className="space-y-1 text-sm">
              {links.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{item.title ?? item.note ?? item.url}</span>
                  {!readOnly ? (
                    <button
                      onClick={async () => {
                        await patch({ unlink: item.id })
                        setLinks((current) => current.filter((link) => link.id !== item.id))
                      }}
                      className="text-muted-foreground hover:text-destructive text-[10px] tracking-widest lowercase"
                    >
                      {t("card", "untie")}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {related.length ? (
          <section>
            <h3 className="text-muted-foreground mb-3 text-[10px] tracking-[0.25em] lowercase">{t("card", "sameAir")}</h3>
            <div className="flex gap-2 overflow-x-auto">
              {related.slice(0, 8).map((item) => {
                const thumb = imageOf(item)
                return (
                  <div key={item.id} className="bg-muted border-border size-20 shrink-0 overflow-hidden border">
                    {thumb ? (
                      <Image src={thumb} alt="" width={160} height={160} unoptimized className="size-full object-cover" />
                    ) : (
                      <p className="line-clamp-4 p-2 text-[10px]">{item.title ?? item.note}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
