from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from .auth import current_mind
from .db import get_session
from .schemas import Card, CardsList

router = APIRouter()


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
        SELECT id, kind, title, url, domain, note, content, image_path, meta, colors, tags,
               article_html IS NOT NULL AS has_article, pinned_at, seen_at, enriched_at, created_at, updated_at
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
