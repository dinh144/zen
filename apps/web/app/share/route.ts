import { after } from "next/server"
import { createCard, spend } from "@/lib/cards"
import { enrichCard } from "@/lib/enrich"
import { storeUpload } from "@/lib/upload"
import { currentUser } from "@/lib/user"

/** PWA share target: the mobile share sheet lands here. */
export async function POST(request: Request) {
  const me = await currentUser()
  if (!me) return Response.redirect(new URL("/login", request.url), 303)
  if (!(await spend(me))) return Response.redirect(new URL("/", request.url), 303)
  const form = await request.formData()
  const file = form.get("file")
  const text = (form.get("text") as string) ?? ""
  const url = ((form.get("url") as string) || text.match(/https?:\/\/\S+/)?.[0]) ?? null
  const stored = file instanceof File && file.size ? await storeUpload(me, file) : null

  const card = await createCard(me, {
    ...(stored ?? { kind: url ? "link" : "note" }),
    title: (form.get("title") as string) || (file instanceof File ? file.name : null) || null,
    url,
    note: url ? null : text || null,
  })

  after(() => enrichCard(card.id))
  return Response.redirect(new URL("/", request.url), 303)
}
