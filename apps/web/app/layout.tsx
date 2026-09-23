import type { Metadata } from "next"
import { Be_Vietnam_Pro, Noto_Serif, Zen_Kaku_Gothic_New, Zen_Old_Mincho } from "next/font/google"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { DropProvider } from "@/components/drop-state"
import { LocaleProvider } from "@/components/locale"
import { cn } from "@workspace/ui/lib/utils"

// 禅: an ink serif for the voice, a quiet gothic for everything else.
const display = Zen_Old_Mincho({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-display-en" })
const sans = Zen_Kaku_Gothic_New({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-sans-en" })

// The Zen family carries no Vietnamese diacritics, so Vietnamese gets its own pair.
// Noto Serif is variable; naming weights breaks the Turbopack font pipeline.
const displayVi = Noto_Serif({ subsets: ["vietnamese", "latin"], variable: "--font-display-vi" })
const sansVi = Be_Vietnam_Pro({ subsets: ["vietnamese", "latin"], weight: ["300", "400", "500"], variable: "--font-sans-vi" })

export const metadata: Metadata = {
  title: "zen",
  description: "Mực trên giấy cho mọi thứ bạn muốn giữ lại.",
  manifest: "/manifest.webmanifest",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={cn("antialiased", sans.variable, display.variable, sansVi.variable, displayVi.variable)}
    >
      <body className="bg-background text-foreground font-sans font-light">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LocaleProvider>
            <DropProvider>{children}</DropProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
