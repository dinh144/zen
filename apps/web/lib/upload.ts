import { randomUUID } from "node:crypto"
import path from "node:path"
import type { Kind } from "./types"
import { putFile } from "./storage"
import { posterFrame } from "./video"

// Browsers send a type; curl and some share sheets send octet-stream, so fall back to the name.
const kindOf = (mime: string, name: string): Kind => {
  const extension = path.extname(name).toLowerCase()
  if (mime === "application/pdf" || extension === ".pdf") return "pdf"
  if (mime.startsWith("video/") || [".mp4", ".webm", ".mov", ".m4v"].includes(extension)) return "video"
  // A voice note becomes a note once it is transcribed.
  if (mime.startsWith("audio/")) return "note"
  if (mime.startsWith("image/") || [".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"].includes(extension))
    return "image"
  return "file"
}

export const MAX_UPLOAD = 50 * 1024 * 1024

/** A flat storage name that says whose it is, so a finished upload can be checked against its owner. */
export const uploadName = (me: string, original: string) =>
  `${me}-${randomUUID()}${path.extname(original).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin"}`

/** The card fields for a stored file. A video needs a still before anything can look at it. */
export async function describeUpload(name: string, original: string, type: string, size: number, bytes?: Uint8Array) {
  const kind = kindOf(type, original)
  const poster = kind === "video" && bytes ? await posterFrame(bytes) : null
  return { kind, image_path: name, meta: { file: name, mime: type, bytes: size, ...(poster ?? {}) } }
}

/** Stores an uploaded file and says what kind of card it makes: the rail, drop, paste and share sheet all land here. */
export async function storeUpload(me: string, file: File) {
  const name = uploadName(me, file.name)
  const bytes = new Uint8Array(await file.arrayBuffer())
  await putFile(name, bytes, file.type)
  return describeUpload(name, file.name, file.type, file.size, bytes)
}
