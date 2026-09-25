package com.dinh144.zen.design

import android.provider.Settings
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.SpringSpec
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

// DESIGN.md's Visual decisions: "300-700ms, cubic-bezier(0.22, 1, 0.36, 1)", plus springs
// for direct manipulation (drag, pinch) — spec's Implementation Decisions, Motion.
object ZenMotion {
    val Easing = CubicBezierEasing(0.22f, 1f, 0.36f, 1f)
    const val FAST_MS = 300
    const val SLOW_MS = 700

    fun <T> tween(durationMillis: Int = SLOW_MS) = tween<T>(durationMillis, easing = Easing)

    fun <T> directManipulation(): SpringSpec<T> =
        spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessMedium)
}

/**
 * True when Android's animator duration scale is 0 (Settings > Accessibility > Remove
 * animations, or a developer-options override) — spec: "Reduced motion (animator duration
 * scale 0 or 'remove animations') collapses everything to instant changes."
 */
@Composable
fun rememberReducedMotion(): Boolean {
    val context = LocalContext.current
    return remember(context) {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    }
}

/** Every animated value in this app should read its duration through this, so reduced
 * motion collapses it to an instant change with no other call site needing to know. */
@Composable
fun zenDurationMillis(full: Int = ZenMotion.SLOW_MS): Int = if (rememberReducedMotion()) 0 else full
