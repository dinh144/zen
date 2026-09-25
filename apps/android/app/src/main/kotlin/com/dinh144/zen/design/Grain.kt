package com.dinh144.zen.design

import android.graphics.Bitmap
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.ImageShader
import androidx.compose.ui.graphics.ShaderBrush
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.asImageBitmap
import kotlin.random.Random

// Washi grain: fibre in the paper, not a texture image — the mobile twin of
// packages/ui/src/styles/globals.css's body::before fractal-noise layer (feTurbulence +
// saturate(0), tiled, blended `multiply` on paper / `soft-light` at night). Compose has no
// feTurbulence, so this bakes an equivalent grey noise tile once and repeats it; a
// ponytail: the web's true fractal noise is finer-grained than this flat random tile —
// upgrade to an AGSL RuntimeShader (API 33+) if the difference reads on a real screen.
private const val TILE = 64
private const val GREY = 0x80

// --paper-grain (0.45 light / 0.12 dark) times the noise rect's own 0.35 opacity in
// globals.css, baked into one constant per theme.
private const val LIGHT_GRAIN_ALPHA = 0.45f * 0.35f
private const val DARK_GRAIN_ALPHA = 0.12f * 0.35f

private fun noiseBitmap(seed: Long): Bitmap {
    val bitmap = Bitmap.createBitmap(TILE, TILE, Bitmap.Config.ARGB_8888)
    val random = Random(seed) // fixed seed: the same fibre every launch, like the web's fixed filter
    for (y in 0 until TILE) for (x in 0 until TILE) {
        val a = random.nextInt(256)
        bitmap.setPixel(x, y, (a shl 24) or (GREY shl 16) or (GREY shl 8) or GREY)
    }
    return bitmap
}

@Composable
fun Modifier.paperGrain(darkTheme: Boolean): Modifier {
    val brush = remember { ShaderBrush(ImageShader(noiseBitmap(20260923L).asImageBitmap(), TileMode.Repeated, TileMode.Repeated)) }
    return this.drawWithCache {
        val alpha = if (darkTheme) DARK_GRAIN_ALPHA else LIGHT_GRAIN_ALPHA
        val blend = if (darkTheme) BlendMode.Softlight else BlendMode.Multiply
        onDrawWithContent {
            drawContent()
            drawRect(brush = brush, size = Size(size.width, size.height), alpha = alpha, blendMode = blend)
        }
    }
}
