import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  const { data, error } = await (await supabaseServer()).auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  })
  return NextResponse.redirect(error || !data.url ? `${origin}/login?error=google` : data.url)
}
