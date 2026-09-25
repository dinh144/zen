package com.dinh144.zen.design

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Debug-only design-system gallery: every base component and every one of the sixteen
// moods, in light and dark, plus a glyph-coverage line per locale's font pair. Reached
// from `signin.sampler` in debug builds only (MainActivity.kt) — never shipped in release.
// Maestro: flows/design-sampler.yaml.

// Vietnamese, Korean, Chinese, Japanese glyph-coverage lines, one per locale's font pair
// (Type.kt), rendered here so the Maestro recording is the record of "verified": if a
// glyph were missing from a font, it would show as tofu in that recording.
private val glyphSamples = listOf(
    "en" to "the drop settles",
    "vi" to "giọt mực lắng xuống",
    "ko" to "먹물 한 방울이 가라앉는다",
    "zh" to "墨滴落定",
    "ja" to "墨の雫が落ち着く",
)

@Composable
fun SamplerScreen(modifier: Modifier = Modifier) {
    Column(modifier = modifier.testTag("sampler.screen").verticalScroll(rememberScrollState())) {
        SamplerSection(darkTheme = false)
        SamplerSection(darkTheme = true)
    }
}

@Composable
private fun SamplerSection(darkTheme: Boolean) {
    ZenTheme(darkTheme = darkTheme) {
        val colors = ZenTheme.colors
        val suffix = if (darkTheme) "dark" else "light"
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(colors.paper)
                .paperGrain(darkTheme)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            BasicText(
                text = if (darkTheme) "dark" else "light",
                style = TextStyle(color = colors.mutedInk, fontFamily = ZenTheme.typography.sans, fontSize = 12.sp),
            )

            // Components: button, text field inked on focus, sheet, card shell.
            ZenButton(text = "set it down", onClick = {}, modifier = Modifier.testTag("sampler.button.$suffix"))

            var fieldValue by remember { mutableStateOf("") }
            ZenTextField(
                value = fieldValue,
                onValueChange = { fieldValue = it },
                modifier = Modifier.fillMaxWidth().testTag("sampler.textfield.$suffix"),
            )

            ZenSheet(modifier = Modifier.fillMaxWidth().padding(4.dp).testTag("sampler.sheet.$suffix")) {
                BasicText(
                    text = "a sheet laid on the desk",
                    style = TextStyle(color = colors.ink, fontFamily = ZenTheme.typography.display),
                    modifier = Modifier.padding(12.dp),
                )
            }

            ZenCardShell(
                modifier = Modifier.fillMaxWidth().testTag("sampler.card.$suffix"),
                onClick = {},
            ) {
                BasicText(
                    text = "a card shell, tap for the ripple",
                    style = TextStyle(color = colors.ink, fontFamily = ZenTheme.typography.sans),
                    modifier = Modifier.padding(12.dp),
                )
            }

            // The sixteen moods, each in a different ink so every ink shows up somewhere too.
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(Mood.entries.toList()) { mood ->
                    val ink = Ink.entries[mood.ordinal % Ink.entries.size]
                    Column(modifier = Modifier.testTag("sampler.mood.${mood.name.lowercase()}.$suffix")) {
                        ZenDrop(ink = ink, mood = mood)
                        BasicText(
                            text = mood.name.lowercase(),
                            style = TextStyle(color = colors.mutedInk, fontFamily = ZenTheme.typography.sans, fontSize = 10.sp),
                        )
                    }
                }
            }

            // Glyph coverage per locale — see the module doc comment above.
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                glyphSamples.forEach { (locale, text) ->
                    val typography = zenTypographyFor(locale)
                    Row(modifier = Modifier.testTag("sampler.glyphs.$locale.$suffix")) {
                        BasicText(
                            text = text,
                            style = TextStyle(color = colors.ink, fontFamily = typography.display, fontSize = 16.sp),
                        )
                    }
                }
            }
        }
    }
}
