import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { admin as adminClient } from "@/lib/storage"
import { cloud, supabaseServer } from "@/lib/supabase"
import { currentUser } from "@/lib/user"

/** Deletes a mind for good: its files, every row, then the account itself. */
export async function POST(request: Request) {
  const me = cloud ? await currentUser() : null
  if (!me) return NextResponse.json({ error: "locked" }, { status: 401 })

  const admin = adminClient()
  const files = await sql<{ name: string }[]>`
    SELECT DISTINCT jsonb_array_elements_text(jsonb_build_array(meta->>'file', meta->>'poster')) AS name
    FROM cards WHERE user_id = ${me}`
  const names = files.map((row) => row.name).filter(Boolean)
  for (let i = 0; i < names.length; i += 100) await admin.storage.from("uploads").remove(names.slice(i, i + 100))

  await sql.begin(async (tx) => {
    await tx`DELETE FROM cards WHERE user_id = ${me}`
    await tx`DELETE FROM spaces WHERE user_id = ${me}`
    await tx`DELETE FROM achievements WHERE user_id = ${me}`
    await tx`DELETE FROM usage WHERE user_id = ${me}`
  })
  await (await supabaseServer()).auth.signOut()
  const { error } = await admin.auth.admin.deleteUser(me)
  // The data is already gone; say so on a page rather than as raw JSON.
  if (error) return NextResponse.redirect(new URL("/login?error=delete", request.url), 303)
  return NextResponse.redirect(new URL("/", request.url), 303)
}
