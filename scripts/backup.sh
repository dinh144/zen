#!/usr/bin/env bash
# Nightly backup: zen's data and its users (data only; the schema is db/*.sql), gzipped into the
# private "backups" bucket, newest 7 kept. Restore: run db/*.sql on the new database, then gunzip | psql.
set -euo pipefail
: "${DATABASE_URL:?}" "${NEXT_PUBLIC_SUPABASE_URL:?}" "${SUPABASE_SECRET_KEY:?}"
KEEP=7
name="zen-$(date -u +%Y-%m-%dT%H%M).sql.gz"
api="$NEXT_PUBLIC_SUPABASE_URL/storage/v1"
auth=(-H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY")

pg_dump --data-only --no-owner --no-privileges --schema=public --schema=auth "$DATABASE_URL" | gzip > "/tmp/$name"
curl -fsS "${auth[@]}" -H "content-type: application/gzip" --data-binary "@/tmp/$name" "$api/object/backups/$name" > /dev/null
rm "/tmp/$name"

# Names sort by date, so everything before the newest $KEEP goes.
old=$(curl -fsS "${auth[@]}" -H "content-type: application/json" -d '{"prefix":"","limit":1000,"sortBy":{"column":"name","order":"desc"}}' "$api/object/list/backups" |
  python3 -c "import sys,json; print(json.dumps([o['name'] for o in json.load(sys.stdin)][$KEEP:]))")
if [ "$old" != "[]" ]; then
  curl -fsS -X DELETE "${auth[@]}" -H "content-type: application/json" -d "{\"prefixes\":$old}" "$api/object/backups" > /dev/null
fi
echo "backed up $name"
