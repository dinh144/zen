-- The knowledge graph and the agent's memory (grill 2026-09-23, after Anthropic's KG playbook).
-- Entities are extracted from cards; relations carry the card they came from (provenance).

CREATE TABLE IF NOT EXISTS entities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  name        text NOT NULL,           -- canonical: the most complete form
  type        text NOT NULL,           -- person | place | organization | product | food | topic | event | work
  description text,                    -- one line, the disambiguation signal for resolution
  summary     text,                    -- hub profile, written once the entity is in several cards
  key_facts   jsonb NOT NULL DEFAULT '[]',
  embedding   vector(1024),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, name)
);
CREATE INDEX IF NOT EXISTS entities_user_idx ON entities (user_id);

-- Every surface form ("Đà Nẵng", "Da Nang", "DN") points at one canonical entity.
CREATE TABLE IF NOT EXISTS aliases (
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  alias     text NOT NULL,
  PRIMARY KEY (entity_id, alias)
);
CREATE INDEX IF NOT EXISTS aliases_folded_idx ON aliases (zen_unaccent(lower(alias)));

-- Which cards mention which entities.
CREATE TABLE IF NOT EXISTS card_entities (
  card_id   uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, entity_id)
);
CREATE INDEX IF NOT EXISTS card_entities_entity_idx ON card_entities (entity_id);

-- Subject–predicate–object triples, each traceable to the card it was read from.
CREATE TABLE IF NOT EXISTS relations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  source_id  uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_id  uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  predicate  text NOT NULL,
  card_id    uuid REFERENCES cards(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, target_id, predicate, card_id)
);
CREATE INDEX IF NOT EXISTS relations_source_idx ON relations (source_id);
CREATE INDEX IF NOT EXISTS relations_target_idx ON relations (target_id);

-- Which extraction prompt read a card, so a schema change can find what to re-read.
ALTER TABLE cards ADD COLUMN IF NOT EXISTS extracted_at timestamptz;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS extract_version int;
-- When a card should surface again (a ticket's date, a recipe for the weekend).
ALTER TABLE cards ADD COLUMN IF NOT EXISTS resurface_at timestamptz;

-- Clusters on the ink-pool map: machine-made (Louvain, fixed seed) or pinned to one of the user's spaces.
CREATE TABLE IF NOT EXISTS clusters (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  name       text,
  space_id   uuid REFERENCES spaces(id) ON DELETE CASCADE,  -- set: a pinned cluster
  summary    text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS clusters_user_idx ON clusters (user_id);
CREATE TABLE IF NOT EXISTS card_clusters (
  card_id    uuid NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  cluster_id uuid NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, cluster_id)
);

-- Everything the agent did on its own, with what it takes to undo it.
CREATE TABLE IF NOT EXISTS agent_log (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  action     text NOT NULL,
  summary    text NOT NULL,
  undo       jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  undone_at  timestamptz
);
CREATE INDEX IF NOT EXISTS agent_log_user_idx ON agent_log (user_id, created_at DESC);

-- What a grill taught the agent ("cafés are not food"): never asked again.
CREATE TABLE IF NOT EXISTS agent_rules (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  question   text NOT NULL,
  answer     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Open questions the drop is holding for the user (grilling), answered or not.
CREATE TABLE IF NOT EXISTS agent_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  topic       text NOT NULL,
  question    text NOT NULL,
  options     jsonb NOT NULL,          -- [{label, detail}], the first one recommended
  answer      text,
  asked_at    timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz
);
CREATE INDEX IF NOT EXISTS agent_questions_open_idx ON agent_questions (user_id) WHERE answered_at IS NULL;

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_questions ENABLE ROW LEVEL SECURITY;
