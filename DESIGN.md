# DESIGN.md — zen

## Constraints

- **Product**: a personal visual memory. Save anything in one gesture, find it later by
  describing it. No folders, no feeds, no social, no vanity metrics.
- **Users**: two modes from one codebase. Local: one mind per install behind `ZEN_PASSWORD`.
  Cloud (Supabase configured): many minds, each signed in by Google or an email link; every
  query is scoped to its user. Every card is private unless a space is shared by link.
- **Platform**: desktop web first, phone through PWA + share target, browser extension for capture.
- **Accessibility**: WCAG 2.1 AA. Every card is a real button, dialogs trap focus,
  `prefers-reduced-motion` turns transitions off.
- **Performance budget**: board paints in under 1s with 200 cards; capture returns before
  enrichment starts; tagging and embeddings run after the response, never in the request path.
- **Non-negotiables**: capture never blocks on the model · one mind never reads another's ·
  data exports as one JSON file · an account can delete itself and everything in it ·
  the copy never claims more privacy than the running mode gives (`…Cloud` strings).
- **Landing**: `/` when signed out (and always at `/welcome`) — tagline, five sections, the
  sixteen moods, one call to action. Same paper, same drop, no marketing gloss.
- **Known gaps**: CPU vision takes 30–120s per image locally · no native iOS/Android app
  (PWA + share target instead) · enrichment queue is a loop, not a durable queue (restart during
  `after()` loses that pass — `POST /api/reenrich` fixes it) · no visual regression baseline yet ·
  cloud: video posters need ffmpeg, which Vercel lacks, so cloud videos show without a still ·
  the PWA share target posts through a function, so shared files above ~4.5 MB fail on Vercel ·
  the semantic-search cut is tuned for bge-m3 and must be retuned once Gemini embeddings run.

## Visual decisions

The name is 禅. The interface is sumi-e: ink laid on paper, one vermilion seal,
and *ma* — the empty space that makes the marks legible. Nothing here is borrowed
from the product we studied; the study lives in `docs/mymind-inventory.md`.

- **Paper first.** Light is the default theme (`#F4F1EA` washi, sheets `#FBF9F4`),
  because ink on paper is the metaphor. Dark is the same ink at night (`#14120F`),
  not a different product.
- **Palette**: ink `#1A1A18`, paper `#F4F1EA`, hairline `#DED7C8`, muted ink `#6F6A5F`,
  seal vermilion `#B23A2F` (`#D3645A` at night; every ink is re-lit per theme to clear AA, `INK_TEXT` in `lib/drop.ts`). One accent, used for the seal, the
  quote brackets and focus rings — never for buttons in bulk.
- **Type**: `Zen Old Mincho` for anything that speaks (search line, titles, notes,
  quotes, reading mode) and `Zen Kaku Gothic New` 300/400 for labels and chrome.
  The family carries the name; no italics anywhere. Labels are lowercase with
  0.2–0.25em tracking, set small.
- **Grain**: a fractal-noise layer over the whole page (`multiply` on paper,
  `soft-light` at night) so the background reads as fibre, not as a flat fill.
- **Shape and surfaces**: radius 2px. A card is a `.sheet` — hairline border, a single
  1px ink shadow, lifting 2px on hover. No ring stacks, no gradients, no glass.
- **Ma**: 2.25rem gutters between cards, 3–4 masonry columns instead of 5–6, 4rem of
  air above the search line. Density is a choice, not the default (`tighten the board`).
- **The drop**: zen's mark is a drop of ink with a face (silhouette drawn here; the idea
  is borrowed from bloub.vercel.app, the geometry is not). It falls in on load, squashes
  on landing, then breathes. Hovering it sends a ring out, the way a drop does on water.
  A pinned card is stamped with the vermilion seal square; 禅 sits behind the header at
  4.5% opacity.
- **Twelve inks**: sumi, earth, vermilion, persimmon, saffron, moss, jade, indigo,
  wisteria, plum, stone, shell. The chosen ink repaints `--primary` and the favicon, and
  every card kind carries its own ink on the caption drop.
- **Sixteen moods**, each bound to a real state — neutral (resting), attentive (search
  focused), curious (typing), surprised (results), confused (nothing found), excited
  (saved), happy (tags landed), laughing (a mark earned), proud (a space), sleepy (drift,
  and a card still settling), shy (a shared space), suspicious (the password screen), sad
  (wrong password), scared (letting go), angry (Ollama is down), unimpressed (the board
  tightened).
- **Motion**: 300–700ms, `cubic-bezier(0.22, 1, 0.36, 1)`. Catalogue: page-in, card settle
  with a 45ms stagger from an IntersectionObserver, ripple from the point of a click, ink
  bloom when a card's tags land, seal stamp, drift float, let-go lift, ink line under the
  search field, nav underline draw, rail lift, image lean on hover, dialog rise, reading
  progress column, pulsing drop while something is thinking. Every one of them collapses
  under `prefers-reduced-motion`.
- **Two languages**: Vietnamese is the default, English is one click away (`Settings → ngôn ngữ`,
  or the toggle on the landing page). The Zen family carries no Vietnamese diacritics, so
  `html[lang="vi"]` swaps the pair to Noto Serif + Be Vietnam Pro. Search folds accents both
  ways (`ca phe` finds `cà phê`), colour words and date phrases work in Vietnamese, and the
  model is asked for Vietnamese tags plus their English equivalents.
- **Voice**: lowercase, unhurried, no product nouns. `drift` (not Serendipity),
  `at hand` (not Top of Mind), `brush` (focus writing), `ink` (the composer),
  `same air` (related), `tie` / `untie` (links), `keep` / `let go`, `set it down` (save),
  `settling…` while a card is being read, `marks` (achievements), `seal` (app icon).
- **Do**: leave space; let a card be one object; show the caption only on hover; write
  in lower case; keep one accent.
- **Don't**: giant italic display type, orange accents, five-column grids, rounded
  cards, shadows as decoration, exclamation marks, counters, streaks, tours.
