import { lookup } from "node:dns/promises"
import { isIPv4 } from "node:net"

// 0/8, 10/8, 100.64/10, 127/8, 169.254/16 (cloud metadata), 172.16/12, 192.168/16, 224/4 and up.
const PRIVATE_V4: [number, number][] = [
  [0x00000000, 8], [0x0a000000, 8], [0x64400000, 10], [0x7f000000, 8],
  [0xa9fe0000, 16], [0xac100000, 12], [0xc0a80000, 16], [0xe0000000, 4],
]

export function isPrivateAddress(ip: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip)?.[1]
  if (mapped) return isPrivateAddress(mapped)
  if (isIPv4(ip)) {
    const n = ip.split(".").reduce((acc, part) => acc * 256 + Number(part), 0)
    return PRIVATE_V4.some(([base, bits]) => n >>> (32 - bits) === base >>> (32 - bits))
  }
  const v6 = ip.toLowerCase()
  return v6 === "::" || v6 === "::1" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6)
}

/**
 * fetch for URLs people paste: in the cloud, never reach the server's own network.
 * Every redirect hop is resolved and checked again.
 * ponytail: resolve-then-fetch leaves a DNS-rebinding window; pin the resolved IP if that matters.
 */
export async function safeFetch(url: string, init: RequestInit = {}, guard = true) {
  let next = url
  for (let hop = 0; hop < 6; hop++) {
    const target = new URL(next)
    if (target.protocol !== "http:" && target.protocol !== "https:") throw new Error("blocked scheme")
    if (guard) {
      const addresses = await lookup(target.hostname.replace(/^\[|\]$/g, ""), { all: true })
      if (addresses.some(({ address }) => isPrivateAddress(address))) throw new Error("blocked address")
    }
    const res = await fetch(next, { ...init, redirect: "manual" })
    const location = res.headers.get("location")
    if (res.status >= 300 && res.status < 400 && location) {
      next = new URL(location, next).href
      continue
    }
    return res
  }
  throw new Error("too many redirects")
}
