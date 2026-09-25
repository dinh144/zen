import { cookies } from "next/headers"
import { createHash, createHmac, timingSafeEqual } from "node:crypto"

const PASSWORD = process.env.ZEN_PASSWORD ?? ""
const COOKIE = "zen_session"

const token = () => createHmac("sha256", PASSWORD).update("zen").digest("hex")

// Hash both sides so lengths match and the comparison takes the same time whatever is guessed.
const same = (a: string, b: string) =>
  timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest())

export function checkPassword(input: string) {
  return Boolean(PASSWORD) && typeof input === "string" && same(input, PASSWORD)
}

export function sessionCookie() {
  return { name: COOKIE, value: token(), httpOnly: true, sameSite: "lax" as const, path: "/" }
}

/** No password configured means the app is open — the single-user dev case. */
export const validSession = (value: string | undefined) => !PASSWORD || (value !== undefined && same(value, token()))

export async function isAuthed() {
  return validSession((await cookies()).get(COOKIE)?.value)
}

export { COOKIE, token }
