// Generates the committed OpenAPI contract from the route schemas in lib/schemas.ts
// (assembled by lib/openapi-document.ts), and the typed client's types from that same document.
//   bun scripts/openapi.ts
// CI re-runs this and fails if the committed apps/web/openapi.json or lib/api/schema.ts go stale
// (see CLAUDE.md for the additive-only rule, and .github/workflows/ci.yml for the oasdiff breaking check).
import openapiTS, { astToString } from "openapi-typescript"
import { buildDocument } from "../lib/openapi-document"

await Bun.write("openapi.json", JSON.stringify(buildDocument(), null, 2) + "\n")
console.log("wrote apps/web/openapi.json")

// Fed from the file just written, not the in-memory document: the types describe exactly the
// committed contract, and JSON.parse's `any` sidesteps zod-openapi's document type not being the
// exact structural shape openapi-typescript declares (both are plain OpenAPI 3.1 JSON).
const types = astToString(await openapiTS(JSON.parse(await Bun.file("openapi.json").text())))
await Bun.write("lib/api/schema.ts", types)
console.log("wrote apps/web/lib/api/schema.ts")
