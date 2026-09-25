package com.dinh144.zen.design

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Indication
import androidx.compose.foundation.IndicationNodeFactory
import androidx.compose.foundation.interaction.InteractionSource
import androidx.compose.foundation.interaction.PressInteraction
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.ContentDrawScope
import androidx.compose.ui.node.DelegatableNode
import androidx.compose.ui.node.DrawModifierNode
import kotlinx.coroutines.launch

/**
 * "ink ripple from the point of a click" (DESIGN.md's Visual decisions) — a soft circle of
 * ink that grows from the touch point and fades, replacing Material's ripple since this app
 * takes no Material dependency.
 */
class ZenInkRipple(private val color: Color) : IndicationNodeFactory {
    override fun create(interactionSource: InteractionSource): DelegatableNode = ZenInkRippleNode(interactionSource, color)

    override fun equals(other: Any?) = other is ZenInkRipple && other.color == color
    override fun hashCode() = color.hashCode()

    companion object {
        fun of(color: Color): Indication = ZenInkRipple(color)
    }
}

private class ZenInkRippleNode(
    private val interactionSource: InteractionSource,
    private val color: Color,
) : Modifier.Node(), DrawModifierNode {
    private val radius = Animatable(0f)
    private val alpha = Animatable(0f)
    private var origin = Offset.Zero

    override fun onAttach() {
        coroutineScope.launch {
            interactionSource.interactions.collect { interaction ->
                when (interaction) {
                    is PressInteraction.Press -> {
                        origin = interaction.pressPosition
                        radius.snapTo(0f)
                        alpha.snapTo(0.16f)
                        launch { radius.animateTo(1f, tween(500, easing = ZenMotion.Easing)) }
                    }
                    is PressInteraction.Release, is PressInteraction.Cancel ->
                        launch { alpha.animateTo(0f, tween(250)) }
                    else -> Unit
                }
            }
        }
    }

    override fun ContentDrawScope.draw() {
        drawContent()
        val a = alpha.value
        if (a > 0f) {
            drawCircle(color = color.copy(alpha = a), radius = radius.value * size.maxDimension, center = origin)
        }
    }
}
