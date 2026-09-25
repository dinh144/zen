import { describe, expect, test } from "bun:test"
import { buildCatalog } from "./generate-ios-strings"
import { LOCALES, STRINGS } from "../apps/web/lib/i18n"

describe("buildCatalog", () => {
  const fixture = {
    group: {
      plain: ["vi-plain", "en-plain", "ko-plain", "zh-plain", "ja-plain"],
      footer: ["vi-local", "en-local", "ko-local", "zh-local", "ja-local"],
      footerCloud: ["vi-cloud", "en-cloud", "ko-cloud", "zh-cloud", "ja-cloud"],
    },
  }

  test("emits one entry per non-Cloud key, with every locale's value", () => {
    const catalog = buildCatalog(fixture) as any
    expect(catalog.strings.group_plain.localizations.en.stringUnit.value).toBe("en-plain")
    expect(catalog.strings.group_plain.localizations.vi.stringUnit.value).toBe("vi-plain")
  })

  test("prefers the Cloud sibling's value under the plain key name, and drops the Cloud key itself", () => {
    const catalog = buildCatalog(fixture) as any
    expect(catalog.strings.group_footer.localizations.en.stringUnit.value).toBe("en-cloud")
    expect(catalog.strings.group_footerCloud).toBeUndefined()
  })

  test("emits sourceLanguage vi and version 1.0", () => {
    const catalog = buildCatalog(fixture) as any
    expect(catalog.sourceLanguage).toBe("vi")
    expect(catalog.version).toBe("1.0")
  })

  test("real i18n source has every locale for every non-Cloud key", () => {
    const catalog = buildCatalog(STRINGS) as any
    for (const [group, entries] of Object.entries(STRINGS)) {
      for (const key of Object.keys(entries)) {
        if (key.endsWith("Cloud")) continue
        for (const locale of LOCALES) {
          expect(catalog.strings[`${group}_${key}`].localizations[locale].stringUnit.value).toBeTruthy()
        }
      }
    }
  })
})
