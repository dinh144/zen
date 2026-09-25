-- Many minds on one database: every card, space and mark belongs to one user.
-- Existing rows go to the local single user (the id zen uses when Supabase is off).
ALTER TABLE cards ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE cards ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE spaces ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE achievements ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_pkey;
ALTER TABLE achievements ADD PRIMARY KEY (user_id, key);

CREATE INDEX IF NOT EXISTS cards_user_created_idx ON cards (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS spaces_user_idx ON spaces (user_id);

-- The app reaches Postgres as the table owner and scopes every query by user_id itself.
-- RLS with no policies shuts the Supabase Data API (anon / authenticated keys) out entirely.
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
