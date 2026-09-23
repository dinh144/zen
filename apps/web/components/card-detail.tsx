"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BookOpen, CalendarClock, ExternalLink, FolderOpen, Link2, Pin, Sparkles, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@workspace/ui/components/dialog"
import { Drawer, DrawerContent, DrawerTitle } from "@workspace/ui/components/drawer"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"
import { Calendar } from "@workspace/ui/components/calendar"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Kbd } from "@workspace/ui/components/kbd"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { fileOf, imageOf } from "@/components/card-tile"
import { useLocale, useT } from "@/components/locale"
import { NoteView } from "@/components/note-view"
import { embedOf } from "@/lib/embed"
import { notify } from "@/lib/notify"
import type { Card, Space } from "@/lib/types"

const ACTION =
  "inline-flex items-center gap-1.5 text-[12px] tracking-[0.22em] lowercase text-muted-foreground hover:text-primary transition-colors"
// shadcn popovers in zen's skin: a paper sheet with a hairline, square, no shadow.
const SHEET = "bg-card text-foreground rounded-none shadow-none ring-0 border border-border"
const ITEM = "hover:bg-muted w-full px-2 py-1.5 text-left text-[14px] transition-colors"

/** A terse action with its full meaning on hover. `children` must be one element (it becomes the trigger). */
function Tip({ label, children }: { label: React.ReactNode; children: React.ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent className="rounded-none text-[12px] tracking-[0.18em] lowercase">{label}</TooltipContent>
    </Tooltip>
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

/** The same card, as a centred sheet on a desk and a bottom drawer on a phone. */
export function CardDetail(props: Props) {
  const [phone, setPhone] = React.useState(false)
  React.useEffect(() => {
    const media = matchMedia("(max-width: 640px)")
    const update = () => setPhone(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  if (!props.card) return null
  const close = (open: boolean) => !open && props.onClose()
  return phone ? (
    <Drawer open onOpenChange={close}>
      <DrawerContent className="bg-card rounded-none border-t">
        <div className="space-y-6 overflow-x-hidden overflow-y-auto p-5">
          <Detail {...props} card={props.card} Title={DrawerTitle} />
        </div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Dialog open onOpenChange={close}>
      <DialogContent className="border-border bg-card max-h-[90vh] grid-cols-[minmax(0,1fr)] space-y-6 overflow-x-hidden overflow-y-auto rounded-none p-5 shadow-none sm:max-w-3xl sm:p-8">
        <Detail {...props} card={props.card} Title={DialogTitle} />
      </DialogContent>
    </Dialog>
  )
}

function Detail({
  card,
  spaces,
  readOnly,
  onChanged,
  onPinned,
  onDeleted,
  onTag,
  Title,
}: Props & { card: Card; Title: typeof DialogTitle | typeof DrawerTitle }) {
  const t = useT()
  const { locale } = useLocale()
  const router = useRouter()
  const [note, setNote] = React.useState(card.note ?? "")
  const [related, setRelated] = React.useState<Card[]>([])
  const [links, setLinks] = React.useState<Card[]>([])
  const [linking, setLinking] = React.useState(false)
  const [matches, setMatches] = React.useState<Card[]>([])
  const [resurface, setResurface] = React.useState<Date | null>(null)

  React.useEffect(() => {
    setNote(card.note ?? "")
    setLinking(false)
    fetch(`/api/cards/${card.id}`)
      .then((res) => res.json())
      .then((data) => {
        setRelated(data.related ?? [])
        setLinks(data.links ?? [])
        setResurface(data.resurface ? new Date(data.resurface) : null)
      })
  }, [card])

  const image = imageOf(card)
  const embed = embedOf(card.url)
  const meta = card.meta as Record<string, string | undefined>
  const day = (date: Date) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date)

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/cards/${card.id}`, {
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

  const setTags = (tags: string[]) => patch({ tags: [...new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))] })

  async function bringBack(date: Date | null) {
    setResurface(date)
    await patch({ resurface: date?.toISOString() ?? null })
  }

  async function letGo() {
    await fetch(`/api/cards/${card.id}`, { method: "DELETE" })
    onDeleted(card.id)
    notify(t("detailUi", "letGone"), {
      label: t("common", "undo"),
      // Straight to the API, not through patch(): that would reopen the card over the board.
      run: async () => {
        await fetch(`/api/cards/${card.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ restore: true }),
        })
        router.refresh()
      },
    })
  }

  const mySpaces = spaces.filter((space) => !space.query)

  return (
    <TooltipProvider delay={300}>
      <Title className="font-display text-xl leading-relaxed tracking-wide">{card.title ?? t("kinds", card.kind)}</Title>

      {embed ? (
        <iframe
          src={embed.src}
          title={card.title ?? card.domain ?? "player"}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className={`w-full border-0 ${embed.audio ? "h-[352px]" : embed.tall ? "mx-auto aspect-[9/16] max-h-[70vh] max-w-sm" : "aspect-video"}`}
        />
      ) : card.kind === "video" && fileOf(card) ? (
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

      {readOnly && !note.trim() ? null : (
        <NoteView
          note={note}
          readOnly={readOnly}
          onSave={(next) => {
            setNote(next)
            patch({ note: next }).then(() =>
              fetch(`/api/cards/${card.id}`)
                .then((res) => res.json())
                .then((data) => setLinks(data.links ?? [])),
            )
          }}
          // Opening another card through the parent's onChanged: every board swaps `open` to the card it gets.
          onOpen={onChanged}
        />
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {card.colors.map((color) => (
          <span key={color} className="size-5 rounded-full ring-1 ring-white/20" style={{ background: color }} title={color} />
        ))}
        {card.tags.map((tag) =>
          readOnly ? (
            <span key={tag} className="text-muted-foreground text-[13px] tracking-[0.12em] lowercase">
              {tag}
            </span>
          ) : (
            <Popover key={tag}>
              <PopoverTrigger className="text-muted-foreground hover:text-primary data-popup-open:text-primary text-[13px] tracking-[0.12em] lowercase transition-colors">
                {tag}
              </PopoverTrigger>
              <PopoverContent align="start" className={`${SHEET} w-56 gap-1 p-2`}>
                {onTag ? (
                  <button onClick={() => onTag(tag)} className={ITEM}>
                    {t("detailUi", "searchTag")}
                  </button>
                ) : null}
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    const next = String(new FormData(event.currentTarget).get("tag") ?? "")
                    if (next.trim() && next !== tag) setTags(card.tags.map((item) => (item === tag ? next : item)))
                  }}
                >
                  <input
                    name="tag"
                    defaultValue={tag}
                    aria-label={t("detailUi", "rename")}
                    data-ruled
                    className="border-border focus:border-primary w-full border-b bg-transparent px-2 py-1.5 text-[14px] outline-none"
                  />
                </form>
                <button
                  onClick={() => setTags(card.tags.filter((item) => item !== tag))}
                  className={`${ITEM} text-muted-foreground hover:text-destructive`}
                >
                  {t("detailUi", "remove")}
                </button>
              </PopoverContent>
            </Popover>
          ),
        )}
        {readOnly ? null : (
          <Popover>
            <PopoverTrigger className="text-muted-foreground hover:text-primary text-[13px] tracking-[0.12em] lowercase transition-colors">
              {t("detailUi", "addTag")}
            </PopoverTrigger>
            <PopoverContent align="start" className={`${SHEET} w-56 p-2`}>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  const next = String(new FormData(event.currentTarget).get("tag") ?? "")
                  if (next.trim()) setTags([...card.tags, next])
                  event.currentTarget.reset()
                }}
              >
                <input
                  name="tag"
                  autoFocus
                  placeholder={t("detailUi", "tagHint")}
                  data-ruled
                  className="border-border focus:border-primary w-full border-b bg-transparent px-2 py-1.5 text-[14px] outline-none"
                />
              </form>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {!readOnly ? (
        <div className="border-border flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-5">
          <Tip label={card.pinned_at ? t("card", "pinned") : t("card", "pin")}>
            <button
              className={`${ACTION} ${card.pinned_at ? "text-primary" : ""}`}
              onClick={async () => {
                const next = !card.pinned_at
                await patch({ pinned: next })
                onPinned?.({ ...card, pinned_at: next ? new Date().toISOString() : null })
              }}
            >
              <Pin className="size-3.5" strokeWidth={1.5} /> {card.pinned_at ? t("card", "pinned") : t("card", "pin")}
            </button>
          </Tip>
          {card.has_article ? (
            <Tip label={t("card", "read")}>
              <Link href={`/read/${card.id}`} className={ACTION}>
                <BookOpen className="size-3.5" strokeWidth={1.5} /> {t("card", "read")}
              </Link>
            </Tip>
          ) : null}
          <Tip label={t("card", "vibe")}>
            <Link href={`/vibe/${card.id}`} className={ACTION}>
              <Sparkles className="size-3.5" strokeWidth={1.5} /> {t("card", "vibe")}
            </Link>
          </Tip>
          <Tip label={t("card", "findToLink")}>
            <button className={ACTION} onClick={() => setLinking((value) => !value)}>
              <Link2 className="size-3.5" strokeWidth={1.5} /> {t("card", "tie")}
            </button>
          </Tip>
          {card.url ? (
            <Tip label={t("detailUi", "openLink")}>
              <a href={card.url} target="_blank" rel="noreferrer" className={ACTION}>
                <ExternalLink className="size-3.5" strokeWidth={1.5} /> {card.domain}
              </a>
            </Tip>
          ) : null}

          <Popover>
            <PopoverTrigger className={`${ACTION} ${card.space_ids?.length ? "text-primary" : ""}`}>
              <FolderOpen className="size-3.5" strokeWidth={1.5} /> {t("detailUi", "spaces")}
              {card.space_ids?.length ? ` · ${card.space_ids.length}` : ""}
            </PopoverTrigger>
            <PopoverContent align="start" className={`${SHEET} w-60 gap-0 p-1`}>
              {mySpaces.length ? (
                mySpaces.map((space) => {
                  const inside = card.space_ids?.includes(space.id) ?? false
                  return (
                    <label key={space.id} className={`${ITEM} flex cursor-pointer items-center gap-2.5`}>
                      <Checkbox
                        checked={inside}
                        className="rounded-none"
                        onCheckedChange={async () => {
                          const res = await fetch(`/api/spaces/${space.id}`, {
                            method: "PATCH",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify(inside ? { remove: card.id } : { add: card.id }),
                          })
                          if (!res.ok) return
                          const ids = card.space_ids ?? []
                          onChanged({ ...card, space_ids: inside ? ids.filter((id) => id !== space.id) : [...ids, space.id] })
                        }}
                      />
                      <span className="truncate">{space.name}</span>
                    </label>
                  )
                })
              ) : (
                <p className="text-muted-foreground px-2 py-1.5 text-[14px]">{t("detailUi", "noSpaces")}</p>
              )}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger className={`${ACTION} ${resurface ? "text-primary" : ""}`}>
              <CalendarClock className="size-3.5" strokeWidth={1.5} />
              {resurface ? `${t("detailUi", "backOn")} ${day(resurface)}` : t("detailUi", "bringBack")}
            </PopoverTrigger>
            <PopoverContent align="start" className={`${SHEET} w-auto p-1`}>
              <Calendar
                mode="single"
                selected={resurface ?? undefined}
                onSelect={(date) => date && bringBack(date)}
                disabled={{ before: new Date() }}
                className="bg-transparent [--cell-radius:0px]"
              />
              {resurface ? (
                <button onClick={() => bringBack(null)} className={`${ITEM} text-muted-foreground`}>
                  {t("detailUi", "never")}
                </button>
              ) : null}
            </PopoverContent>
          </Popover>

          <AlertDialog>
            <AlertDialogTrigger className={`${ACTION} hover:text-destructive ms-auto`}>
              <Trash2 className="size-3.5" strokeWidth={1.5} /> {t("card", "letGo")}
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card rounded-none shadow-none ring-0 border border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-lg font-normal">{t("detailUi", "letGoTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("detailUi", "letGoBody")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="bg-transparent border-border">
                <AlertDialogCancel className="rounded-none shadow-none">{t("common", "cancel")}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" className="rounded-none" onClick={letGo}>
                  {t("card", "letGo")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <span className="text-muted-foreground hidden items-center gap-1.5 text-[12px] tracking-[0.18em] lowercase sm:inline-flex">
            <Kbd className="rounded-none">esc</Kbd> {t("detailUi", "close")}
          </span>
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
            className="bg-muted/50 w-full p-3 text-[15px] outline-none"
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
          <h3 className="text-muted-foreground mb-3 text-[12px] tracking-[0.25em] lowercase">{t("card", "tiedTo")}</h3>
          <ul className="space-y-1 text-sm">
            {links.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{item.title ?? item.note ?? item.url}</span>
                {!readOnly ? (
                  <button
                    onClick={async () => {
                      await patch({ unlink: item.id })
                      setLinks((current) => current.filter((other) => other.id !== item.id))
                    }}
                    className="text-muted-foreground hover:text-destructive text-[12px] tracking-widest lowercase"
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
          <h3 className="text-muted-foreground mb-3 text-[12px] tracking-[0.25em] lowercase">{t("card", "sameAir")}</h3>
          <div className="flex gap-2 overflow-x-auto">
            {related.slice(0, 8).map((item) => {
              const thumb = imageOf(item)
              return (
                <div key={item.id} className="bg-muted border-border size-20 shrink-0 overflow-hidden border">
                  {thumb ? (
                    <Image src={thumb} alt="" width={160} height={160} unoptimized className="size-full object-cover" />
                  ) : (
                    <p className="line-clamp-4 p-2 text-[12px]">{item.title ?? item.note}</p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}
    </TooltipProvider>
  )
}
