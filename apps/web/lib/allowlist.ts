import type { SupabaseClient } from "@supabase/supabase-js"

/** No ZEN_ALLOWLIST set means every mind may sign in — the default, open server. Set it on staging. */
const emails = () =>
  (process.env.ZEN_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

export const allowed = (email: string | null | undefined) => {
  const list = emails()
  return list.length === 0 || (Boolean(email) && list.includes(email!.toLowerCase()))
}

/** Called right after a new session is created (magic link, Google, staging password). Signs a
 *  refused mind back out so the session never lingers, and returns whether it was refused. */
export async function refuseIfNotAllowed(supabase: SupabaseClient) {
  const { data } = await supabase.auth.getClaims()
  if (allowed(data?.claims?.email as string | undefined)) return false
  await supabase.auth.signOut()
  return true
}
