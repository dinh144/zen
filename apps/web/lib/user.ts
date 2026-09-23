import { createClient } from "@supabase/supabase-js"
import { isAuthed, validSession } from "./auth"
import { json } from "./http"
import { cloud, supabaseServer } from "./supabase"

/** The one mind a local install holds; migration 005 gave it every existing row. */
export const LOCAL_USER = "00000000-0000-0000-0000-000000000000"

/** Who is asking: the Supabase user in the cloud, the local mind behind the password otherwise. */
export async function currentUser(): Promise<string | null> {
  if (!cloud) return (await isAuthed()) ? LOCAL_USER : null
  const { data } = await (await supabaseServer()).auth.getClaims()
  return (data?.claims?.sub as string | undefined) ?? null
}

/**
 * Who a bearer token names: apps without cookies (the phone app, MCP clients) send
 * `Authorization: Bearer …`, a Supabase access token in the cloud or the session token locally.
 */
export async function bearerUser(request: Request): Promise<string | null> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return null
  if (!cloud) return validSession(token) ? LOCAL_USER : null
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  })
  const { data } = await supabase.auth.getClaims(token)
  return (data?.claims?.sub as string | undefined) ?? null
}

/** An API handler that only runs for a signed-in mind; everyone else gets 401 here, once. */
export function withUser<C>(handler: (me: string, request: Request, context: C) => Promise<Response>) {
  return async (request: Request, context: C) => {
    const me = (await bearerUser(request)) ?? (await currentUser())
    return me ? handler(me, request, context) : json({ error: "locked" }, 401)
  }
}
