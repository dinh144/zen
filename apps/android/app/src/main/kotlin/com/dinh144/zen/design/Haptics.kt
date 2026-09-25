package com.dinh144.zen.design

import android.view.HapticFeedbackConstants
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalView
import kotlinx.coroutines.delay

// Spec story 189: "haptics mapped to meaning (a soft tick when a card settles, a firmer
// one when I set something down, a double tick on tie), following my system haptics
// setting". View.performHapticFeedback already checks Settings.System.HAPTIC_FEEDBACK_ENABLED
// itself, so nothing here has to.
enum class ZenHaptic(internal val primitive: Int) {
    CardSettle(HapticFeedbackConstants.CLOCK_TICK), // soft tick — a card settles, tags land
    SetDown(HapticFeedbackConstants.CONFIRM), // firmer — a capture is set down
    LetGo(HapticFeedbackConstants.REJECT), // letting go of a card
    AiUnreachable(HapticFeedbackConstants.REJECT), // the angry mood
}

class ZenHapticPlayer(private val view: View) {
    fun play(event: ZenHaptic) {
        view.performHapticFeedback(event.primitive)
    }

    /** Tie: "a double tick" — Android has no single primitive for that, so this fires the
     * soft tick twice, a beat apart. */
    suspend fun playTie() {
        play(ZenHaptic.CardSettle)
        delay(70)
        play(ZenHaptic.CardSettle)
    }
}

@Composable
fun rememberZenHaptics(): ZenHapticPlayer {
    val view = LocalView.current
    return remember(view) { ZenHapticPlayer(view) }
}
