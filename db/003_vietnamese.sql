-- Vietnamese search: "ca phe" must find "cà phê".
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() is only STABLE, so an index needs this immutable wrapper.
CREATE OR REPLACE FUNCTION zen_unaccent(text)
RETURNS text AS $$
  SELECT public.unaccent('public.unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT;

DROP INDEX IF EXISTS cards_text_idx;
-- array_to_string is only STABLE, so tags stay out of this index; they are
-- matched through cards_tags_idx instead.
CREATE INDEX cards_text_idx ON cards USING gin (
  to_tsvector('simple', zen_unaccent(
    coalesce(title,'') || ' ' || coalesce(note,'') || ' ' || coalesce(content,'') || ' ' || coalesce(domain,'')
  ))
);
