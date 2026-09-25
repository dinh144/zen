import createClient from "openapi-fetch"
import type { paths } from "./schema"

// Empty by default: the API is this same app's own /api routes, same origin. Point it at a
// separately-hosted zen API (the Python rewrite, or another environment) with one env var.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ""

/** The typed client generated from openapi.json (`bun run openapi` regenerates both). `baseUrl`
 *  defaults to `API_URL`; a server call with no separate API overrides it with an absolute origin,
 *  since (unlike a browser) Node's fetch cannot resolve a relative URL against "the current page". */
export const apiClient = (token?: string, baseUrl: string = API_URL) =>
  createClient<paths>({ baseUrl: `${baseUrl}/api`, headers: token ? { Authorization: `Bearer ${token}` } : undefined })
