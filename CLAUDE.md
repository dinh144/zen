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
- Sync-friendly schema (ticket 04, so PowerSync can replicate a table to a mind's phone): give a
  new table its own `user_id` column — PowerSync's sync rules cannot `JOIN`, so a data query
  must scope by a column on the one table it reads; if the mind is only reachable through a
  parent row (a join table like `card_spaces`), add `user_id` anyway and a `BEFORE INSERT`
  trigger that stamps it from the parent (see `zen_stamp_card_spaces_owner()` for the pattern),
  and give the table an explicit column list on every `INSERT` so a later added column never
  shifts a positional `VALUES` (`card_clusters`' inserts had to be fixed for exactly this).
  If it has an `updated_at` that a partial-field `UPDATE` can touch, attach the existing
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
- **The server is being rewritten in Python** (`apps/api`, FastAPI + Supabase JWT auth; see
  `apps/api/README.md` and `.scratch/zen-api/spec.md`). Once a route lands there it is the only
  write path for every client (web, extension, Android, iOS); until then the TS routes below still
  serve it. **`apps/web`'s TypeScript API routes (`app/api/*`) are frozen to bug fixes** for the
  rest of this rewrite — no new endpoints or fields go there. `apps/web` itself is moving to UI
  only, calling `apps/api` with the signed-in mind's token.
- The zen API is the only write path for every client. Every route declares its request and
  response shapes once — `apps/web/lib/schemas.ts` (zod) for the frozen TS routes, Pydantic models
  in `apps/api/app` for the Python ones — and validates input with them; `bun run openapi`
  (`apps/web`) and `uv run scripts/gen_openapi.py` (`apps/api`) regenerate the committed documents
  from those declarations. **API changes are additive only**: new endpoints and new optional fields
  are fine; removing or renaming a field, changing a type, or making an optional field required is
  a breaking change. The committed `apps/web/openapi.json` is the one contract both servers keep;
  CI refuses a break in either direction (`oasdiff breaking`, with `apps/api/oasdiff-exceptions.md`
  listing the two reviewed exceptions: the password login route and cookie auth, both retired with
  local mode).

## Checks

```bash
bun run typecheck && bun run lint          # repo root
cd apps/web && bun run test                # unit (bun test lib)
bun run openapi                            # regenerate apps/web/openapi.json after a schema change
bun run e2e                                # local mode through the UI (dev server on :3000)
bun run a11y <card-id> <space-id> <token>  # 14 routes × desk/phone × light/dark, axe AA
bun run e2e:cloud                          # cloud mode: npx supabase start + a cloud build on :3002
DATABASE_URL=... scripts/check-rls.sh      # fails if a table lacks RLS or has a public policy

cd apps/api && uv run ruff check . && uv run pyright && uv run pytest   # Python: lint + types + tests
uv run uvicorn app.main:app --reload                   # run against a Supabase stack (see apps/api/README.md)
uv run python scripts/check_contract.py                 # staleness + oasdiff breaking (apps/web/openapi.json)
cd apps/api && docker build .                            # the container CI builds on every PR
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, build, the OpenAPI staleness check and
`oasdiff breaking` against main. `.github/workflows/api-ci.yml` runs the Python checks above plus the
container build on every push and pull request. There is no pre-commit hook on purpose: git's
`core.hooksPath` points at the machine-wide graphify hooks.

## Agent skills

### Issue tracker

Issues and specs live as local markdown under `.scratch/` (gitignored: the repo is public). See `docs/agents/issue-tracker.md`.

### Triage labels

The five default roles, recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
