"""Checks apps/api/sync-rules.yaml against the schema the Supabase CLI migrations build.

Ticket 04's acceptance criterion: "A test fails when the sync rules reference a table or
column the schema does not have." This has no FastAPI or live-database dependency on
purpose (ticket 02 adds the app's own connection); it reads the same .sql files
`supabase db reset` would run, so the check is offline and needs no Postgres instance.
"""

from __future__ import annotations

import re
from pathlib import Path

import sqlglot
import yaml
from sqlglot import exp

_CREATE_TABLE = re.compile(r"CREATE TABLE IF NOT EXISTS\s+(\w+)\s*\((.*?)\n\);", re.S | re.I)
_ADD_COLUMN = re.compile(r"ALTER TABLE\s+(\w+)\s+ADD COLUMN IF NOT EXISTS\s+(\w+)", re.I)
_SKIP_PREFIXES = ("PRIMARY KEY", "UNIQUE", "CHECK", "FOREIGN KEY", "CONSTRAINT")


def load_schema(migrations_dir: Path) -> dict[str, set[str]]:
    """Table -> column names, from every `CREATE TABLE` and `ADD COLUMN` in the migrations."""
    schema: dict[str, set[str]] = {}
    for path in sorted(migrations_dir.glob("*.sql")):
        text = path.read_text()
        for table, body in _CREATE_TABLE.findall(text):
            columns = schema.setdefault(table, set())
            for line in body.splitlines():
                line = line.strip().rstrip(",")
                if not line or line.upper().startswith(_SKIP_PREFIXES):
                    continue
                columns.add(line.split()[0])
        for table, column in _ADD_COLUMN.findall(text):
            schema.setdefault(table, set()).add(column)
    return schema


def load_data_queries(sync_rules_path: Path) -> list[str]:
    """Every `data` query string across every bucket in the sync rules file."""
    doc = yaml.safe_load(sync_rules_path.read_text())
    queries: list[str] = []
    for bucket in doc["bucket_definitions"].values():
        queries.extend(bucket["data"])
    return queries


def referenced_columns(query: str) -> set[tuple[str, str]]:
    """(table, column) pairs a query reads, resolved through its FROM/JOIN aliases.

    `bucket.*` is PowerSync's per-client parameter, not a table, and is skipped. An output
    alias (`... as id`) is never checked against the schema: only the real columns behind
    it are (so `a.x || ':' || a.y as id` still checks `a.x` and `a.y`).
    """
    parsed = sqlglot.parse_one(query, read="postgres")
    aliases: dict[str, str] = {}
    default_table: str | None = None
    for table in parsed.find_all(exp.Table):
        aliases[table.alias_or_name] = table.name
        if default_table is None:
            default_table = table.name

    refs: set[tuple[str, str]] = set()
    for column in parsed.find_all(exp.Column):
        table_alias = column.table
        if table_alias == "bucket":
            continue
        table = aliases.get(table_alias, default_table) if table_alias else default_table
        if table is not None:
            refs.add((table, column.name))
    return refs


def missing_references(schema: dict[str, set[str]], queries: list[str]) -> list[str]:
    """Human-readable `table.column` for every reference a query makes the schema lacks."""
    problems: list[str] = []
    for query in queries:
        for table, column in sorted(referenced_columns(query)):
            if table not in schema:
                problems.append(f"{table} (no such table)")
            elif column not in schema[table]:
                problems.append(f"{table}.{column}")
    return problems
