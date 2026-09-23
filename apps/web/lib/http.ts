import { NextResponse } from "next/server"

// The browser extension posts from a chrome-extension:// origin.
export const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
}

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: cors })

export const OPTIONS = () => new Response(null, { status: 204, headers: cors })
