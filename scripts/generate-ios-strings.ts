// Generates an Apple String Catalog (Localizable.xcstrings) for all five locales from the
// web's language source (apps/web/lib/i18n.ts), so the five languages never drift between
// web, Android and iOS.
//   bun scripts/generate-ios-strings.ts
// Run with the repo root as the working directory — apps/ios/project.yml's "Generate string
// catalog" build phase does this on every iOS build, before resources compile.
//
// Mirrors scripts/generate-android-strings.ts: when a group has both `key` and `keyCloud`,
// iOS (always cloud mode) gets the `keyCloud` copy under the plain `key` catalog entry.
import { LOCALES, STRINGS } from "../apps/web/lib/i18n.ts"

const OUT_PATH = "apps/ios/build/generated-strings/Localizable.xcstrings"

export function buildCatalog(strings: Record<string, Record<string, readonly string[]>>): object {
  const catalogStrings: Record<string, unknown> = {}
  for (const [group, entries] of Object.entries(strings)) {
    for (const [key, values] of Object.entries(entries)) {
      if (key.endsWith("Cloud")) continue // folded into its base key below
      const cloudKey = `${key}Cloud`
      const tuple = cloudKey in entries ? entries[cloudKey]! : values
      const localizations: Record<string, unknown> = {}
      for (const [localeIndex, locale] of LOCALES.entries()) {
        localizations[locale] = { stringUnit: { state: "translated", value: tuple[localeIndex]! } }
      }
      catalogStrings[`${group}_${key}`] = { localizations }
    }
  }
  return { sourceLanguage: "vi", strings: catalogStrings, version: "1.0" }
}

if (import.meta.main) {
  await Bun.write(OUT_PATH, JSON.stringify(buildCatalog(STRINGS), null, 2) + "\n")
  console.log(`wrote iOS string catalog for ${LOCALES.length} locales to ${OUT_PATH}`)
}
