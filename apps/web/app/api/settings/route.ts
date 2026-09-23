import { json } from "@/lib/http"
import { setLocale } from "@/lib/settings"
import { withUser } from "@/lib/user"

export const PATCH = withUser(async (me, request: Request) => {
  const { locale } = await request.json()
  return (await setLocale(me, String(locale))) ? json({ ok: true }) : json({ error: "locale" }, 400)
})
