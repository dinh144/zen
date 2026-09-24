// Generates Android string resources for all five locales from the web's language source
// (apps/web/lib/i18n.ts), so the five languages never drift between web and Android.
//   bun scripts/generate-android-strings.ts
// Run with the repo root as the working directory — apps/android/build.gradle.kts's
// `generateStrings` task does this on every Android build, before resources are merged.
//
// Mirrors lib/i18n.ts's translate(): when a group has both `key` and `keyCloud`, Android
// (always cloud mode) gets the `keyCloud` copy under the plain `key` resource name.
import { STRINGS, LOCALES } from "../apps/web/lib/i18n.ts"

export const LOCALE_DIRS: Record<string, string> = {
  vi: "values", // Vietnamese is the default source locale (no qualifier).
  en: "values-en",
  ko: "values-ko",
  zh: "values-zh",
  ja: "values-ja",
}

const OUT_ROOT = "apps/android/build/generated-strings"

export function escapeAndroidString(value: string): string {
  const xml = value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const quoted = xml.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  return `"${quoted}"` // quoting the whole value means apostrophes need no escaping
}

export function renderStringsXml(strings: Record<string, Record<string, readonly string[]>>, localeIndex: number): string {
  const lines = ['<?xml version="1.0" encoding="utf-8"?>', "<resources>"]
  for (const [group, entries] of Object.entries(strings)) {
    for (const [key, values] of Object.entries(entries)) {
      if (key.endsWith("Cloud")) continue // folded into its base key below
      const cloudKey = `${key}Cloud`
      const tuple = cloudKey in entries ? entries[cloudKey]! : values
      lines.push(`    <string name="${group}_${key}">${escapeAndroidString(tuple[localeIndex]!)}</string>`)
    }
  }
  lines.push("</resources>", "")
  return lines.join("\n")
}

if (import.meta.main) {
  for (const [localeIndex, locale] of LOCALES.entries()) {
    await Bun.write(`${OUT_ROOT}/${LOCALE_DIRS[locale]}/strings.xml`, renderStringsXml(STRINGS, localeIndex))
  }
  console.log(`wrote Android strings for ${LOCALES.length} locales to ${OUT_ROOT}`)
}
