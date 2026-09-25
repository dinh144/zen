from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

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


class CardInput(BaseModel):
    """A new card: give a url, a note, a quote, or any mix."""

    model_config = ConfigDict(extra="forbid")

    url: str | None = None
    note: str | None = None
    title: str | None = None
    kind: Kind | None = None
    quote: str | None = None
    content: str | None = None


class CardResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    card: Card


Tag = Annotated[str, Field(max_length=60)]


class CardPatch(BaseModel):
    """A partial edit: only the fields present in the request are changed."""

    model_config = ConfigDict(extra="forbid")

    kind: Kind | None = None
    title: str | None = None
    note: str | None = None
    colors: list[str] | None = None
    tags: list[Tag] | None = None
    pinned: bool | None = None
    seen: bool | None = None
    restore: bool | None = None
    resurface: str | None = None

    @field_validator("resurface")
    @classmethod
    def _valid_date(cls, value: str | None) -> str | None:
        if value is not None:
            datetime.fromisoformat(value)  # raises ValueError on a bad date, caught as a 422
        return value


class Ok(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ok: Literal[True]


class Article(BaseModel):
    """Reading Mode's saved copy, sanitised again on every read (defence in depth)."""

    model_config = ConfigDict(extra="forbid")

    article_html: str


class Error(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error: str
