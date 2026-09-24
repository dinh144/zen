import { json, parse } from "@/lib/http"
import { setLocale } from "@/lib/settings"
import { withUser } from "@/lib/user"
import { SettingsPatch } from "@/lib/schemas"

export const PATCH = withUser(async (me, request: Request) => {
  const body = parse(SettingsPatch, await request.json())
  return body && (await setLocale(me, body.locale)) ? json({ ok: true }) : json({ error: "locale" }, 400)
})
