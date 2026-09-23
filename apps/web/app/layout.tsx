import type { Metadata } from "next"
import {
  Be_Vietnam_Pro,
  Noto_Sans_KR,
  Noto_Sans_SC,
  Noto_Serif,
  Noto_Serif_KR,
  Noto_Serif_SC,
  Zen_Kaku_Gothic_New,
  Zen_Old_Mincho,
} from "next/font/google"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { DropProvider } from "@/components/drop-state"
import { cookies, headers } from "next/headers"
import { LocaleProvider } from "@/components/locale"
import { Toaster } from "@workspace/ui/components/toast"
import { LOCALES, type Locale } from "@/lib/i18n"
import { cn } from "@workspace/ui/lib/utils"

// 禅: an ink serif for the voice, a quiet gothic for everything else.
const display = Zen_Old_Mincho({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-display-en" })
const sans = Zen_Kaku_Gothic_New({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-sans-en" })

// The Zen family carries no Vietnamese diacritics, so Vietnamese gets its own pair.
// Noto Serif is variable; naming weights breaks the Turbopack font pipeline.
const displayVi = Noto_Serif({ subsets: ["vietnamese", "latin"], variable: "--font-display-vi" })
const sansVi = Be_Vietnam_Pro({ subsets: ["vietnamese", "latin"], weight: ["300", "400", "500"], variable: "--font-sans-vi" })

// Same for Korean and Chinese; this build's font data has no korean/chinese-simplified subset to preload, so preload is off.
const displayKo = Noto_Serif_KR({ preload: false, variable: "--font-display-ko" })
const sansKo = Noto_Sans_KR({ preload: false, weight: ["300", "400", "500"], variable: "--font-sans-ko" })
const displayZh = Noto_Serif_SC({ preload: false, variable: "--font-display-zh" })
const sansZh = Noto_Sans_SC({ preload: false, weight: ["300", "400", "500"], variable: "--font-sans-zh" })
// Japanese: Zen Old Mincho / Zen Kaku Gothic New are Japanese fonts already, no extra pair needed.

export const metadata: Metadata = {
  title: "zen ai",
  description: "Save anything. Find it by describing it.",
  manifest: "/manifest.webmanifest",
}

/** The saved language, else the first of the browser's languages zen speaks, else English. */
async function localeFor(): Promise<Locale> {
  const saved = (await cookies()).get("zen_locale")?.value
  if (LOCALES.includes(saved as Locale)) return saved as Locale
  const wanted = ((await headers()).get("accept-language") ?? "").split(",").map((part) => part.trim().slice(0, 2).toLowerCase())
  return (wanted.find((code) => LOCALES.includes(code as Locale)) as Locale | undefined) ?? "en"
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await localeFor()
  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "antialiased",
        sans.variable,
        display.variable,
        sansVi.variable,
        displayVi.variable,
        sansKo.variable,
        displayKo.variable,
        sansZh.variable,
        displayZh.variable,
      )}
    >
      <body className="bg-background text-foreground font-sans font-light">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LocaleProvider initial={locale}>
            <DropProvider>
              <Toaster>{children}</Toaster>
            </DropProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
