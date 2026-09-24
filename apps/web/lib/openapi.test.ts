// A forgotten route (declared under app/api but never added to lib/openapi-document.ts) fails here,
// not silently — the OpenAPI document is the contract, so every route must be in it.
import { describe, expect, test } from "bun:test"
import { readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { buildDocument } from "./openapi-document"

describe("openapi completeness", () => {
  test("every app/api route appears in the generated document (except inngest, its own webhook contract)", () => {
    const dir = fileURLToPath(new URL("../app/api", import.meta.url))
    const files = readdirSync(dir, { recursive: true }).filter((f): f is string => typeof f === "string" && f.endsWith("route.ts"))
    const routes = files
      .map((f) => "/" + f.replace(/\\/g, "/").replace(/\/route\.ts$/, "").replace(/\[([^\]]+)\]/g, "{$1}"))
      .filter((route) => route !== "/inngest")
    const paths = Object.keys(buildDocument().paths ?? {})
    for (const route of routes) expect(paths).toContain(route)
  })
})
