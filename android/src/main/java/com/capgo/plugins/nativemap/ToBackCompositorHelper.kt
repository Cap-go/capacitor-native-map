package com.capgo.plugins.nativemap

import android.graphics.Color
import android.view.View

/**
 * Policy for Android `toBack` compositing: native map behind the Capacitor WebView.
 */
object ToBackCompositorHelper {
    fun shouldTransparentizeWebViewParent(): Boolean = true

    fun resolveWebViewBackgroundColor(): Int = Color.TRANSPARENT

    fun resolveWebViewAlpha(originalAlpha: Float): Float = originalAlpha

    fun shouldUseHardwareLayerOnPreviewContainer(toBack: Boolean): Boolean = !toBack

    fun resolveWebViewLayerType(): Int = View.LAYER_TYPE_HARDWARE
}
