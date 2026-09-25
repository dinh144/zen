"""CI's contract gate for the Python API:

1. Regenerates apps/api/openapi.json and fails if the committed copy is stale.
2. Runs `oasdiff breaking` between the web contract (apps/web/openapi.json) and this API's
   document, scoped to the (path, method) pairs the API actually implements — an endpoint this
   lane hasn't built yet is not yet a broken promise — with the reviewed exception file for the
   two endpoints this lane knowingly narrows (see oasdiff-exceptions.md).

    uv run scripts/check_contract.py
"""

import json
import subprocess
import sys
import tempfile
from pathlib import Path

from gen_openapi import build_document

HTTP_METHODS = {"get", "post", "put", "patch", "delete", "options", "head", "trace"}
API_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = API_DIR.parent.parent
COMMITTED = API_DIR / "openapi.json"
WEB_CONTRACT = REPO_ROOT / "apps" / "web" / "openapi.json"
EXCEPTIONS = API_DIR / "oasdiff-exceptions.md"


def trimmed_base(web_contract: dict, api_doc: dict) -> dict:
    """The web contract, keeping only the operations the API document also has — new endpoints
    from later tickets are not yet a contract to be broken."""
    trimmed = json.loads(json.dumps(web_contract))
    kept_paths = {}
    for path, item in trimmed["paths"].items():
        api_item = api_doc["paths"].get(path)
        if not api_item:
            continue
        non_methods = {k: v for k, v in item.items() if k not in HTTP_METHODS}
        kept_ops = {method: op for method, op in item.items() if method in HTTP_METHODS and method in api_item}
        if kept_ops:
            kept_paths[path] = {**non_methods, **kept_ops}
    trimmed["paths"] = kept_paths
    return trimmed


def main() -> int:
    doc = build_document()
    if COMMITTED.exists() and json.loads(COMMITTED.read_text()) == doc:
        print("apps/api/openapi.json is up to date")
    else:
        print("apps/api/openapi.json is stale — run `uv run scripts/gen_openapi.py`", file=sys.stderr)
        return 1

    web_contract = json.loads(WEB_CONTRACT.read_text())
    base = trimmed_base(web_contract, doc)

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as base_file:
        json.dump(base, base_file)
        base_path = base_file.name

    result = subprocess.run(
        ["oasdiff", "breaking", base_path, str(COMMITTED), "--err-ignore", str(EXCEPTIONS), "--fail-on", "ERR"],
    )
    return result.returncode


if __name__ == "__main__":
    sys.exit(main())
