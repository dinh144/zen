#!/usr/bin/env bash
# The app connects as the table owner and scopes every query by user_id itself (see CLAUDE.md's
# "mind first" rule); RLS with zero policies is what shuts Supabase's Data API (anon /
# authenticated keys) out of every table. This fails if a table skips RLS, or a policy reopens
# one to those public-facing roles. Usage: DATABASE_URL=postgres://... scripts/check-rls.sh
set -euo pipefail
: "${DATABASE_URL:?}"

bad=$(psql "$DATABASE_URL" -tA -c "
  select 'RLS disabled: ' || relname from pg_class
    join pg_namespace n on n.oid = relnamespace
    where n.nspname = 'public' and relkind = 'r' and not relrowsecurity
  union all
  select 'public policy: ' || tablename || '.' || policyname from pg_policies
    where schemaname = 'public' and roles && array['public','anon','authenticated']::name[]
")

if [ -n "$bad" ]; then
  echo "$bad"
  exit 1
fi
echo "RLS check passed: every public table has row-level security enabled, no public policy."
