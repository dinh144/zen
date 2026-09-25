package com.dinh144.zen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.dinh144.zen.design.Ink
import com.dinh144.zen.design.Mood
import com.dinh144.zen.design.ZenButton
import com.dinh144.zen.design.ZenDrop
import com.dinh144.zen.design.ZenTheme
import com.dinh144.zen.design.paperGrain

// Sign-in placeholder for ticket 03 (sign-in and sign-out wipe) — findable for the Maestro
// smoke flow (flows/smoke.yaml). Wearing the sumi-e look from the design system (ticket 02):
// paper, grain, the drop, no Material.
@Composable
fun SignInScreen(modifier: Modifier = Modifier, onOpenSampler: (() -> Unit)? = null) {
    ZenTheme {
        val colors = ZenTheme.colors
        Column(
            modifier = modifier
                .background(colors.paper)
                .paperGrain(darkTheme = colors.darkTheme)
                .testTag("signin.screen"),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp, Alignment.CenterVertically),
        ) {
            ZenDrop(ink = Ink.Sumi, mood = Mood.Suspicious) // the password/sign-in state's mood
            ZenButton(
                text = stringResource(R.string.login_google),
                onClick = { },
                modifier = Modifier.testTag("signin.google"),
            )
            if (onOpenSampler != null && BuildConfig.DEBUG) {
                BasicText(
                    text = "design sampler",
                    style = TextStyle(color = colors.mutedInk),
                    modifier = Modifier
                        .padding(8.dp)
                        .clickable(onClick = onOpenSampler)
                        .testTag("signin.sampler"),
                )
            }
        }
    }
}
