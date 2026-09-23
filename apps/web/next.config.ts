import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  // Native and DOM-heavy modules must stay outside the bundle.
  serverExternalPackages: ["unpdf", "@napi-rs/canvas", "sharp", "jsdom", "@mozilla/readability"],
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        // Only zen frames zen (its own PDF viewer; no clickjacking), no type sniffing, no leaked referrers.
        { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],
}

export default nextConfig
