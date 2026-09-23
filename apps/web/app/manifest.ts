import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "zen",
    short_name: "zen",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#f4f1ea",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
    // Android share sheet posts straight into the board.
    share_target: {
      action: "/share",
      method: "POST",
      enctype: "multipart/form-data",
      params: { title: "title", text: "text", url: "url", files: [{ name: "file", accept: ["image/*", "video/*", "application/pdf"] }] },
    },
  } as MetadataRoute.Manifest
}
