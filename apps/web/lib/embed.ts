/** A player URL for links from platforms that allow embedding, or null. */
export function embedOf(url: string | null): { src: string; tall?: boolean; audio?: boolean } | null {
  if (!url) return null
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const host = u.hostname.replace(/^(www|m)\./, "")
  const path = u.pathname.split("/").filter(Boolean)
  if (host === "youtube.com" || host === "music.youtube.com") {
    const id = u.searchParams.get("v") ?? (["shorts", "embed", "live"].includes(path[0] ?? "") ? path[1] : null)
    return id ? { src: `https://www.youtube-nocookie.com/embed/${id}`, tall: path[0] === "shorts" } : null
  }
  if (host === "youtu.be" && path[0]) return { src: `https://www.youtube-nocookie.com/embed/${path[0]}` }
  if (host === "vimeo.com" && /^\d+$/.test(path[0] ?? "")) return { src: `https://player.vimeo.com/video/${path[0]}` }
  if (host === "loom.com" && path[0] === "share" && path[1]) return { src: `https://www.loom.com/embed/${path[1]}` }
  if (host === "tiktok.com" && path[1] === "video" && path[2]) return { src: `https://www.tiktok.com/embed/v2/${path[2]}`, tall: true }
  if (host === "open.spotify.com" && ["track", "album", "playlist", "episode", "show"].includes(path[0] ?? "") && path[1])
    return { src: `https://open.spotify.com/embed/${path[0]}/${path[1]}`, audio: true }
  return null
}
