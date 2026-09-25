package com.dinh144.zen.design

import androidx.compose.ui.graphics.Color

// The twelve inks — same hues as apps/web/lib/drop.ts's INKS, re-lit per theme by that
// file's readable() until each clears WCAG AA on paper/sheet or night's paper/sheet
// (contrast >= 4.6, matching readable()'s threshold). `raw` is the brand hue itself, used
// for fills (the drop, the seal); `onLight`/`onDark` are the AA-safe values for text and
// are generated, not hand-picked — see `bun -e` snippet in this ticket's commit message
// for how they were produced from lib/drop.ts.
enum class Ink(val raw: Color, val onLight: Color, val onDark: Color) {
    Sumi(Color(0xFF1A1A18), Color(0xFF1A1A18), Color(0xFF84847A)),
    Earth(Color(0xFF8B5A2B), Color(0xFF8B5A2B), Color(0xFFB67638)),
    Vermilion(Color(0xFFB23A2F), Color(0xFFB23A2F), Color(0xFFD3645A)),
    Persimmon(Color(0xFFE07A35), Color(0xFFA9541A), Color(0xFFE07A35)),
    Saffron(Color(0xFFD9A227), Color(0xFF876518), Color(0xFFD9A227)),
    Moss(Color(0xFF4F7D52), Color(0xFF49744C), Color(0xFF5B905E)),
    Jade(Color(0xFF2F8F7F), Color(0xFF27786B), Color(0xFF309382)),
    Indigo(Color(0xFF3A5CA8), Color(0xFF3A5CA8), Color(0xFF6584CA)),
    Wisteria(Color(0xFF7A5CAD), Color(0xFF7A5CAD), Color(0xFF937BBC)),
    Plum(Color(0xFFB8508A), Color(0xFFAD4680), Color(0xFFC16699)),
    Stone(Color(0xFF8A8478), Color(0xFF6F6A60), Color(0xFF8A8478)),
    Shell(Color(0xFFD9CFBC), Color(0xFF7D6A47), Color(0xFFD9CFBC));

    fun text(darkTheme: Boolean): Color = if (darkTheme) onDark else onLight
}
