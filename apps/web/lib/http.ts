import { NextResponse } from "next/server"
import type { ZodType } from "zod"

// The browser extension posts from a chrome-extension:// origin.
export const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
}

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: cors })

export const OPTIONS = () => new Response(null, { status: 204, headers: cors })

/** Parses against a route's declared schema (see lib/schemas.ts); null on any shape or type mismatch. */
export function parse<T>(schema: ZodType<T>, data: unknown): T | null {
  const result = schema.safeParse(data)
  return result.success ? result.data : null
}
