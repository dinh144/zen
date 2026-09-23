import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"
import { cloud } from "./supabase"

export const UPLOAD_DIR = process.env.ZEN_UPLOAD_DIR ?? path.join(process.cwd(), "../../data/uploads")

let client: ReturnType<typeof createClient> | undefined

/** The service-role client. Server-side only: the secret key never reaches a browser. */
export const admin = () =>
  (client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  }))

const bucket = () => admin().storage.from("uploads")

/** Uploads live under flat random names: on disk locally, in the "uploads" bucket in the cloud. */
export async function putFile(name: string, data: Uint8Array, type: string) {
  if (cloud) {
    const { error } = await bucket().upload(name, data, { contentType: type || "application/octet-stream" })
    if (error) throw error
    return
  }
  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(path.join(UPLOAD_DIR, name), data)
}

/** `name` may be a legacy full path from before storage names were flat. */
export async function getFile(name: string): Promise<Buffer | null> {
  const key = path.basename(name)
  if (cloud) {
    const { data } = await bucket().download(key)
    return data ? Buffer.from(await data.arrayBuffer()) : null
  }
  return readFile(path.join(UPLOAD_DIR, key)).catch(() => null)
}

/** A short-lived link the browser fetches straight from storage (ranges, caching, another origin). */
export async function signedUrl(name: string) {
  const { data } = await bucket().createSignedUrl(path.basename(name), 3600)
  return data?.signedUrl ?? null
}

/** Lets the browser upload straight to the bucket: a function body tops out at a few MB, a file does not. */
export async function uploadTicket(name: string) {
  const { data, error } = await bucket().createSignedUploadUrl(name)
  if (error) throw error
  return data.signedUrl
}

export async function fileSize(name: string) {
  const { data } = await bucket().info(name)
  return data?.size ?? null
}
