import { open } from "node:fs/promises"
import path from "node:path"
import { UPLOAD_DIR as DIR, signedUrl } from "@/lib/storage"
import { cloud } from "@/lib/supabase"

const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  svg: "image/svg+xml",
}

const RASTER = ["png", "jpg", "jpeg", "gif", "webp", "avif"]

export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  if (name.includes("/") || name.includes("..")) return new Response("no", { status: 400 })
  // In the cloud the bucket serves it from its own origin, with ranges and caching.
  if (cloud) {
    const url = await signedUrl(name)
    return url ? Response.redirect(url, 302) : new Response("not found", { status: 404 })
  }
  const ext = path.extname(name).slice(1).toLowerCase()
  const type = TYPES[ext] ?? (RASTER.includes(ext) ? `image/${ext}` : "application/octet-stream")
  const headers: Record<string, string> = {
    "content-type": type,
    "cache-control": "public, max-age=31536000, immutable",
    "accept-ranges": "bytes",
    "x-content-type-options": "nosniff",
  }
  // Uploads are whatever people dropped in: an SVG (or anything odd) must never run as zen's own page.
  // PDFs, video and raster images stay unsandboxed so the PDF viewer and <video> still work.
  if (!(ext === "pdf" || type.startsWith("video/") || RASTER.includes(ext))) {
    headers["content-security-policy"] = "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"
  }
  let file
  try {
    file = await open(path.join(DIR, name))
  } catch {
    return new Response("not found", { status: 404 })
  }
  try {
    const { size } = await file.stat()
    // Video players seek with Range requests; Safari refuses to play without them.
    const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "")
    if (!range || (!range[1] && !range[2])) {
      const buf = await file.readFile()
      return new Response(new Uint8Array(buf), { headers: { ...headers, "content-length": String(size) } })
    }
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
    if (start >= size || start > end)
      return new Response(null, { status: 416, headers: { ...headers, "content-range": `bytes */${size}` } })
    const buf = new Uint8Array(end - start + 1)
    await file.read(buf, 0, buf.length, start)
    return new Response(buf, {
      status: 206,
      headers: { ...headers, "content-range": `bytes ${start}-${end}/${size}`, "content-length": String(buf.length) },
    })
  } finally {
    await file.close()
  }
}
