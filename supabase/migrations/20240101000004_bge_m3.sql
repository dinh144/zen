-- bge-m3 is multilingual (Vietnamese and English meet in one space) and 1024-wide.
-- Old 768-wide nomic vectors cannot be converted: clear them and run POST /api/reenrich?all=1.
DROP INDEX IF EXISTS cards_embedding_idx;
ALTER TABLE cards ALTER COLUMN embedding TYPE vector(1024) USING NULL;
CREATE INDEX IF NOT EXISTS cards_embedding_idx ON cards USING hnsw (embedding vector_cosine_ops);
