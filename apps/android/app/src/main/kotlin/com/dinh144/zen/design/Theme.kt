package com.dinh144.zen.design

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily

data class ZenColors(
    val paper: Color,
    val sheet: Color,
    val ink: Color,
    val hairline: Color,
    val mutedInk: Color,
    val seal: Color,
    val inkWash: Color,
    val darkTheme: Boolean,
)

private val LightZenColors = ZenColors(
    paper = ZenPalette.paperLight,
    sheet = ZenPalette.sheetLight,
    ink = ZenPalette.inkLight,
    hairline = ZenPalette.hairlineLight,
    mutedInk = ZenPalette.mutedInkLight,
    seal = ZenPalette.sealLight,
    inkWash = ZenPalette.inkWashLight,
    darkTheme = false,
)

private val DarkZenColors = ZenColors(
    paper = ZenPalette.paperDark,
    sheet = ZenPalette.sheetDark,
    ink = ZenPalette.inkDark,
    hairline = ZenPalette.hairlineDark,
    mutedInk = ZenPalette.mutedInkDark,
    seal = ZenPalette.sealDark,
    inkWash = ZenPalette.inkWashDark,
    darkTheme = true,
)

private val LocalZenColors = staticCompositionLocalOf { LightZenColors }
private val LocalZenTypography = staticCompositionLocalOf { ZenTypography(display = FontFamily.Default, sans = FontFamily.Default) }

/** zen's design system, on Compose foundation only — no Material dependency, no Material look. */
object ZenTheme {
    val colors: ZenColors
        @Composable get() = LocalZenColors.current

    val typography: ZenTypography
        @Composable get() = LocalZenTypography.current
}

@Composable
fun ZenTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    CompositionLocalProvider(
        LocalZenColors provides if (darkTheme) DarkZenColors else LightZenColors,
        LocalZenTypography provides currentZenTypography(),
        content = content,
    )
}
