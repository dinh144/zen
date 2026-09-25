import uuid
from datetime import UTC, datetime, timedelta

import asyncpg
import httpx

from tests.conftest import Mind


async def _insert_card(db: asyncpg.Connection, mind: Mind, created_at: datetime, title: str) -> str:
    row = await db.fetchrow(
        "INSERT INTO cards (user_id, kind, title, created_at, updated_at) VALUES ($1,'note',$2,$3,$3) RETURNING id",
        uuid.UUID(mind.id),
        title,
        created_at,
    )
    assert row is not None
    return str(row["id"])


async def test_board_lists_newest_first(client: httpx.AsyncClient, db: asyncpg.Connection, mind_a: Mind):
    base = datetime(2026, 1, 1, tzinfo=UTC)
    await _insert_card(db, mind_a, base, "oldest")
    await _insert_card(db, mind_a, base + timedelta(minutes=1), "middle")
    await _insert_card(db, mind_a, base + timedelta(minutes=2), "newest")

    r = await client.get("/api/cards", headers=mind_a.headers)
    assert r.status_code == 200
    titles = [c["title"] for c in r.json()["cards"]]
    assert titles == ["newest", "middle", "oldest"]

    card = r.json()["cards"][0]
    assert set(card) == {
        "id",
        "kind",
        "title",
        "url",
        "domain",
        "note",
        "content",
        "image_path",
        "meta",
        "colors",
        "tags",
        "has_article",
        "pinned_at",
        "seen_at",
        "enriched_at",
        "created_at",
        "updated_at",
    }


async def test_board_cursor_never_skips_or_repeats_a_card(
    client: httpx.AsyncClient, db: asyncpg.Connection, mind_a: Mind
):
    # Two cards share one timestamp: the cursor must still break the tie by id, not drop or
    # duplicate either of them across pages.
    same = datetime(2026, 1, 1, tzinfo=UTC)
    tied = [
        await _insert_card(db, mind_a, same, "a"),
        await _insert_card(db, mind_a, same, "b"),
    ]
    older = await _insert_card(db, mind_a, same - timedelta(minutes=1), "c")
    ids = [*tied, older]
    expected = sorted(tied, reverse=True) + [older]  # ties break by id desc; "c" is strictly older

    seen: list[str] = []
    after = None
    for _ in range(len(ids) + 1):  # one extra call must come back empty, proving the walk ends
        params = {"limit": 1, **({"after": after} if after else {})}
        r = await client.get("/api/cards", headers=mind_a.headers, params=params)
        assert r.status_code == 200
        cards = r.json()["cards"]
        if not cards:
            break
        assert len(cards) == 1
        seen.append(cards[0]["id"])
        after = cards[0]["id"]

    assert seen == expected


async def test_board_scopes_by_mind(client: httpx.AsyncClient, db: asyncpg.Connection, mind_a: Mind, mind_b: Mind):
    await _insert_card(db, mind_a, datetime(2026, 1, 1, tzinfo=UTC), "mind a's card")

    r = await client.get("/api/cards", headers=mind_b.headers)
    assert r.status_code == 200
    assert r.json()["cards"] == []

    r = await client.get("/api/cards", headers=mind_a.headers)
    assert len(r.json()["cards"]) == 1


async def test_board_requires_a_token(client: httpx.AsyncClient):
    r = await client.get("/api/cards")
    assert r.status_code == 401
    assert r.json() == {"error": "locked"}
