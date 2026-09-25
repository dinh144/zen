package com.dinh144.zen.design

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.googlefonts.Font
import androidx.compose.ui.text.googlefonts.GoogleFont
import com.dinh144.zen.R

// Mirrors apps/web/app/layout.tsx's per-locale font swap: Zen Old Mincho (anything that
// speaks) + Zen Kaku Gothic New (labels/chrome) for English and Japanese — the Zen family
// is Japanese-designed and needs no swap there — with the web's own vietnamese/korean/
// chinese substitutes elsewhere. Loaded the same way next/font/google fetches them (once,
// cached), through Android's Downloadable Fonts instead of next/font's build-time fetch —
// same "don't commit binaries" shape, platform-native mechanism.
private val provider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs,
)

private fun family(name: String, vararg weights: FontWeight) =
    FontFamily(weights.map { weight -> Font(googleFont = GoogleFont(name), fontProvider = provider, weight = weight) })

private val ZenOldMincho = family("Zen Old Mincho", FontWeight.Normal, FontWeight.Medium)
private val ZenKakuGothicNew = family("Zen Kaku Gothic New", FontWeight.Light, FontWeight.Normal, FontWeight.Medium)
private val NotoSerif = family("Noto Serif", FontWeight.Normal)
private val BeVietnamPro = family("Be Vietnam Pro", FontWeight.Light, FontWeight.Normal, FontWeight.Medium)
private val NotoSerifKr = family("Noto Serif KR", FontWeight.Normal)
private val NotoSansKr = family("Noto Sans KR", FontWeight.Light, FontWeight.Normal, FontWeight.Medium)
private val NotoSerifSc = family("Noto Serif SC", FontWeight.Normal)
private val NotoSansSc = family("Noto Sans SC", FontWeight.Light, FontWeight.Normal, FontWeight.Medium)

data class ZenTypography(val display: FontFamily, val sans: FontFamily)

/** Picks the display/sans pair for a BCP-47 language tag, the same axis Android's own
 * resource system uses to pick values-<lang>/strings.xml (LocalConfiguration's locale). */
fun zenTypographyFor(language: String): ZenTypography = when (language) {
    "vi" -> ZenTypography(NotoSerif, BeVietnamPro)
    "ko" -> ZenTypography(NotoSerifKr, NotoSansKr)
    "zh" -> ZenTypography(NotoSerifSc, NotoSansSc)
    else -> ZenTypography(ZenOldMincho, ZenKakuGothicNew) // en, ja (and any other fallback)
}

@Composable
fun currentZenTypography(): ZenTypography =
    zenTypographyFor(LocalConfiguration.current.locales[0].language)
