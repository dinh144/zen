-- The language a mind speaks: background work (titles, summaries, cluster names) has no request to read it from.
CREATE TABLE IF NOT EXISTS user_settings (
  user_id    uuid PRIMARY KEY,
  locale     text NOT NULL DEFAULT 'vi',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
