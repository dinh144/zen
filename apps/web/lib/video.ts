import { execFile } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { putFile } from "./storage"

const run = promisify(execFile)

/** One frame and the duration — enough to show a video card and to tag it. Needs ffmpeg on the host. */
export async function posterFrame(video: Uint8Array) {
  const dir = await mkdtemp(path.join(tmpdir(), "zen-"))
  try {
    const file = path.join(dir, "in")
    const frame = path.join(dir, "frame.jpg")
    await writeFile(file, video)
    await run("ffmpeg", ["-y", "-ss", "1", "-i", file, "-frames:v", "1", "-vf", "scale=768:-1", frame])
    const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file])
    const name = `${randomUUID()}.jpg`
    await putFile(name, await readFile(frame), "image/jpeg")
    return { poster: name, duration: Math.round(Number(stdout.trim()) || 0) }
  } catch {
    return null
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
