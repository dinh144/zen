-- Ticket 04: sync-friendly schema.
--
-- PowerSync (verified against its docs, 2026-09-25):
--   * replicating deletes needs only a REPLICA IDENTITY, which Postgres derives from a
--     table's own PRIMARY KEY. Every synced table here already has one (cards, spaces,
--     entities, relations, clusters, agent_log, agent_rules, agent_questions, user_settings
--     each have a real PK; the join tables card_spaces, card_links, card_entities,
--     card_clusters and achievements have a composite PK). Nothing to migrate for deletes.
--   * the client-side "id" PowerSync wants is a single text column, but it does not have to
--     be a physical column: the documented pattern for a composite-key table is to
--     concatenate the key columns in the sync rule's SELECT (e.g. `a || ':' || b as id`).
--     card_spaces, card_links, card_entities, card_clusters and achievements use that in
--     apps/api/sync-rules.yaml instead of gaining a surrogate id column here.
-- So the only real gap is "updated-at kept current on every write": grepping apps/web shows
-- several UPDATE statements on cards, and the only write paths on spaces, agent_log and
-- agent_questions, that never touch updated_at. A trigger closes that for every write path,
-- present and future (the Python API included), instead of trusting every call site to
-- remember it.

CREATE OR REPLACE FUNCTION zen_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE spaces ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE agent_log ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE agent_questions ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS touch_updated_at ON cards;
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION zen_touch_updated_at();

DROP TRIGGER IF EXISTS touch_updated_at ON spaces;
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON spaces
  FOR EACH ROW EXECUTE FUNCTION zen_touch_updated_at();

DROP TRIGGER IF EXISTS touch_updated_at ON entities;
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION zen_touch_updated_at();

DROP TRIGGER IF EXISTS touch_updated_at ON agent_log;
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON agent_log
  FOR EACH ROW EXECUTE FUNCTION zen_touch_updated_at();

DROP TRIGGER IF EXISTS touch_updated_at ON agent_questions;
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON agent_questions
  FOR EACH ROW EXECUTE FUNCTION zen_touch_updated_at();

DROP TRIGGER IF EXISTS touch_updated_at ON user_settings;
CREATE TRIGGER touch_updated_at BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION zen_touch_updated_at();
