import { describe, expect, test } from "bun:test"
import { sanitizeArticle } from "./sanitize"
import { fromCsv, fromHtml } from "./import"
import { INK_TEXT, INKS } from "./drop"
import { isPrivateAddress } from "./safe-fetch"

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const c = parseInt(hex.slice(at, at + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}

describe("saved articles", () => {
  test("lose scripts, handlers, javascript: links and frames", () => {
    const out = sanitizeArticle(
      `<p onclick="x()">hi</p><img src=x onerror=alert(1)><a href="javascript:alert(1)">l</a>` +
        `<script>alert(1)</script><svg><script>1</script></svg><iframe src=//e></iframe><ul role="list" aria-label="x"><li>a</li></ul>`,
    )
    expect(out).not.toMatch(/on[a-z]+=|<script|javascript:|<iframe|role=|aria-/i)
    expect(out).toContain("<p>hi</p>")
  })
})

describe("import", () => {
  test("bookmark HTML keeps url, title and tags", () => {
    expect(fromHtml(`<DT><A HREF="https://a.com/x" TAGS="one,two">Title A</A>`)).toEqual([
      { url: "https://a.com/x", title: "Title A", tags: ["one", "two"] },
    ])
  })
  test("CSV handles quoted commas, doubled quotes and CRLF", () => {
    const csv = 'id,title,note,url,tags\r\n1,"A, b","say ""hi""",https://b.com,"x, y"\r\n2,skip,,not-a-url,\r\n'
    expect(fromCsv(csv)).toEqual([{ url: "https://b.com", title: "A, b", note: 'say "hi"', tags: ["x", "y"] }])
  })
})

describe("inks", () => {
  test("every ink clears AA as text on paper and at night", () => {
    for (const ink of Object.keys(INKS) as (keyof typeof INKS)[]) {
      for (const surface of ["#f4f1ea", "#fbf9f4"]) expect(contrast(INK_TEXT.light[ink], surface)).toBeGreaterThanOrEqual(4.5)
      for (const surface of ["#14120f", "#1c1a16"]) expect(contrast(INK_TEXT.dark[ink], surface)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe("pasted links in the cloud", () => {
  test("never reach private, loopback, link-local or metadata addresses", () => {
    for (const ip of ["127.0.0.1", "10.2.3.4", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])
      expect(isPrivateAddress(ip)).toBe(true)
    for (const ip of ["8.8.8.8", "93.184.216.34", "172.32.0.1", "2606:4700::1111"]) expect(isPrivateAddress(ip)).toBe(false)
  })
})

import { webUrl } from "./cards"

describe("saved links", () => {
  test("only http and https survive", () => {
    expect(webUrl("https://a.com/x")?.href).toBe("https://a.com/x")
    for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", "data:text/html,x", "vbscript:x", "file:///etc/passwd", "not a url"])
      expect(webUrl(bad)).toBeNull()
  })
  test("bookmark import drops script links", () => {
    expect(fromHtml(`<A HREF="javascript:alert(1)">x</A><A HREF="https://ok.com">ok</A>`).map((i) => i.url)).toEqual(["https://ok.com"])
  })
})

import { todosOf, toggleTodo } from "./checklist"

describe("to-dos in a note", () => {
  test("reads and flips checklist lines, leaves prose alone", () => {
    const note = "trip\n- [ ] book flight\n[x] pack\nnot a task"
    expect(todosOf(note)).toEqual([
      { index: 1, done: false, text: "book flight" },
      { index: 2, done: true, text: "pack" },
    ])
    expect(toggleTodo(note, 1)).toBe("trip\n- [x] book flight\n[x] pack\nnot a task")
    expect(toggleTodo(note, 3)).toBe(note)
  })
})

test("embeds only known players", async () => {
  const { embedOf } = await import("./embed")
  expect(embedOf("https://www.youtube.com/watch?v=abc123")?.src).toBe("https://www.youtube-nocookie.com/embed/abc123")
  expect(embedOf("https://youtu.be/xyz")?.src).toBe("https://www.youtube-nocookie.com/embed/xyz")
  expect(embedOf("https://youtube.com/shorts/s1")?.tall).toBe(true)
  expect(embedOf("https://vimeo.com/76979871")?.src).toBe("https://player.vimeo.com/video/76979871")
  expect(embedOf("https://open.spotify.com/album/1ATL")?.audio).toBe(true)
  expect(embedOf("https://example.com/watch?v=1")).toBeNull()
  expect(embedOf("javascript:alert(1)")).toBeNull()
})

test("wiki links", async () => {
  const { wikiTitles, withWikiLinks } = await import("./wiki")
  expect(wikiTitles("see [[SQS vs SNS]] and [[ Japan ]] and [[SQS vs SNS]]")).toEqual(["SQS vs SNS", "Japan"])
  expect(withWikiLinks("a [[B c]]")).toBe("a [B c](#wiki:B%20c)")
  expect(wikiTitles("[[]] [[a\nb]]")).toEqual([])
})
