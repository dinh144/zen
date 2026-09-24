package com.dinh144.zen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp

// Placeholder for ticket 03 (sign-in and sign-out wipe). This scaffold only needs a real,
// findable screen for the Maestro smoke flow (flows/smoke.yaml) — the sumi-e look comes with
// the design system in ticket 02.
@Composable
fun SignInScreen(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.White)
            .testTag("signin.screen"),
        contentAlignment = Alignment.Center,
    ) {
        BasicText(
            text = stringResource(R.string.login_google),
            modifier = Modifier
                .padding(16.dp)
                .clickable { }
                .testTag("signin.google"),
        )
    }
}
