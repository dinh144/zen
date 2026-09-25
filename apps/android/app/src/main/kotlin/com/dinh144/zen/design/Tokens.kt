package com.dinh144.zen.design

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

// Transcribed from DESIGN.md's Visual decisions and packages/ui/src/styles/globals.css
// (:root / .dark). Paper is the default surface; dark is the same ink at night, not a
// different product.
object ZenPalette {
    val paperLight = Color(0xFFF4F1EA)
    val sheetLight = Color(0xFFFBF9F4)
    val inkLight = Color(0xFF1A1A18)
    val hairlineLight = Color(0xFFDED7C8)
    val mutedInkLight = Color(0xFF6F6A5F)
    val sealLight = Color(0xFFB23A2F)
    val inkWashLight = Color(0x0F1A1A18) // rgba(26, 26, 24, 0.06)

    val paperDark = Color(0xFF14120F)
    val sheetDark = Color(0xFF1C1A16)
    val inkDark = Color(0xFFEFE9DC)
    val hairlineDark = Color(0xFF2C2821)
    val mutedInkDark = Color(0xFF948C7D)
    val sealDark = Color(0xFFD3645A)
    val inkWashDark = Color(0x12EFE9DC) // rgba(239, 233, 220, 0.07)

    // radius 2dp, hairlines, one 1px ink shadow — no Material look anywhere in this app.
    val radius = 2.dp
    val hairlineWidth = 1.dp
    val shadowWidth = 1.dp
}
