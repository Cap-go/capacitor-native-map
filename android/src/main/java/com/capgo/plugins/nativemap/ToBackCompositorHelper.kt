package com.capgo.plugins.nativemap

import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.view.View
import android.webkit.WebView

/**
 * Policy for Android `toBack` compositing: native map behind the Capacitor WebView.
 */
object ToBackCompositorHelper {
    private val acquiredMapIds: MutableSet<String> = mutableSetOf()
    private var savedParentBackgroundColor: Int? = null

    fun shouldTransparentizeWebViewParent(): Boolean = true

    fun resolveWebViewBackgroundColor(): Int = Color.TRANSPARENT

    fun resolveWebViewAlpha(originalAlpha: Float): Float = originalAlpha

    fun shouldUseHardwareLayerOnPreviewContainer(toBack: Boolean): Boolean = !toBack

    fun resolveWebViewLayerType(): Int = View.LAYER_TYPE_HARDWARE

    fun onToBackMapCreated(webView: WebView, mapId: String) {
        if (!acquiredMapIds.add(mapId)) {
            return
        }
        if (acquiredMapIds.size != 1) {
            return
        }
        val parent = webView.parent as? View
        savedParentBackgroundColor =
                (parent?.background as? ColorDrawable)?.color ?: parent?.solidBackgroundColor()
    }

    fun onToBackMapDestroyed(webView: WebView, mapId: String) {
        if (!acquiredMapIds.remove(mapId)) {
            return
        }
        if (acquiredMapIds.isNotEmpty()) {
            return
        }
        val parent = webView.parent as? View
        val restore = savedParentBackgroundColor
        savedParentBackgroundColor = null
        if (restore != null) {
            parent?.setBackgroundColor(restore)
        } else {
            parent?.background = null
        }
    }

    private fun View.solidBackgroundColor(): Int? {
        val drawable = background
        return if (drawable is ColorDrawable) {
            drawable.color
        } else {
            null
        }
    }
}
