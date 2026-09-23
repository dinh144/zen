# mymind — feature and interface inventory

Read off the running app (access.mymind.com, logged in) and mymind.com/pricing
on 2026-09-22. "MASTERMIND" marks features mymind lists as paid-tier only.
The last column is what `zen` in this repo does today.

## Capture

| Feature | zen |
|---|---|
| Browser extension: Chrome, Edge, Safari — one-click save of the current page | yes (MV3, Chrome/Edge) |
| Text Clippings — highlight, right click, save passage as a quote (MASTERMIND) | yes |
| Save image from a page (right click) | yes |
| Quick Note — sticky-note capture, always reachable | yes (composer card) |
| Focus Mode — full-screen editor for longer drafts | yes (`/focus`) |
| iOS app, Android app, macOS app; share sheet; instant sync | PWA + share target (no native apps) |
| Video and GIF upload, 4K up to 500 MB (MASTERMIND) | yes: poster frame, duration, inline player |
| PDF save + analysis, AI tags, indexed summary | yes: page text, page count, first-page preview, tags |
| Unlimited cards on paid plans (MASTERMIND) | unlimited |
| Custom iOS icons (MASTERMIND) | twelve inks repaint the tab icon (Settings → your drop); the installed PWA icon stays sumi |

## What a card can be

note · quote / text clipping · link / bookmark · article · product · book · movie ·
recipe · image · GIF / video · PDF · colour + palette · font · tweet · person / contact

mymind renders each kind differently ("No URL is treated the same"): a product shows the
price, a book its author, an article its reading time, a colour its swatch, a quote big
serif type.

## Automatic processing

| Feature | zen |
|---|---|
| Intelligent Bookmarks — detects article / product / book / recipe from the URL | yes |
| AI image tagging on every image (MASTERMIND) | yes (qwen2.5vl) |
| Image text recognition — memes, screenshots, handwriting (MASTERMIND) | yes (OCR into `content`) |
| AI summaries of image, article, website (MASTERMIND) | yes (`meta.summary`) |
| Advanced AI — expanded tagging and search (MASTERMIND) | one model, no tier |
| Reading Mode — article stripped of ads and clutter | yes (`/read/<id>`) |
| Article backup — full article kept even if the source dies | yes (`article_html`) |
| Same Vibe — find images with a similar mood, instant moodboards | yes (`/vibe/<id>`) |
| Colour extraction from images | yes (sampled from pixels) |

## Finding things

| Feature | zen |
|---|---|
| One search field, no folders — "your personal search engine" | yes |
| Search by keyword, colour, brand, date | keyword, colour, date (`after:`/`before:`/"last week"), `#tag`, `is:`, `site:` |
| Advanced Image Search — object, colour, detail, theme, style, text inside an image | yes, through tags + OCR + palette |
| Associative search with visual cues | semantic search on embeddings |
| Smart Spaces — collections that auto-group around a search, theme or tag | yes (space with a query) |
| Serendipity — slow resurfacing of old cards; Keep or Forget | yes, with Keep and Forget |
| Top of Mind — pinned priorities shown on every open | yes |
| Bidirectional linking between notes | yes (both ends) |

## Interface

- **Board**: masonry, cards keep their own height, caption (title or domain) under the card.
- **Search**: giant italic serif field at the top left, `Louize` italic 70px, colour `#748297`,
  no box, no button, placeholder "Search my mind…". Typing anywhere focuses it.
- **Top right nav**: `Everything` · `Spaces` · `Serendipity`, plus an orange
  "Unlock features" link to `/achievements`.
- **Left rail** (16px wide, fixed): vertical `my mind` wordmark at the top; at the bottom
  a magic/serendipity icon, night-mode toggle, colour, grid density, settings.
- **Routes**: `/everything` `/spaces` `/serendipity` `/achievements` `/account` `/pricing`.
- **Palette**: background `#14161E`, card `#1D1E28`, notification / accent `#FF5924`,
  secondary surface `#333445`, muted text `#748297`. Radius 6px. Body font Nunito.
- **Night mode**: dark and light on desktop; mobile follows the system.
- **Onboarding**: a "Start here today" checklist card, a reminder card, and tutorial cards
  (article, video, extension, mobile app) seeded into an empty mind.
- **Gamification**: achievements page that unlocks features as you save more.

## Stance (the product's own promises)

No social features · no vanity metrics · no invasive tracking · no social pressure ·
no collaboration · no ads · independent, member-funded · private by default.
