-- Spaces nest like folders: a space may sit inside another. Deleting a parent lifts its children to the top.
ALTER TABLE spaces ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES spaces(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS spaces_parent_idx ON spaces (parent_id);
