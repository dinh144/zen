-- Top of Mind: pinned cards sit above the board.
ALTER TABLE cards ADD COLUMN IF NOT EXISTS pinned_at timestamptz;

-- Reading Mode + article backup: the cleaned article, kept even if the source dies.
-- seen_at: the last time Serendipity showed this card, so it does not repeat.
ALTER TABLE cards ADD COLUMN IF NOT EXISTS article_html text;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS seen_at timestamptz;

-- Smart Spaces: a space can be a saved query instead of a manual pile.
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS query text;

-- Bidirectional linking between notes.
CREATE TABLE IF NOT EXISTS card_links (
  from_id uuid REFERENCES cards(id) ON DELETE CASCADE,
  to_id   uuid REFERENCES cards(id) ON DELETE CASCADE,
  PRIMARY KEY (from_id, to_id)
);

CREATE INDEX IF NOT EXISTS cards_pinned_idx ON cards (pinned_at DESC NULLS LAST);
