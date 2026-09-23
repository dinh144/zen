import { cookies } from "next/headers"
import { checkPassword, sessionCookie } from "@/lib/auth"
import { json } from "@/lib/http"

export async function POST(request: Request) {
  const { password } = await request.json()
  if (!checkPassword(password)) return json({ error: "wrong password" }, 401)
  ;(await cookies()).set(sessionCookie())
  return json({ ok: true })
}
