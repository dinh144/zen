package com.dinh144.zen.design

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.unit.dp

// zen's mark: a drop of ink with a face, sixteen moods — a 1:1 port of
// apps/web/lib/drop.ts's DROP_PATH and FACE_MARKUP (same 24x32 coordinate space, same
// control points) so the drop is pixel-identical to the web's, not a redraw from memory.

private val DropPath = Path().apply {
    moveTo(12f, 1.5f)
    cubicTo(12f, 1.5f, 21.2f, 12.9f, 21.2f, 19.6f)
    cubicTo(21.2f, 25.9f, 17.1f, 30.5f, 12f, 30.5f)
    cubicTo(6.9f, 30.5f, 2.8f, 25.9f, 2.8f, 19.6f)
    cubicTo(2.8f, 12.9f, 12f, 1.5f, 12f, 1.5f)
    close()
}

// ---- FACE_MARKUP's shape primitives (eye/round/arc/line/mouth), transcribed 1:1. ----

private fun DrawScope.eye(x: Float, y: Float = 19f, w: Float = 2.5f, h: Float = 5f, r: Float = 1.25f) {
    drawRoundRect(Color.White, topLeft = Offset(x, y), size = Size(w, h), cornerRadius = CornerRadius(r, r))
}

private fun DrawScope.round(x: Float, y: Float = 20.5f, r: Float = 1.9f) {
    drawCircle(Color.White, radius = r, center = Offset(x, y))
}

private fun DrawScope.arc(x: Float, up: Boolean = true, y: Float = 21f) {
    val path = Path().apply {
        moveTo(x - 2.1f, y)
        quadraticTo(x, y + if (up) -3f else 3f, x + 2.1f, y)
    }
    drawPath(path, Color.White, style = Stroke(1.5f, cap = StrokeCap.Round))
}

private fun DrawScope.line(x: Float, y: Float = 21f) {
    drawLine(Color.White, Offset(x - 2f, y), Offset(x + 2f, y), strokeWidth = 1.5f, cap = StrokeCap.Round)
}

private fun DrawScope.mouth(path: Path) {
    drawPath(path, Color.White, style = Stroke(1.3f, cap = StrokeCap.Round))
}

// Each mouth's `d` string from drop.ts, resolved from its relative `q`/`h` commands to
// absolute control points once, here.
private val mouthSurprised = Path().apply { moveTo(10.6f, 26f); quadraticTo(12f, 27.6f, 13.4f, 26f) }
private val mouthExcited = Path().apply { moveTo(9.6f, 25.4f); quadraticTo(12f, 28f, 14.4f, 25.4f) }
private val mouthLaughing = Path().apply { moveTo(9.2f, 25f); quadraticTo(12f, 28f, 14.8f, 25f); close() }
private val mouthAngry = Path().apply { moveTo(10.4f, 26.2f); lineTo(13.6f, 26.2f) }
private val mouthSad = Path().apply { moveTo(10.2f, 26.4f); quadraticTo(12f, 24.6f, 13.8f, 26.4f) }
private val mouthScared = Path().apply {
    moveTo(10f, 26f); quadraticTo(10.9f, 24.8f, 11.8f, 26f); quadraticTo(12.7f, 27.2f, 13.6f, 26f)
}
private val mouthConfused = Path().apply {
    moveTo(10.2f, 26.4f); quadraticTo(11.2f, 25.2f, 12.1f, 26.4f); quadraticTo(13f, 27.6f, 14f, 26.4f)
}
private val mouthProud = Path().apply { moveTo(10f, 25.8f); quadraticTo(12.2f, 27.2f, 14f, 25.2f) }
private val mouthUnimpressed = Path().apply { moveTo(10.4f, 25.8f); lineTo(13.6f, 25.8f) }
private val mouthSleepy = Path().apply { moveTo(10.6f, 25.6f); quadraticTo(12f, 27f, 13.4f, 25.6f) }

private fun DrawScope.drawFace(mood: Mood) {
    when (mood) {
        Mood.Neutral -> { eye(7.6f); eye(13.9f) }
        Mood.Attentive -> { eye(7.4f, 18f, 2.5f, 6.2f); eye(14.1f, 18f, 2.5f, 6.2f) }
        Mood.Surprised -> { round(9f); round(15f); mouth(mouthSurprised) }
        Mood.Excited -> { arc(9f); arc(15f); mouth(mouthExcited) }
        Mood.Happy -> { arc(9f); arc(15f) }
        Mood.Laughing -> { arc(9f); arc(15f); mouth(mouthLaughing) }
        Mood.Angry -> {
            drawLine(Color.White, Offset(6.6f, 17.2f), Offset(10.2f, 19f), strokeWidth = 1.4f, cap = StrokeCap.Round)
            drawLine(Color.White, Offset(17.4f, 17.2f), Offset(13.8f, 19f), strokeWidth = 1.4f, cap = StrokeCap.Round)
            eye(7.9f, 20.4f, 2.2f, 3f, 1.1f); eye(13.9f, 20.4f, 2.2f, 3f, 1.1f)
            mouth(mouthAngry)
        }
        Mood.Sad -> { arc(9f, false, 20.4f); arc(15f, false, 20.4f); mouth(mouthSad) }
        Mood.Scared -> { round(9f, 20f, 2.2f); round(15f, 20f, 2.2f); mouth(mouthScared) }
        Mood.Suspicious -> {
            line(9f, 18.2f); line(15f, 18.2f)
            eye(7.9f, 20.2f, 2.4f, 2.4f, 1.2f); eye(13.7f, 20.2f, 2.4f, 2.4f, 1.2f)
        }
        Mood.Confused -> {
            round(8.9f, 20.4f, 1.8f); line(15.2f, 19.4f)
            eye(14.1f, 20.6f, 2.2f, 2.2f, 1.1f); mouth(mouthConfused)
        }
        Mood.Curious -> { round(8.8f, 20f, 2.2f); round(15.2f, 20.6f, 1.4f) }
        Mood.Proud -> { arc(9f); arc(15f); mouth(mouthProud) }
        Mood.Shy -> {
            arc(8.8f, true, 20.6f); arc(15.2f, true, 20.6f)
            drawCircle(Color.White.copy(alpha = 0.45f), radius = 1.2f, center = Offset(6.4f, 23.4f))
            drawCircle(Color.White.copy(alpha = 0.45f), radius = 1.2f, center = Offset(17.6f, 23.4f))
        }
        Mood.Unimpressed -> { line(9f, 20.4f); line(15f, 20.4f); mouth(mouthUnimpressed) }
        Mood.Sleepy -> { arc(9f, false, 20f); arc(15f, false, 20f); mouth(mouthSleepy) }
    }
}

/** The drop, in one of the twelve inks, wearing one of the sixteen moods. */
@Composable
fun ZenDrop(ink: Ink, mood: Mood, modifier: Modifier = Modifier.size(32.dp)) {
    Canvas(modifier = modifier) {
        val scaleX = size.width / 24f
        val scaleY = size.height / 32f
        scale(scaleX, scaleY, pivot = Offset.Zero) {
            drawPath(DropPath, color = ink.raw)
            drawFace(mood)
        }
    }
}
