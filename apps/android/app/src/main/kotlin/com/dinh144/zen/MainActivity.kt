package com.dinh144.zen

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.testTagsAsResourceId
import com.dinh144.zen.design.SamplerScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            // Enables Maestro's `id:` selector (UiAutomator's By.res) to find every
            // Modifier.testTag below, per the screen.element convention in flows/README.md.
            val modifier = Modifier
                .fillMaxSize()
                .semantics { testTagsAsResourceId = true }
            // Debug-only design-system sampler (ticket 02), reached from signin.sampler —
            // BuildConfig.DEBUG-gated inside SignInScreen, never shown in release.
            var showSampler by remember { mutableStateOf(false) }
            if (showSampler) {
                SamplerScreen(modifier = modifier)
            } else {
                SignInScreen(modifier = modifier, onOpenSampler = { showSampler = true })
            }
        }
    }
}
