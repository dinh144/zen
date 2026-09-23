"use client"

import Image from "next/image"
import { FileText, Play } from "lucide-react"
import { cn } from "@workspace/ui/lib/utils"
import { Droplet } from "@/components/droplet"
import { useT } from "@/components/locale"
import { contrast, KIND_INK } from "@/lib/drop"
import type { Card } from "@/lib/types"

export const imageOf = (card: Card) => {
  const meta = card.meta as { file?: string; image?: string; poster?: string }
  // A PDF and a video show their poster; everything else shows itself.
  if (meta.poster) return `/api/file/${meta.poster}`
  if (card.image_path) return `/api/file/${meta.file}`
  return meta.image ?? null
}

export const fileOf = (card: Card) => {
  const meta = card.meta as { file?: string }
  return card.image_path && meta.file ? `/api/file/${meta.file}` : null
}

// Kinds whose maker matters: the author of a book, the channel of a video.
const BYLINE: Card["kind"][] = ["book", "article", "video", "movie", "recipe"]

// Ink on a light swatch, paper on a dark one: whichever reads better by the WCAG ratio.
const labelOn = (hex: string) =>
  /^#[0-9a-f]{6}$/i.test(hex) && contrast("#1a1a18", hex) >= contrast("#fbf9f4", hex) ? "#1a1a18" : "#fbf9f4"

