import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

/** Both the magic link and Google come back here with a PKCE code. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  if (code) {
    const { error } = await (await supabaseServer()).auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}/`)
  }
  return NextResponse.redirect(`${origin}/login?error=link`)
}
