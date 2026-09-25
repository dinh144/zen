import json
from datetime import datetime
from urllib.parse import urlsplit
from uuid import UUID

import nh3
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from . import config
from .auth import current_mind
from .db import get_session
from .schemas import Article, Card, CardInput, CardPatch, CardResponse, CardsList, Ok

router = APIRouter()

# Shared by every route that reads a card back: the board list, a fresh capture, and an edit.
_COLUMNS = """id, kind, title, url, domain, note, content, image_path, meta, colors, tags,
               article_html IS NOT NULL AS has_article, pinned_at, seen_at, enriched_at, created_at, updated_at"""


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


def _row_to_card(row) -> Card:
    return Card(
        id=str(row.id),
        kind=row.kind,
        title=row.title,
        url=row.url,
        domain=row.domain,
        note=row.note,
        content=row.content,
        image_path=row.image_path,
        meta=row.meta or {},
        colors=list(row.colors or []),
        tags=list(row.tags or []),
        has_article=row.has_article,
        pinned_at=_iso(row.pinned_at),
        seen_at=_iso(row.seen_at),
        enriched_at=_iso(row.enriched_at),
        created_at=row.created_at.isoformat(),
        updated_at=row.updated_at.isoformat(),
    )


@router.get("/cards")
async def list_cards(
    mind: str = Depends(current_mind),
    session: AsyncSession = Depends(get_session),
    limit: int = Query(default=60, gt=0, le=500),
    after: UUID | None = Query(default=None),
) -> CardsList:
    """The mind's board, newest first. `after` is the id of the last card already seen: its own
    (created_at, id) is the cursor, so equal timestamps never skip or repeat a card."""
    cursor_clause = ""
    params: dict[str, object] = {"me": mind, "limit": limit}
    if after is not None:
        cursor_clause = "AND (created_at, id) < (SELECT created_at, id FROM cards WHERE id = :after AND user_id = :me)"
        params["after"] = str(after)
    rows = (
        await session.execute(
            text(
                f"""
        SELECT {_COLUMNS}
        FROM cards
        WHERE user_id = :me AND deleted_at IS NULL {cursor_clause}
        ORDER BY created_at DESC, id DESC
        LIMIT :limit
        """
            ),
            params,
        )
    ).all()
    return CardsList(cards=[_row_to_card(row) for row in rows])


def _link(value: str | None) -> tuple[str | None, str | None]:
    """Only http and https addresses are accepted as links; a javascript: or data: address (or
    anything else unparseable) is dropped rather than stored, so it can never run once clicked."""
    if not value:
        return None, None
    parsed = urlsplit(value)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return None, None
    return value, parsed.hostname.removeprefix("www.")


@router.post("/cards", status_code=201)
async def create_card(
    body: CardInput = CardInput(),
    mind: str = Depends(current_mind),
    session: AsyncSession = Depends(get_session),
) -> CardResponse:
    """Capture returns the saved card at once, with no model call; enrichment (tags, embedding,
    the daily mark unlocks) is a background job from a later ticket."""
    spent = (
        await session.execute(
            text(
                "INSERT INTO usage (user_id, cards) VALUES (:me, 1) "
                "ON CONFLICT (user_id, day) DO UPDATE SET cards = usage.cards + 1 RETURNING cards"
            ),
            {"me": mind},
        )
    ).scalar_one()
    if spent > config.DAILY_CARDS:
        await session.commit()
        raise HTTPException(status_code=429, detail={"error": "daily limit"})

    url, domain = _link(body.url)
    kind = body.kind or ("quote" if body.quote else "link" if body.url else "note")
    content = body.quote if body.quote is not None else body.content
    meta = {"quote": body.quote, "source": body.url} if body.quote else {}

    row = (
        await session.execute(
            text(
                f"""
        INSERT INTO cards (user_id, kind, title, url, domain, note, content, meta)
        VALUES (:me, :kind, :title, :url, :domain, :note, :content, CAST(:meta AS jsonb))
        RETURNING {_COLUMNS}
        """
            ),
            {
                "me": mind,
                "kind": kind,
                "title": body.title,
                "url": url,
                "domain": domain,
                "note": body.note,
                "content": content,
                "meta": json.dumps(meta),
            },
        )
    ).one()
    await session.commit()
    return CardResponse(card=_row_to_card(row))


@router.patch("/cards/{id}")
async def edit_card(
    id: UUID,
    body: CardPatch = CardPatch(),
    mind: str = Depends(current_mind),
    session: AsyncSession = Depends(get_session),
) -> CardResponse:
    """Edit, pin, mark seen, restore, or set the resurfacing date; only the fields the request set
    are touched."""
    set_fields = body.model_fields_set
    owner = {"id": str(id), "me": mind}

    if "pinned" in set_fields:
        await session.execute(
            text(
                "UPDATE cards SET pinned_at = CASE WHEN :pinned THEN now() ELSE NULL END "
                "WHERE id = :id AND user_id = :me"
            ),
            {**owner, "pinned": body.pinned},
        )
    if body.seen:
        await session.execute(text("UPDATE cards SET seen_at = now() WHERE id = :id AND user_id = :me"), owner)
    if body.restore:
        await session.execute(text("UPDATE cards SET deleted_at = NULL WHERE id = :id AND user_id = :me"), owner)
    if "resurface" in set_fields:
        at = datetime.fromisoformat(body.resurface) if body.resurface else None
        await session.execute(
            text("UPDATE cards SET resurface_at = :at WHERE id = :id AND user_id = :me"), {**owner, "at": at}
        )

    assignments = ["updated_at = now()"]
    params: dict[str, object] = dict(owner)
    for key in ("kind", "title", "note", "tags", "colors"):
        if key in set_fields:
            assignments.append(f"{key} = :{key}")
            params[key] = getattr(body, key)
    row = (
        await session.execute(
            text(f"UPDATE cards SET {', '.join(assignments)} WHERE id = :id AND user_id = :me RETURNING {_COLUMNS}"),
            params,
        )
    ).one_or_none()
    await session.commit()
    if row is None:
        raise HTTPException(status_code=404, detail={"error": "not found"})
    return CardResponse(card=_row_to_card(row))


@router.delete("/cards/{id}")
async def let_card_go(
    id: UUID,
    mind: str = Depends(current_mind),
    session: AsyncSession = Depends(get_session),
) -> Ok:
    """A soft delete: `PATCH` with `restore: true` brings the card back as it was."""
    await session.execute(
        text("UPDATE cards SET deleted_at = now() WHERE id = :id AND user_id = :me"), {"id": str(id), "me": mind}
    )
    await session.commit()
    return Ok(ok=True)


@router.get("/cards/{id}/article")
async def read_article(
    id: UUID,
    mind: str = Depends(current_mind),
    session: AsyncSession = Depends(get_session),
) -> Article:
    """Reading Mode's saved copy of a card this mind owns, sanitised again on every read (the
    same defence-in-depth the TypeScript server applies) rather than trusted from storage alone."""
    row = (
        await session.execute(
            text("SELECT article_html FROM cards WHERE id = :id AND user_id = :me AND deleted_at IS NULL"),
            {"id": str(id), "me": mind},
        )
    ).one_or_none()
    if row is None or row.article_html is None:
        raise HTTPException(status_code=404, detail={"error": "not found"})
    return Article(article_html=nh3.clean(row.article_html))
