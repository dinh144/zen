@AGENTS.md

# zen

A visual memory: save anything, find it by describing it. Next.js 16 app in `apps/web`, shadcn UI in
`packages/ui`, MV3 extension in `extension/`. `DESIGN.md` holds the constraints and the visual rules;
read it before touching UI. `README.md` has the run and deploy steps.

## Two modes, one codebase

- **Local** (no `NEXT_PUBLIC_SUPABASE_URL`): one mind (`LOCAL_USER` in `lib/user.ts`) behind
  `ZEN_PASSWORD`, Postgres in Docker on 5434, files on disk, Ollama for tags and `bge-m3` embeddings.
- **Cloud**: Supabase Auth + Storage, Gemini, per-user data. `CLOUD` from `lib/cloud.ts` (client-safe,
  inlined at build) decides the mode everywhere.
- Copy that only holds in one mode gets a `…Cloud` twin in `lib/i18n.ts`; `translate` picks it.

## Rules that are easy to break

- Every function in `lib/cards.ts` takes `me` first and filters by `user_id`. Every API handler is
  `export const X = withUser(async (me, request, context) => …)` (`lib/user.ts`), which answers 401 for
  everyone else. Pages call `currentUser()` and redirect. Cross-table writes (spaces, links) check both ends.
- Pasted URLs are fetched with `safeFetch` (SSRF guard in the cloud). Saved article HTML goes through
  `sanitizeArticle`. Uploaded files are served from storage's origin or sandboxed.
- New cards call `spend(me)` (daily cap) before `createCard`.
- Schema changes: `npx supabase migration new <slug>` adds a file under `supabase/migrations/`,
  idempotent where practical (`IF NOT EXISTS`). Apply locally with `npx supabase db reset` — this
  wipes the local Supabase stack's data and must never be run against staging; ship to staging with
  `npx supabase db push --linked`. `db/*.sql` is now a frozen pre-CLI snapshot kept only for the
  Docker local-mode bootstrap (`README.md`); new changes go only in `supabase/migrations/`.
  `scripts/check-rls.sh` must stay green: no table with row-level security disabled or a public policy.
- Sync-friendly schema (ticket 04, so PowerSync can replicate a table to a mind's phone): scope
  a new table to the mind, directly with a `user_id` column or by joining to a table that has
  one. If it has an `updated_at` that a partial-field `UPDATE` can touch, attach the existing
  `zen_touch_updated_at()` trigger (`CREATE TRIGGER touch_updated_at BEFORE UPDATE ON <table> FOR
  EACH ROW EXECUTE FUNCTION zen_touch_updated_at();`) so it stays current no matter which write
  path touches the row; skip it for insert/delete-only tables (nothing ever updates a field).
  Keep `deleted_at` only where the table is actually soft-deleted, like `cards`; a hard-deleted
  row (`spaces`, join tables) replicates its own removal through Postgres's normal delete
  replication, no marker needed. Then add the table to `apps/api/sync-rules.yaml` if a screen
  shows it — for a table with no single-column primary key (a join table), alias a
  concatenation of its key columns as `id` in the `SELECT` instead of adding a surrogate column
  (PowerSync's own pattern for this). `apps/api/tests/test_sync_rules.py` fails the build if that
  file ends up naming a table or column the schema does not have.
- UI strings are `[vi, en]` pairs in `lib/i18n.ts`, never literals; use `useT()` or `<Pair>` from server
  components. Text colour tokens must clear AA (inks go through `INK_TEXT`).
- Motion collapses under `prefers-reduced-motion`; text fields show focus by inking their line
  (`data-ruled`), not a box.
- The zen API is the only write path for every client (web, extension, Android, iOS). Every route
  declares its request and response shapes once in `lib/schemas.ts` (zod) and validates input with
  them; `bun run openapi` regenerates the committed `apps/web/openapi.json` from those declarations.
  **API changes are additive only**: new endpoints and new optional fields are fine; removing or
  renaming a field, changing a type, or making an optional field required is a breaking change and
  CI refuses it (`oasdiff breaking` against main's committed document).

## Checks

```bash
bun run typecheck && bun run lint          # repo root
cd apps/web && bun run test                # unit (bun test lib)
bun run openapi                            # regenerate apps/web/openapi.json after a schema change
bun run e2e                                # local mode through the UI (dev server on :3000)
bun run a11y <card-id> <space-id> <token>  # 14 routes × desk/phone × light/dark, axe AA
bun run e2e:cloud                          # cloud mode: npx supabase start + a cloud build on :3002
DATABASE_URL=... scripts/check-rls.sh      # fails if a table lacks RLS or has a public policy
cd apps/api && uv run ruff check . && uv run pyright && uv run pytest   # Python API lane
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, build, the OpenAPI staleness check and
`oasdiff breaking` against main. There is no pre-commit hook on purpose: git's `core.hooksPath` points at
the machine-wide graphify hooks.

## Agent skills

### Issue tracker

Issues and specs live as local markdown under `.scratch/` (gitignored: the repo is public). See `docs/agents/issue-tracker.md`.

### Triage labels

The five default roles, recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
