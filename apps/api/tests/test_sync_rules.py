from pathlib import Path

from zen_api.sync_schema import load_data_queries, load_schema, missing_references

_API_DIR = Path(__file__).resolve().parents[1]
_MIGRATIONS = _API_DIR.parent.parent / "supabase" / "migrations"
_SYNC_RULES = _API_DIR / "sync-rules.yaml"


def test_sync_rules_reference_real_tables_and_columns():
    schema = load_schema(_MIGRATIONS)
    queries = load_data_queries(_SYNC_RULES)
    assert missing_references(schema, queries) == []


def test_a_bad_column_is_caught():
    """Proves the check above isn't vacuous: a made-up column must fail it."""
    schema = load_schema(_MIGRATIONS)
    bad = ["SELECT id, not_a_real_column FROM cards WHERE user_id = bucket.user_id"]
    assert missing_references(schema, bad) == ["cards.not_a_real_column"]


def test_a_bad_table_is_caught():
    schema = load_schema(_MIGRATIONS)
    bad = ["SELECT id FROM not_a_real_table WHERE user_id = bucket.user_id"]
    assert "not_a_real_table (no such table)" in missing_references(schema, bad)


def test_schema_loader_finds_known_tables_and_columns():
    """A sanity check on the loader itself, independent of sync-rules.yaml's content."""
    schema = load_schema(_MIGRATIONS)
    assert {"id", "user_id", "updated_at", "deleted_at", "embedding"} <= schema["cards"]
    assert "updated_at" in schema["spaces"]  # added by ticket 04's own migration
