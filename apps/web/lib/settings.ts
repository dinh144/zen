import { sql } from "./db"

// What each locale is called when a model is asked to write in it.
export const LANGUAGE_NAMES: Record<string, string> = {
  vi: "Vietnamese",
  en: "English",
  ko: "Korean",
  zh: "Simplified Chinese",
  ja: "Japanese",
}

export async function localeOf(me: string) {
  const [row] = await sql<{ locale: string }[]>`SELECT locale FROM user_settings WHERE user_id = ${me}`
  return row?.locale ?? "vi"
}

export const languageOf = async (me: string) => LANGUAGE_NAMES[await localeOf(me)] ?? "Vietnamese"

export async function setLocale(me: string, locale: string) {
  if (!(locale in LANGUAGE_NAMES)) return false
  await sql`INSERT INTO user_settings (user_id, locale) VALUES (${me}, ${locale})
    ON CONFLICT (user_id) DO UPDATE SET locale = excluded.locale, updated_at = now()`
  return true
}
