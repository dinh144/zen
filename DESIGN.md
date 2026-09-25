# DESIGN.md — zen

## Constraints

- **Product**: a personal visual memory. Save anything in one gesture, find it later by
  describing it. No folders, no feeds, no social, no vanity metrics.
- **Users**: two modes from one codebase. Local: one mind per install behind `ZEN_PASSWORD`.
  Cloud (Supabase configured): many minds, each signed in by Google or an email link; every
  query is scoped to its user. Every card is private unless a space is shared by link.
- **Platform**: desktop web first, phone through PWA + share target, native Android and iOS
  apps (Kotlin/Compose and Swift/SwiftUI — see Mobile below), browser extension for capture.
- **Accessibility**: WCAG 2.1 AA. Every card is a real button, dialogs trap focus,
  `prefers-reduced-motion` turns transitions off.
- **Performance budget**: board paints in under 1s with 200 cards; capture returns before
  enrichment starts; tagging and embeddings run after the response, never in the request path.
- **Non-negotiables**: capture never blocks on the model · one mind never reads another's ·
  data exports as one JSON file · an account can delete itself and everything in it ·
  the copy never claims more privacy than the running mode gives (`…Cloud` strings).
- **Landing**: `/` when signed out (and always at `/welcome`) — tagline, five sections, the
  sixteen moods, one call to action. Same paper, same drop, no marketing gloss.
- **Known gaps**: CPU vision takes 30–120s per image locally · enrichment queue is a loop, not
  a durable queue (restart during `after()` loses that pass — `POST /api/reenrich` fixes it) ·
  no visual regression baseline yet ·
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
- **Rhythm (mymind's layout, zen's skin; Dinh, 2026-09-23)**: a full wall of cards, 1.5rem
  gutters, up to 5 columns (7 when tightened), a 44px search line. Air comes from the paper and
  the quiet chrome, not from wide gutters.
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

## Mobile

Android and iOS build the sumi-e look natively — Kotlin/Compose, Swift/SwiftUI — with no
shared UI code and no platform-default look (no Material, no iOS system chrome). This block is
written once, by the Android lane, before either app's first UI ticket; the iOS lane follows it
unchanged (zen-android spec, Implementation Decisions).

- **Touch targets**: 48dp/pt minimum on every tappable element, even where the layout stays
  sparse — the calm reads in the space around a target, not in its size.
- **Gesture map**: a tap opens with the drop's ink-flow gesture; long-press (never hover, there
  is none) reveals a card's caption and its actions; a pinch tightens the board into more
  columns and the drop turns unimpressed; a lift-away drag lets a card go and the drop turns
  scared; two fingers pan and zoom the canvas; predictive back previews the drop's reverse
  gesture as a swipe and cancels cleanly if the finger lifts before the edge.
- **Haptics map**: a soft tick when a card settles or its tags land, a firmer confirm when
  something is set down, a double tick on tie, a reject buzz on letting go of a card and when
  the AI is unreachable. Every haptic reads the system's own haptics setting first; none of
  them override it.
- **Motion per platform**: the same curve and durations as the web — `cubic-bezier(0.22, 1,
  0.36, 1)`, 300–700ms — plus springs wherever a finger is dragging something directly. Both
  apps request the display's full refresh rate. The native twin of
  `prefers-reduced-motion` (Android's animator duration scale at 0 or "remove animations";
  iOS's Reduce Motion) collapses every animation to an instant change; a drop job then shows
  as an outline instead of animating in.
- **Widget and notification styling**: widgets, tiles and notifications carry the same paper,
  ink, hairlines and radius 2dp as the app — no platform-default card chrome, no colour outside
  the twelve inks and the seal vermilion. Notification actions read lowercase and unhurried,
  the same voice as everywhere else in zen.
- **The watch**: ink on dark paper — night is the watch's only theme — with the drop as its
  complication or tile icon, still wearing its sixteen moods. The watch never signs in and
  never shows anything the phone has not handed it.
