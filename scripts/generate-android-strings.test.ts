import { describe, expect, test } from "bun:test"
import { escapeAndroidString, renderStringsXml } from "./generate-android-strings"
import { LOCALES, STRINGS } from "../apps/web/lib/i18n"

describe("escapeAndroidString", () => {
  test("escapes XML entities and quotes/backslashes, wraps in double quotes", () => {
    expect(escapeAndroidString(`R&D <"cost"> \\`)).toBe('"R&amp;D &lt;\\"cost\\"&gt; \\\\"')
  })

  test("leaves apostrophes untouched (unescaped, inside the wrapping quotes)", () => {
    expect(escapeAndroidString("it's fine")).toBe(`"it's fine"`)
  })
})

describe("renderStringsXml", () => {
  const fixture = {
    group: {
      plain: ["vi-plain", "en-plain", "ko-plain", "zh-plain", "ja-plain"],
      footer: ["vi-local", "en-local", "ko-local", "zh-local", "ja-local"],
      footerCloud: ["vi-cloud", "en-cloud", "ko-cloud", "zh-cloud", "ja-cloud"],
    },
  }

  test("emits one <string> per non-Cloud key, in the requested locale", () => {
    const xml = renderStringsXml(fixture, 1) // en
    expect(xml).toContain('<string name="group_plain">"en-plain"</string>')
  })

  test("prefers the Cloud sibling's value under the plain key name, and drops the Cloud key itself", () => {
    const xml = renderStringsXml(fixture, 1) // en
    expect(xml).toContain('<string name="group_footer">"en-cloud"</string>')
    expect(xml).not.toContain("footerCloud")
    expect(xml).not.toContain('"en-local"')
  })

  test("every *Cloud key in the real i18n source has a matching base key (so no content is silently dropped)", () => {
    for (const entries of Object.values(STRINGS)) {
      for (const key of Object.keys(entries)) {
        if (key.endsWith("Cloud")) {
          const base = key.slice(0, -"Cloud".length)
          expect(base in entries).toBe(true)
        }
      }
    }
  })

  test("real i18n source renders to valid, non-empty XML for every locale with no leftover raw '&' or 'Cloud' names", () => {
    for (let i = 0; i < LOCALES.length; i++) {
      const xml = renderStringsXml(STRINGS, i)
      expect(xml.startsWith("<?xml")).toBe(true)
      expect(xml).not.toMatch(/name="\w+Cloud"/)
      expect(xml).not.toMatch(/&(?!amp;|lt;|gt;)/) // no un-escaped bare '&'
    }
  })
})
