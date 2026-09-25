import uuid

import asyncpg
import httpx

from app import config
from tests.conftest import Mind


async def test_capture_returns_note_link_and_quote_cards_at_once(client: httpx.AsyncClient, mind_a: Mind):
    note = await client.post("/api/cards", headers=mind_a.headers, json={"note": "call mom"})
    assert note.status_code == 201
    assert note.json()["card"]["kind"] == "note"
    assert note.json()["card"]["note"] == "call mom"

    link = await client.post("/api/cards", headers=mind_a.headers, json={"url": "https://example.com/a"})
    assert link.status_code == 201
    card = link.json()["card"]
    assert card["kind"] == "link"
    assert card["url"] == "https://example.com/a"
    assert card["domain"] == "example.com"

    quote = await client.post("/api/cards", headers=mind_a.headers, json={"quote": "carpe diem"})
    assert quote.status_code == 201
    card = quote.json()["card"]
    assert card["kind"] == "quote"
    assert card["content"] == "carpe diem"
    assert card["meta"] == {"quote": "carpe diem", "source": None}


async def test_only_http_and_https_addresses_are_accepted_as_links(client: httpx.AsyncClient, mind_a: Mind):
    r = await client.post("/api/cards", headers=mind_a.headers, json={"url": "javascript:alert(1)"})
    assert r.status_code == 201
    card = r.json()["card"]
    assert card["url"] is None
    assert card["domain"] is None
    assert card["kind"] == "note"


async def test_each_new_card_spends_the_daily_cap_first(client: httpx.AsyncClient, mind_a: Mind, monkeypatch):
    monkeypatch.setattr(config, "DAILY_CARDS", 0)
    r = await client.post("/api/cards", headers=mind_a.headers, json={"note": "over the cap"})
    assert r.status_code == 429
    assert r.json() == {"error": "daily limit"}

    # A day already over cap never created the card.
    board = await client.get("/api/cards", headers=mind_a.headers)
    assert board.json()["cards"] == []


async def test_edit_title_note_kind_tags_and_colours(client: httpx.AsyncClient, mind_a: Mind):
    created = await client.post("/api/cards", headers=mind_a.headers, json={"note": "draft"})
    id = created.json()["card"]["id"]

    r = await client.patch(
        f"/api/cards/{id}",
        headers=mind_a.headers,
        json={"title": "Renamed", "note": "edited", "kind": "quote", "tags": ["work", "idea"], "colors": ["#ff0000"]},
    )
    assert r.status_code == 200
    card = r.json()["card"]
    assert card["title"] == "Renamed"
    assert card["note"] == "edited"
    assert card["kind"] == "quote"
    assert card["tags"] == ["work", "idea"]
    assert card["colors"] == ["#ff0000"]


async def test_a_tag_over_the_length_limit_is_rejected(client: httpx.AsyncClient, mind_a: Mind):
    created = await client.post("/api/cards", headers=mind_a.headers, json={"note": "draft"})
    id = created.json()["card"]["id"]

    r = await client.patch(f"/api/cards/{id}", headers=mind_a.headers, json={"tags": ["x" * 61]})
    assert r.status_code == 422


async def test_pin_unpin_and_mark_seen(client: httpx.AsyncClient, mind_a: Mind):
    created = await client.post("/api/cards", headers=mind_a.headers, json={"note": "pin me"})
    id = created.json()["card"]["id"]

    pinned = await client.patch(f"/api/cards/{id}", headers=mind_a.headers, json={"pinned": True})
    assert pinned.json()["card"]["pinned_at"] is not None

    unpinned = await client.patch(f"/api/cards/{id}", headers=mind_a.headers, json={"pinned": False})
    assert unpinned.json()["card"]["pinned_at"] is None

    seen = await client.patch(f"/api/cards/{id}", headers=mind_a.headers, json={"seen": True})
    assert seen.json()["card"]["seen_at"] is not None