const hexOf = (card: Card) => /#[0-9a-f]{6}\b/i.exec(`${card.note ?? ""} ${card.title ?? ""}`)?.[0]

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, "0")}`

/** Every card is a sheet of paper. Ink decides what is on it. */
export function CardTile({ card, onOpen }: { card: Card; onOpen: (card: Card) => void }) {
  const t = useT()
  const image = imageOf(card)
  const meta = card.meta as Record<string, string | undefined>

  return (
    <figure className="group">
      <button
        onPointerDown={(event) => {
          // The ripple starts where the finger lands.
          const box = event.currentTarget.getBoundingClientRect()
          event.currentTarget.style.setProperty("--ripple-x", `${event.clientX - box.left}px`)
          event.currentTarget.style.setProperty("--ripple-y", `${event.clientY - box.top}px`)
        }}
        onClick={() => onOpen(card)}
        className={cn("sheet relative block w-full overflow-hidden text-left", card.pinned_at && "seal")}
      >
        {card.kind === "color" ? (
          <div className="flex h-40">
            {(card.colors.length ? card.colors : [hexOf(card) ?? "var(--muted)"]).map((hex) => (
              <div key={hex} className="flex flex-1 items-end p-4" style={{ background: hex }}>
                <span className="font-sans text-[11px] tracking-[0.2em] lowercase" style={{ color: labelOn(hex) }}>
                  {hex.startsWith("#") ? hex : ""}
                </span>
              </div>
            ))}
          </div>
        ) : card.kind === "font" ? (
          <div className="px-6 py-7">
            <p className="font-display text-5xl leading-none">Aa</p>
            <h3 className="font-display mt-5 text-[15px] tracking-wide">{card.title ?? card.url}</h3>
            <span className="text-muted-foreground mt-2 block text-[10px] tracking-[0.25em] lowercase">{card.domain}</span>
          </div>
        ) : card.kind === "tweet" ? (
          <blockquote className="px-6 py-7">
            <p className="text-[14px] leading-[1.8]">{meta.description ?? card.title}</p>
            <cite className="text-muted-foreground mt-4 block text-[11px] tracking-[0.2em] not-italic lowercase">
              {meta.author ?? card.domain}
            </cite>
          </blockquote>
        ) : card.kind === "person" ? (
          <div className="flex items-center gap-4 px-6 py-7">
            {image ? (
              <Image src={image} alt="" width={56} height={56} unoptimized className="size-14 rounded-full object-cover" />
            ) : null}
            <div className="min-w-0">
              <h3 className="font-display text-[15px] tracking-wide">{card.title ?? card.note}</h3>
              {meta.description ? (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-[12px] leading-relaxed">{meta.description}</p>
              ) : null}
            </div>
          </div>
        ) : card.kind === "quote" ? (
          <blockquote className="px-6 py-7">
            <p className="font-display text-[17px] leading-[1.9]">
              <span className="text-primary">「</span>
              {card.content ?? card.note}
              <span className="text-primary">」</span>
            </p>
            {card.domain ? (
              <cite className="text-muted-foreground mt-4 block text-[11px] tracking-[0.2em] not-italic lowercase">
                {card.domain}
              </cite>
            ) : null}
          </blockquote>
        ) : card.kind === "note" ? (
          <div className="px-6 py-7">
            {card.title ? <h3 className="font-display mb-3 text-[15px] tracking-wide">{card.title}</h3> : null}
            <p className="text-[13px] leading-[1.9] whitespace-pre-wrap">{card.note}</p>
          </div>
        ) : image ? (
          <div className="relative">
            <Image
              src={image}
              alt={card.title ?? ""}
              // Link previews are wide (~1.9:1); reserving that box keeps the board from jumping when they load.
              width={card.kind === "image" ? 800 : 1200}
              height={card.kind === "image" ? 1000 : 630}
              unoptimized
              className="h-auto w-full object-cover"
            />
            {card.kind === "video" ? (
              <>
                <span className="absolute inset-0 grid place-items-center">
                  <Play className="size-9 fill-white/85 text-white/85" strokeWidth={1} />
                </span>
                {meta.duration ? (
                  <span className="absolute right-3 bottom-3 bg-black/65 px-1.5 py-0.5 font-sans text-[10px] tracking-widest text-white">
                    {clock(Number(meta.duration))}
                  </span>
                ) : null}
              </>
            ) : null}
            {card.kind === "pdf" ? (
              <span className="absolute right-3 bottom-3 flex items-center gap-1 bg-black/65 px-1.5 py-0.5 font-sans text-[10px] tracking-widest text-white">
                <FileText className="size-3" strokeWidth={1.5} /> {meta.pages ?? "?"}
              </span>
            ) : null}
            {card.kind !== "image" && card.title ? (
              <div className="border-border/70 border-t px-5 py-4">
                <h3 className="font-display line-clamp-3 text-[14px] leading-relaxed">{card.title}</h3>
                <p className="text-muted-foreground mt-2 flex gap-3 text-[10px] tracking-[0.18em] lowercase">
                  <span>{card.domain}</span>
                  {meta.price ? <span className="text-primary">{meta.price} {meta.currency}</span> : null}
                  {(card.kind === "article" || card.kind === "recipe") && meta.readingMinutes ? (
                    <span>{meta.readingMinutes}′</span>
                  ) : null}
                  {BYLINE.includes(card.kind) && meta.author ? <span className="truncate">{meta.author}</span> : null}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="px-6 py-7">
            <span className="text-muted-foreground mb-3 block text-[10px] tracking-[0.25em] lowercase">
              {card.domain ?? t("kinds", card.kind)}
            </span>
            <h3 className="font-display text-[15px] leading-relaxed">{card.title ?? card.url}</h3>
            {BYLINE.includes(card.kind) && meta.author ? (
              <p className="text-muted-foreground mt-2 text-[10px] tracking-[0.18em] lowercase">{meta.author}</p>
            ) : null}
            {meta.description ? (
              <p className="text-muted-foreground mt-3 line-clamp-3 text-[12px] leading-relaxed">{meta.description}</p>
            ) : null}
          </div>
        )}
      </button>
      <figcaption
        className={cn(
          "text-muted-foreground mt-3 flex items-center gap-2 text-[10px] tracking-[0.22em] lowercase opacity-0 transition-opacity duration-500 group-hover:opacity-100",
          !card.enriched_at && "text-primary opacity-100",
        )}
      >
        <Droplet
          expression={card.enriched_at ? "neutral" : "sleepy"}
          ink={KIND_INK[card.kind] ?? "sumi"}
          className={cn("h-3.5 w-[10px] shrink-0", !card.enriched_at && "pulse-drop")}
          motion="still"
          title={t("kinds", card.kind)}
        />
        <span className="truncate">{card.enriched_at ? (card.title ?? card.domain ?? t("kinds", card.kind)) : t("board", "settling")}</span>
      </figcaption>
    </figure>
  )
}
