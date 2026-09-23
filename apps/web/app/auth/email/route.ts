import { supabaseServer } from "@/lib/supabase"
import { json } from "@/lib/http"

/** Magic link: Supabase mails a link that lands on /auth/callback with a code. */
export async function POST(request: Request) {
  const { email } = await request.json()
  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: "email" }, 400)
  const { error } = await (await supabaseServer()).auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${new URL(request.url).origin}/auth/callback` },
  })
  return error ? json({ error: error.message }, error.status ?? 400) : json({ ok: true })
}
