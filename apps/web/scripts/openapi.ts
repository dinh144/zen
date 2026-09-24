// Generates the committed OpenAPI contract from the route schemas in lib/schemas.ts
// (assembled by lib/openapi-document.ts).
//   bun scripts/openapi.ts
// CI re-runs this and fails if the committed apps/web/openapi.json goes stale (see CLAUDE.md for the
// additive-only rule, and .github/workflows/ci.yml for the oasdiff breaking check).
import { buildDocument } from "../lib/openapi-document"

await Bun.write("openapi.json", JSON.stringify(buildDocument(), null, 2) + "\n")
console.log("wrote apps/web/openapi.json")
