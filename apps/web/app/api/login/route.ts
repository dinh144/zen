import { cookies } from "next/headers"
import { checkPassword, sessionCookie } from "@/lib/auth"
import { json, parse } from "@/lib/http"
import { LoginInput } from "@/lib/schemas"

export async function POST(request: Request) {
  const body = parse(LoginInput, await request.json().catch(() => null))
  if (!checkPassword(body?.password ?? "")) return json({ error: "wrong password" }, 401)
  ;(await cookies()).set(sessionCookie())
  return json({ ok: true })
}
