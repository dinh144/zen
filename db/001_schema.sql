CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS cards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        text NOT NULL DEFAULT 'note',
  title       text,
  url         text,
  domain      text,
  note        text,
  content     text,
  image_path  text,
  meta        jsonb NOT NULL DEFAULT '{}',
  colors      text[] NOT NULL DEFAULT '{}',
  tags        text[] NOT NULL DEFAULT '{}',
  embedding   vector(1024),
  enriched_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE INDEX IF NOT EXISTS cards_created_idx ON cards (created_at DESC);
CREATE INDEX IF NOT EXISTS cards_tags_idx ON cards USING gin (tags);
CREATE INDEX IF NOT EXISTS cards_colors_idx ON cards USING gin (colors);
CREATE INDEX IF NOT EXISTS cards_text_idx ON cards USING gin (
  to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(note,'') || ' ' || coalesce(content,'') || ' ' || coalesce(domain,''))
);
CREATE INDEX IF NOT EXISTS cards_embedding_idx ON cards USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS spaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  share_token text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_spaces (
  card_id  uuid REFERENCES cards(id) ON DELETE CASCADE,
  space_id uuid REFERENCES spaces(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, space_id)
);

-- mymind's "unlock features" gamification: one row per unlocked achievement.
CREATE TABLE IF NOT EXISTS achievements (
  key         text PRIMARY KEY,
  unlocked_at timestamptz NOT NULL DEFAULT now()
);
