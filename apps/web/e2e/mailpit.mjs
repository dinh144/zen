import { pollUntil } from "./poll.mjs"

/** Shared by cloud.mjs and extension.cloud.mjs: polls Mailpit for the magic-link email and
 *  returns its confirmation link. Matches the actual `/auth/v1/verify` link precisely (not just
 *  "the first href" — a template could grow a header/footer link later) and fails clearly if no
 *  email ever arrives, instead of the caller handing a null link to page.goto(). */
export async function fetchConfirmationLink(mailUrl, email, { timeout = 10000, interval = 500 } = {}) {
  const msg = await pollUntil(async () => {
    const list = await (await fetch(`${mailUrl}/search?query=${encodeURIComponent("to:" + email)}`)).json()
    const id = list.messages?.[0]?.ID
    if (!id) return null
    return (await fetch(`${mailUrl}/message/${id}`)).json()
  }, { timeout, interval })
  const link = /href="([^"]*\/auth\/v1\/verify[^"]*)"/.exec(msg?.HTML ?? "")?.[1]?.replace(/&amp;/g, "&")
  if (!link) throw new Error(`magic-link email never arrived via Mailpit for ${email} (searched ${mailUrl})`)
  return link
}
