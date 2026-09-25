import { NextResponse } from "next/server"
import { refuseIfNotAllowed } from "@/lib/allowlist"
import { supabaseServer } from "@/lib/supabase"

/** Both the magic link and Google come back here with a PKCE code. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  if (code) {
    const supabase = await supabaseServer()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (await refuseIfNotAllowed(supabase)) return NextResponse.redirect(`${origin}/login?error=allowlist`)
      return NextResponse.redirect(`${origin}/`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=link`)
}
