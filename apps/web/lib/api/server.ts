import { token } from "@/lib/auth"
import { cloud, supabaseServer } from "@/lib/supabase"
import { API_URL, apiClient } from "./client"

/** The mind's own token: the Supabase session's access token in the cloud, the session token locally
 *  (the same value `bearerUser()` in lib/user.ts already accepts as a bearer token — set even with
 *  no `ZEN_PASSWORD`, when the app is open and `bearerUser()` accepts any value). */
async function meToken() {
  return cloud ? (await (await supabaseServer()).auth.getSession()).data.session?.access_token : token()
}

/** A relative baseUrl resolves against "the current page" in a browser; the server has no such
 *  thing, so with no separate API configured (this app still serving its own /api) it calls itself
 *  on its own loopback port — never the incoming request's `host`/`x-forwarded-proto` headers,
 *  which a non-browser client can set to any attacker-chosen value (SSRF). The Next process always
 *  listens on plain HTTP on its own port, regardless of any TLS a proxy in front terminates. */
function serverBaseUrl() {
  return API_URL || `http://localhost:${process.env.PORT ?? 3000}`
}

/** A server component's own client, the mind's token forwarded as a bearer header. Null when signed out. */
export async function apiForMe() {
  const mine = await meToken()
  return mine ? apiClient(mine, serverBaseUrl()) : null
}
