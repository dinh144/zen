import { after } from "next/server"
import { createCard, spend } from "@/lib/cards"
import { enrichCard } from "@/lib/enrich"
import { fileSize, getFile, uploadTicket } from "@/lib/storage"
import { describeUpload, MAX_UPLOAD, storeUpload, uploadName } from "@/lib/upload"
import { json } from "@/lib/http"
import { withUser } from "@/lib/user"

export { OPTIONS } from "@/lib/http"

/**
 * Local: one multipart POST. Cloud: {intent: "ticket"} hands out a signed upload URL, the browser
 * PUTs the file straight to storage, then {intent: "done"} turns it into a card.
 */
export const POST = withUser(async (me, request: Request) => {

  if (request.headers.get("content-type")?.startsWith("application/json")) {
    const body = await request.json()
    if (body.intent === "ticket") {
      if (!(Number(body.size) > 0 && Number(body.size) <= MAX_UPLOAD)) return json({ error: "too large" }, 413)
      // The allowance is spent on the ticket, so storage cannot fill without cards being counted.
      if (!(await spend(me))) return json({ error: "daily limit" }, 429)
      const name = uploadName(me, String(body.name ?? ""))
      return json({ name, url: await uploadTicket(name) })
    }
    // Only a file this user was handed a ticket for, and only once it is really there.
    const name = String(body.file ?? "")
    if (!name.startsWith(`${me}-`) || name.includes("/")) return json({ error: "not yours" }, 403)
    const size = await fileSize(name)
    if (size === null) return json({ error: "not uploaded" }, 400)
    const type = String(body.type ?? "")
    const bytes = type.startsWith("video/") ? ((await getFile(name)) ?? undefined) : undefined
    const card = await createCard(me, {
      ...(await describeUpload(name, String(body.name ?? name), type, size, bytes)),
      title: String(body.name ?? "") || name,
    })
    after(() => enrichCard(card.id))
    return json({ card }, 201)
  }

  const form = await request.formData()
  const file = form.get("file")
  if (!(file instanceof File)) return json({ error: "no file" }, 400)
  if (file.size > MAX_UPLOAD) return json({ error: "too large" }, 413)
  if (!(await spend(me))) return json({ error: "daily limit" }, 429)

  const card = await createCard(me, {
    ...(await storeUpload(me, file)),
    title: (form.get("title") as string) || file.name,
    url: (form.get("url") as string) || null,
    note: (form.get("note") as string) || null,
  })

  after(() => enrichCard(card.id))
  return json({ card }, 201)
})
