package com.dinh144.zen.design

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp

// Base components on Compose foundation — DESIGN.md's Visual decisions: "no Material
// components' look: the app builds its own components on Compose foundation." Each takes
// 48dp minimum touch space (story 196) even where its visible box is smaller.

/** A sheet laid on the desk: hairline edge, one 1px ink shadow at the bottom edge, radius
 * 2dp. The base surface every floating or card-like thing in this app sits on. */
@Composable
fun ZenSheet(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    val colors = ZenTheme.colors
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(ZenPalette.radius))
            .background(colors.sheet)
            .border(BorderStroke(ZenPalette.hairlineWidth, colors.hairline), RoundedCornerShape(ZenPalette.radius))
            .drawBehind {
                drawLine(
                    color = colors.inkWash,
                    start = Offset(0f, size.height),
                    end = Offset(size.width, size.height),
                    strokeWidth = ZenPalette.shadowWidth.toPx(),
                )
            },
    ) { content() }
}

/** The tappable card container (board tiles, list rows): a ZenSheet plus the ink ripple
 * and a real click target. */
@Composable
fun ZenCardShell(modifier: Modifier = Modifier, onClick: () -> Unit, content: @Composable () -> Unit) {
    val interactionSource = remember { MutableInteractionSource() }
    ZenSheet(
        modifier = modifier.clickable(
            interactionSource = interactionSource,
            indication = ZenInkRipple.of(ZenTheme.colors.ink),
            onClick = onClick,
        ),
        content = content,
    )
}

/** A quiet ink-text button: no fill, a hairline border, the ripple from the touch point —
 * DESIGN.md's Do: "keep one accent", never buttons in bulk. */
@Composable
fun ZenButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val colors = ZenTheme.colors
    val interactionSource = remember { MutableInteractionSource() }
    Box(
        modifier = modifier
            .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
            .clip(RoundedCornerShape(ZenPalette.radius))
            .border(BorderStroke(ZenPalette.hairlineWidth, colors.hairline), RoundedCornerShape(ZenPalette.radius))
            .clickable(
                interactionSource = interactionSource,
                indication = ZenInkRipple.of(colors.ink),
                onClick = onClick,
            )
            .padding(horizontal = 20.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        BasicText(text = text, style = TextStyle(color = colors.ink, fontFamily = ZenTheme.typography.sans))
    }
}

/**
 * A text field inked on focus: a hairline underline at rest that turns ink-coloured while
 * focused — the same `data-ruled` treatment CLAUDE.md requires on the web ("text fields
 * show focus by inking their line, not a box"). No box, no ring, ever.
 */
@Composable
fun ZenTextField(value: String, onValueChange: (String) -> Unit, modifier: Modifier = Modifier) {
    val colors = ZenTheme.colors
    val interactionSource = remember { MutableInteractionSource() }
    val focused by interactionSource.collectIsFocusedAsState()
    val lineColor by animateColorAsState(if (focused) colors.ink else colors.hairline, ZenMotion.tween(ZenMotion.FAST_MS))
    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier
            .defaultMinSize(minHeight = 48.dp)
            .padding(vertical = 8.dp)
            .drawBehind {
                val strokeWidth = (if (focused) 2.dp else ZenPalette.hairlineWidth).toPx()
                drawLine(lineColor, Offset(0f, size.height), Offset(size.width, size.height), strokeWidth)
            },
        interactionSource = interactionSource,
        textStyle = TextStyle(color = colors.ink, fontFamily = ZenTheme.typography.sans),
        cursorBrush = SolidColor(colors.seal),
    )
}
