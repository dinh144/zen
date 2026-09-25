import os

# The Supabase project's API URL, e.g. http://127.0.0.1:55000 locally or https://xyz.supabase.co
# in the cloud. Access tokens are verified against this project's published signing keys.
SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")

# Direct connection to Postgres (the API runs as the table owner, bypassing RLS, like the TS server).
DATABASE_URL = os.environ["DATABASE_URL"]

# Daily cards a mind may create; each new card spends one before it is stored.
DAILY_CARDS = int(os.environ.get("ZEN_DAILY_CARDS", "500"))
