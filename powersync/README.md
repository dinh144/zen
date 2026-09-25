# PowerSync (local, ticket web-4)

Dinh's project scope for this rewrite runs everything locally — no cloud accounts, no paid
programs. This stands up **PowerSync Open Edition** (self-hosted, MIT-licensed) in Docker as the
local equivalent of "a PowerSync Cloud Free instance connected to staging" from the spec. Same
sync rules, same JWT verification, same per-mind bucket isolation — just no PowerSync Cloud
account and no production deploy.

## Run it

1. The target Supabase stack must be running (`npx supabase start`, repo root, or an agent's own
   isolated stack) with `wal_level=logical` — Supabase's CLI stack has this by default.
2. One-time per Postgres instance: `docker exec <db container> psql -U postgres -c "CREATE PUBLICATION powersync FOR ALL TABLES;"`
   (PowerSync's replication slot needs this; the container is `supabase_db_<project_id>`).
3. `cp .env.example .env` — override `SUPABASE_NETWORK` if not targeting the shared "zen" stack
   (see the comment in `.env.example`; every Supabase CLI stack aliases its db/kong containers to
   plain `db`/`kong` on its own network, so nothing else needs to change).
4. `docker compose up -d` from this directory.
5. The sync rules deployed are `apps/api/sync-rules.yaml` itself (bind-mounted, read-only) — no
   copy to keep in sync. Changing that file needs `docker compose restart powersync` (sync rules
   are not hot-reloaded).

## What's deployed and verified

- `service.yaml`: replication from the target Postgres, PowerSync's own Postgres bucket-storage
  database (`ps-storage`, never the Supabase stack), and `client_auth` verifying Supabase Auth
  tokens against that stack's JWKS endpoint (`GET /auth/v1/.well-known/jwks.json`) — confirmed on
  a fresh `supabase start` (CLI 2.117.0) to already return an ES256 asymmetric key with no HS256
  fallback, matching `apps/api/app/auth.py`. This is the "notice about projects created after
  25/11/2024" the ticket names: current Supabase CLI stacks are past it by default.
- `apps/api/sync-rules.yaml` (zen-api lane, ticket api-4): one bucket per mind, keyed by the
  token's subject, covering the 14 tables a screen reads today, excluding `embedding` columns and
  server-only tables (`usage`, `aliases`).
- `verify/`: a scripted PowerSync client (`@powersync/node`) proving isolation end to end — see
  its own comment header for exact commands. Run against two test minds seeded with distinct
  cards (one embedding each) on an isolated stack:
  - each mind's client received only its own card, never the other's;
  - the raw synced row (`ps_data__cards`, the SDK's unfiltered wire data — not just this script's
    own column list) never carried an `embedding` key;
  - no `ps_data__usage` or `ps_data__aliases` table was ever created (nothing excluded synced);
  - the same check fails loudly when pointed at data that *should* trip it (verified by rerunning
    a mind's own title as the "forbidden" argument) — the check isn't vacuous.

## Idle behaviour

The ticket's original criterion is PowerSync Cloud Free-specific; this setup doesn't use PowerSync
Cloud, so it doesn't apply here — recorded anyway, for whenever a real cloud deploy happens:

- **PowerSync Cloud Free**: an instance with no deploys or client connections for 7 days is
  deprovisioned. It can be restarted from the PowerSync dashboard; the sync rules need
  redeploying, but no data is lost (replication resumes from Postgres, not from PowerSync's own
  state).
- **Supabase free project**: also pauses after about 7 days of low activity, independently of
  PowerSync. Resumed from the Supabase dashboard; a paused project answers no requests (including
  PowerSync's replication and JWKS lookups) until resumed.
- **This local setup**: the `powersync` container has no such timeout — it runs as long as Docker
  runs it, same as `supabase_db_*`. Bringing the Supabase stack back up after a Docker restart
  (`npx supabase start` recreates the same containers if not removed) resumes replication
  automatically; no reconfiguration needed unless the publication was dropped with the database.

## Connection details for the native lanes (no secrets)

- **Sync endpoint**: `http://<host>:8090` locally (`PS_PORT` in `.env`); the phone lanes' own dev
  setup decides how that's reached from a device/emulator (e.g. `10.0.2.2:8090` on the Android
  emulator, the host's LAN IP on a real device).
- **Auth**: send the mind's Supabase access token as a bearer token, exactly as `apps/api` expects
  it — PowerSync verifies it itself against the same JWKS, no separate PowerSync credential.
- **Buckets**: one bucket (`by_mind`), automatically scoped to the signed-in mind's `sub` claim —
  a client never requests a bucket by name.
- **Schema**: build the client's local `Schema`/`Table` declarations from `apps/api/sync-rules.yaml`'s
  column lists (the source of truth); `apps/api/tests/test_sync_rules.py` already keeps that file
  honest against the real Postgres schema.
