import { refuseIfNotAllowed } from "@/lib/allowlist"
import { json } from "@/lib/http"
import { STAGING } from "@/lib/staging"
import { supabaseServer } from "@/lib/supabase"

/** Staging only: allowlisted test minds sign in with a password, so Playwright and Maestro can sign
 *  in without a mailbox or Google. Off (production), this always refuses. */
export async function POST(request: Request) {
  if (!STAGING) return json({ error: "off" }, 404)
  const { email, password } = await request.json().catch(() => ({}))
  if (typeof email !== "string" || typeof password !== "string") return json({ error: "invalid" }, 400)
  const supabase = await supabaseServer()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return json({ error: "wrong password" }, 401)
  if (await refuseIfNotAllowed(supabase)) return json({ error: "not allowed" }, 403)
  return json({ ok: true })
}
