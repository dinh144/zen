import { NextResponse } from "next/server"
import { supabaseServer } from "@/lib/supabase"

export async function POST(request: Request) {
  await (await supabaseServer()).auth.signOut()
  return NextResponse.redirect(new URL("/", request.url), 303)
}
