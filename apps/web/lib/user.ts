import { isAuthed } from "./auth"
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

/** An API handler that only runs for a signed-in mind; everyone else gets 401 here, once. */
export function withUser<C>(handler: (me: string, request: Request, context: C) => Promise<Response>) {
  return async (request: Request, context: C) => {
    const me = await currentUser()
    return me ? handler(me, request, context) : json({ error: "locked" }, 401)
  }
}
