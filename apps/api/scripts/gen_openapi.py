"""Regenerates the committed apps/api/openapi.json from the FastAPI route declarations.

    uv run scripts/gen_openapi.py

CI re-runs this and fails if the committed copy goes stale, then runs `oasdiff breaking` against
the committed apps/web/openapi.json contract (see .github/workflows/ci.yml and
apps/api/oasdiff-exceptions.md).
"""

import json
from pathlib import Path
from typing import Any

from app.main import app

PREFIX = "/api"

JSON = dict[str, Any] | list[Any] | str | int | float | bool | None


def _simplify_nullable(node: JSON) -> JSON:
    """Pydantic emits `str | None` as `anyOf: [{type: string}, {type: null}]`; the committed
    contract (zod-openapi) emits the plain-JSON-Schema `type: [string, null]` for the same type.
    Collapsing to that shape avoids oasdiff reading every nullable field as a widened type."""
    if isinstance(node, dict):
        any_of = node.get("anyOf")
        if isinstance(any_of, list) and {"type": "null"} in any_of and len(any_of) == 2:
            other = next(s for s in any_of if s != {"type": "null"})
            if set(other) == {"type"}:
                node = {k: v for k, v in node.items() if k != "anyOf"} | {"type": [other["type"], "null"]}
        return {k: _simplify_nullable(v) for k, v in node.items()}
    if isinstance(node, list):
        return [_simplify_nullable(v) for v in node]
    return node


def build_document() -> dict[str, Any]:
    doc = app.openapi()
    # Routes are served at /api/* (so the app works with one `uvicorn` command); the contract
    # instead keeps paths relative to a declared server, the way apps/web/openapi.json does.
    doc["paths"] = {
        (path[len(PREFIX) :] if path.startswith(PREFIX) else path): item for path, item in doc["paths"].items()
    }
    doc["servers"] = [{"url": PREFIX}]
    doc["components"]["securitySchemes"]["bearerAuth"]["description"] = (
        "A Supabase access token, verified against the project's published signing keys."
    )
    result = _simplify_nullable(doc)
    assert isinstance(result, dict)
    return result


if __name__ == "__main__":
    out = Path(__file__).resolve().parent.parent / "openapi.json"
    out.write_text(json.dumps(build_document(), indent=2) + "\n")
    print(f"wrote {out}")
