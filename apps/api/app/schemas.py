from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

# Mirrors apps/web/lib/types.ts KINDS — the two must stay in sync (kept as one API contract).
Kind = Literal[
    "note",
    "quote",
    "link",
    "article",
    "image",
    "video",
    "product",
    "book",
    "movie",
    "recipe",
    "tweet",
    "person",
    "color",
    "font",
    "pdf",
    "file",
]

# Matches apps/web/lib/schemas.ts's z.uuid() (also accepts the nil and max sentinels), so the
# generated schema matches the committed contract byte for byte.
_UUID_PATTERN = (
    r"^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}"
    r"|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
)


class Card(BaseModel):
    """A saved card: a note, link, image or other kind of memory."""

    model_config = ConfigDict(extra="forbid")

    id: str = Field(pattern=_UUID_PATTERN, json_schema_extra={"format": "uuid"})
    kind: Kind
    title: str | None
    url: str | None
    domain: str | None
    note: str | None
    content: str | None
    image_path: str | None
    meta: dict[str, object] = Field(json_schema_extra={"propertyNames": {"type": "string"}})
    colors: list[str]
    tags: list[str]
    has_article: bool
    pinned_at: str | None
    seen_at: str | None
    enriched_at: str | None
    created_at: str
    updated_at: str


class CardsList(BaseModel):
    model_config = ConfigDict(extra="forbid")

    cards: list[Card]


class Error(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error: str
