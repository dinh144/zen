# zen

Ink on paper for everything you want to keep: paste a link, drop an image, write a
line. Tagging, OCR, colour extraction and semantic search run locally on Ollama —
nothing leaves the machine.

The interface is sumi-e: washi paper, one vermilion seal, and the empty space
between. zen's mark is a drop of ink with a face — twelve inks, sixteen moods, each
bound to something the app is actually doing. `DESIGN.md` holds the rules.

Vietnamese by default, English one click away. A landing page lives at `/welcome`.

## Run it

1. `docker compose up -d` — Postgres 17 + pgvector on port 5434.
2. `for f in db/*.sql; do docker compose exec -T db psql -U zen -d zen < $f; done` — once, in that order.
3. `ollama pull qwen2.5vl:3b && ollama pull qwen2.5:3b && ollama pull bge-m3` — vision, text, multilingual embeddings.
4. `cp .env.example apps/web/.env.local`
5. `bun install && bun dev` — http://localhost:3000

Set `ZEN_PASSWORD` in `.env.local` to lock the app behind one password.
Set `NEXT_PUBLIC_API_URL` to point the web app at a separately-hosted zen API (empty means this
app's own `/api`, same origin); switching or rolling back is that one variable.
Without Ollama running, capture and keyword search still work; tags and
semantic search stay empty until you run `POST /api/reenrich`.

## Run it in the cloud

The same code runs many minds on Supabase + Gemini + Vercel when the cloud variables in
`.env.example` are set. Each step below needs an account; nothing here runs without them.

1. Supabase project → `npx supabase link` then `npx supabase db push` (or run `supabase/migrations/*.sql`
   in order via the SQL editor). Never `supabase db reset` against it — that wipes the database.
2. Storage → create private buckets `uploads` (50 MB limit) and `backups`.
3. Auth → URL configuration: site URL = the Vercel URL, redirect URL = `<site>/auth/callback`.
   Providers → Google (OAuth client from Google Cloud) and Email. Set a custom SMTP sender:
   Supabase's built-in mailer only reaches the project's own team.
4. Google AI Studio → `GEMINI_API_KEY`.
5. Vercel → import the repo, root `apps/web`, add the cloud variables plus `DATABASE_URL`
   (Supabase pooler, transaction mode). Deploy.
6. GitHub → repository secrets `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`
   for the nightly `backup` workflow (keeps 7 dumps in the `backups` bucket).

Restore a backup: `npx supabase db push` on the new database, then `gunzip -c zen-*.sql.gz | psql "$DATABASE_URL"`.
Test the cloud mode locally with `npx supabase start` (config and migrations in `supabase/`).

## What it does

| | |
|---|---|
| Capture | Paste, drop, type, upload, Focus Mode, mobile share sheet, browser extension |
| Card kinds | note, quote, link, article, image, video (poster + player), pdf (page text + preview), product, book, movie, recipe, tweet, person, colour, font, file |
| Automatic | title, description, price, author, reading time, tags, OCR text, palette, embedding |
| Automatic, cont. | Reading Mode copy of every article, kept even if the source dies |
| Find | one search field: plain words (semantic), colours, dates, `#tag`, `is:kind`, `site:domain`, `after:`/`before:` |
| Spaces | group cards by hand, or a Smart Space that fills itself from a search; share by public link |
| Top of Mind | pin a few cards above the board |
| Links | link any two cards; both ends show the link |
| Same Vibe | a moodboard grown from one card's embedding |
| Serendipity | old cards, shuffled — Keep or Forget |
| Own your data | `/api/export` JSON out, `/api/import` for bookmarks, Pocket, Raindrop |

## Browser extension

`chrome://extensions` → Developer mode → Load unpacked → `extension/`.
Save page (Ctrl+Shift+S), save selection as a quote, save image, save link.
Set the endpoint in the popup if the app is not on `localhost:3000`.

## Layout

```
apps/web              Next.js 16 app, API routes, UI
packages/ui           shadcn components (base-nova)
supabase/migrations   schema, as Supabase CLI migrations (db/*.sql: frozen pre-CLI snapshot, Docker only)
extension/            MV3 browser extension
```
