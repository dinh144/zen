# zen API

The Python rewrite of zen's server (FastAPI). See `CLAUDE.md` at the repo root for the rewrite's
status and `.scratch/zen-api/spec.md` for the full plan.

## Run it

1. `npx supabase start` (repo root) — a local Supabase stack on 54321/54322.
2. `cd apps/api && uv sync`
3. `SUPABASE_URL=http://127.0.0.1:54321 DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres uv run uvicorn app.main:app --reload`

`SUPABASE_URL` is the stack's API URL (bearer tokens are verified against its published signing
keys); `DATABASE_URL` is a direct Postgres connection — the API connects as the table owner and
scopes every query by the mind's id itself, the same way `apps/web` does.

## Checks

```bash
uv run ruff check . && uv run ruff format --check .
uv run pyright
uv run pytest                        # HTTP-level, against a real Supabase stack (env above)
uv run python scripts/gen_openapi.py     # regenerate the committed openapi.json after a route change
uv run python scripts/check_contract.py  # staleness + oasdiff breaking against apps/web/openapi.json
```

Tests only touch data they create themselves: never point `DATABASE_URL` at a stack holding real
cards. `oasdiff-exceptions.md` lists the reviewed, intentional breaking changes.