async def test_set_and_clear_the_resurfacing_date(client: httpx.AsyncClient, db: asyncpg.Connection, mind_a: Mind):
    created = await client.post("/api/cards", headers=mind_a.headers, json={"note": "resurface me"})
    id = created.json()["card"]["id"]

    r = await client.patch(f"/api/cards/{id}", headers=mind_a.headers, json={"resurface": "2027-01-01T00:00:00Z"})
    assert r.status_code == 200
    row = await db.fetchrow("SELECT resurface_at FROM cards WHERE id = $1", uuid.UUID(id))
    assert row is not None and row["resurface_at"] is not None

    r = await client.patch(f"/api/cards/{id}", headers=mind_a.headers, json={"resurface": None})
    assert r.status_code == 200
    row = await db.fetchrow("SELECT resurface_at FROM cards WHERE id = $1", uuid.UUID(id))
    assert row is not None and row["resurface_at"] is None


async def test_a_bad_resurface_date_is_rejected(client: httpx.AsyncClient, mind_a: Mind):
    created = await client.post("/api/cards", headers=mind_a.headers, json={"note": "draft"})
    id = created.json()["card"]["id"]

    r = await client.patch(f"/api/cards/{id}", headers=mind_a.headers, json={"resurface": "not a date"})
    assert r.status_code == 422


async def test_let_go_is_a_soft_delete_and_restore_brings_it_back(client: httpx.AsyncClient, mind_a: Mind):
    created = await client.post("/api/cards", headers=mind_a.headers, json={"title": "keep me", "note": "body"})
    id = created.json()["card"]["id"]

    deleted = await client.delete(f"/api/cards/{id}", headers=mind_a.headers)
    assert deleted.status_code == 200
    assert deleted.json() == {"ok": True}

    board = await client.get("/api/cards", headers=mind_a.headers)
    assert id not in [c["id"] for c in board.json()["cards"]]

    restored = await client.patch(f"/api/cards/{id}", headers=mind_a.headers, json={"restore": True})
    assert restored.status_code == 200
    assert restored.json()["card"]["title"] == "keep me"
    assert restored.json()["card"]["note"] == "body"

    board = await client.get("/api/cards", headers=mind_a.headers)
    assert id in [c["id"] for c in board.json()["cards"]]


async def test_a_second_mind_is_refused(client: httpx.AsyncClient, mind_a: Mind, mind_b: Mind):
    created = await client.post("/api/cards", headers=mind_a.headers, json={"note": "mine"})
    id = created.json()["card"]["id"]

    patched = await client.patch(f"/api/cards/{id}", headers=mind_b.headers, json={"title": "stolen"})
    assert patched.status_code == 404

    deleted = await client.delete(f"/api/cards/{id}", headers=mind_b.headers)
    assert deleted.status_code == 200  # scoped by user_id: touches nothing, still reports ok

    board = await client.get("/api/cards", headers=mind_a.headers)
    assert id in [c["id"] for c in board.json()["cards"]]  # mind_b's delete touched nothing


async def test_reading_mode_serves_the_saved_article_as_sanitised_html(
    client: httpx.AsyncClient, db: asyncpg.Connection, mind_a: Mind
):
    row = await db.fetchrow(
        "INSERT INTO cards (user_id, kind, title, article_html) VALUES ($1, 'article', 'A', $2) RETURNING id",
        uuid.UUID(mind_a.id),
        "<p>hello</p><script>alert(1)</script>",
    )
    assert row is not None
    id = str(row["id"])

    r = await client.get(f"/api/cards/{id}/article", headers=mind_a.headers)
    assert r.status_code == 200
    assert r.json() == {"article_html": "<p>hello</p>"}


async def test_reading_mode_404s_without_an_article_or_for_another_mind(
    client: httpx.AsyncClient, mind_a: Mind, mind_b: Mind
):
    created = await client.post("/api/cards", headers=mind_a.headers, json={"note": "no article"})
    id = created.json()["card"]["id"]

    r = await client.get(f"/api/cards/{id}/article", headers=mind_a.headers)
    assert r.status_code == 404

    r = await client.get(f"/api/cards/{id}/article", headers=mind_b.headers)
    assert r.status_code == 404
