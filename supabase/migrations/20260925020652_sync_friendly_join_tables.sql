-- Ticket 04, continued: PowerSync's sync rules cannot JOIN in a data query (verified against
-- @powersync/service-sync-rules, the engine PowerSync Open Edition runs: it rejects a data
-- query that reads more than one table with "Must SELECT from a single table"). card_spaces,
-- card_links, card_entities and card_clusters have no user_id of their own, so the by_mind
-- bucket in apps/api/sync-rules.yaml could not scope them by joining out to cards or clusters
-- the way an earlier draft of that file did.
--
-- Each gains a user_id, stamped from the card it points at by a BEFORE INSERT trigger, so every
-- existing insert path keeps working unmodified (the one exception — card_clusters' bare
-- `VALUES (a, b)` inserts in apps/web/lib/clusters.ts, which a 3rd column would have broken by
-- position — now names its columns; same values, same behaviour). Both ends of a tie or a
-- membership are already the same mind's before the row is written (the both-ends ownership
-- checks in apps/web/lib/cards.ts), so deriving from one end is enough.

ALTER TABLE card_spaces ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE card_spaces cs SET user_id = c.user_id FROM cards c WHERE c.id = cs.card_id AND cs.user_id IS NULL;
ALTER TABLE card_spaces ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS card_spaces_user_idx ON card_spaces (user_id);

ALTER TABLE card_links ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE card_links cl SET user_id = c.user_id FROM cards c WHERE c.id = cl.from_id AND cl.user_id IS NULL;
ALTER TABLE card_links ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS card_links_user_idx ON card_links (user_id);

ALTER TABLE card_entities ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE card_entities ce SET user_id = c.user_id FROM cards c WHERE c.id = ce.card_id AND ce.user_id IS NULL;
ALTER TABLE card_entities ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS card_entities_user_idx ON card_entities (user_id);

ALTER TABLE card_clusters ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE card_clusters cc SET user_id = c.user_id FROM cards c WHERE c.id = cc.card_id AND cc.user_id IS NULL;
ALTER TABLE card_clusters ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS card_clusters_user_idx ON card_clusters (user_id);

CREATE OR REPLACE FUNCTION zen_stamp_card_spaces_owner()
RETURNS trigger AS $$
BEGIN
  NEW.user_id = (SELECT user_id FROM cards WHERE id = NEW.card_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS stamp_owner ON card_spaces;
CREATE TRIGGER stamp_owner BEFORE INSERT ON card_spaces
  FOR EACH ROW EXECUTE FUNCTION zen_stamp_card_spaces_owner();

CREATE OR REPLACE FUNCTION zen_stamp_card_links_owner()
RETURNS trigger AS $$
BEGIN
  NEW.user_id = (SELECT user_id FROM cards WHERE id = NEW.from_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS stamp_owner ON card_links;
CREATE TRIGGER stamp_owner BEFORE INSERT ON card_links
  FOR EACH ROW EXECUTE FUNCTION zen_stamp_card_links_owner();

CREATE OR REPLACE FUNCTION zen_stamp_card_entities_owner()
RETURNS trigger AS $$
BEGIN
  NEW.user_id = (SELECT user_id FROM cards WHERE id = NEW.card_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS stamp_owner ON card_entities;
CREATE TRIGGER stamp_owner BEFORE INSERT ON card_entities
  FOR EACH ROW EXECUTE FUNCTION zen_stamp_card_entities_owner();

CREATE OR REPLACE FUNCTION zen_stamp_card_clusters_owner()
RETURNS trigger AS $$
BEGIN
  NEW.user_id = (SELECT user_id FROM cards WHERE id = NEW.card_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS stamp_owner ON card_clusters;
CREATE TRIGGER stamp_owner BEFORE INSERT ON card_clusters
  FOR EACH ROW EXECUTE FUNCTION zen_stamp_card_clusters_owner();
