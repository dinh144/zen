import os

# The Supabase project's API URL, e.g. http://127.0.0.1:55000 locally or https://xyz.supabase.co
# in the cloud. Access tokens are verified against this project's published signing keys.
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")

# Direct connection to Postgres (the API runs as the table owner, bypassing RLS, like the TS server).
DATABASE_URL = os.environ["DATABASE_URL"]

# Comma-separated emails allowed to use the API. Empty (the default, including production) means
# every verified mind is accepted; set only on staging (mirrors apps/web/lib/allowlist.ts).
ALLOWLIST = {e.strip().lower() for e in os.environ.get("ZEN_ALLOWLIST", "").split(",") if e.strip()}

# Daily cards a mind may create; each new card spends one before it is stored.
DAILY_CARDS = int(os.environ.get("ZEN_DAILY_CARDS", "500"))
