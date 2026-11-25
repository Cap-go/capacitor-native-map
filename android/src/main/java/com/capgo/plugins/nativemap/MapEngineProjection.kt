package com.capgo.plugins.nativemap

import android.util.Log
import android.view.View
import android.view.Window
import android.webkit.WebView
import com.getcapacitor.JSObject
import io.github.webview_native_ui.engine.NativeUIProjection

class MapEngineProjection(private val mapId: String) {
    private var projection: NativeUIProjection? = null

    fun start(
        window: Window,
        webView: WebView,
        pluginId: String,
        projectionSelector: String,
        viewProvider: () -> View?,
    ) {
        if (projection != null) {
            return
        }
        try {
            MapEngineInstall.ensureInstalled(webView)
            projection =
                NativeUIProjection(
                    window,
                    webView,
                    pluginId,
                    projectionSelector,
                    NativeUIProjection.ReceiveListeners(
                        listOf(UPDATE_EVENT),
                        NativeUIProjection.ReceiveListeners.Projection(
                            native = listOf(SHOWN_EVENT),
                            web = listOf(WEB_EVENT),
                            none = listOf(HIDDEN_EVENT),
                        ),
                        mapOf("mapId" to mapId),
                    ),
                    view = viewProvider,
                )
            notifyShown()
        } catch (error: Throwable) {
            Log.e(TAG, "WebView Native UI Engine unavailable", error)
        }
    }

    fun notifyUpdate() {
        projection?.receive(UPDATE_EVENT, JSObject().put("mapId", mapId))
    }

    fun notifyShown() {
        projection?.receive(SHOWN_EVENT, JSObject().put("mapId", mapId))
    }

    fun notifyHidden() {
        projection?.receive(HIDDEN_EVENT, JSObject().put("mapId", mapId))
    }

    fun close() {
        projection?.close()
        projection = null
    }

    companion object {
        private const val TAG = "MapEngineProjection"
        const val UPDATE_EVENT = "nativeMapEngineUpdate"
        const val SHOWN_EVENT = "nativeMapEngineShown"
        const val HIDDEN_EVENT = "nativeMapEngineHidden"
        const val WEB_EVENT = "nativeMapEngineWeb"
    }
}

object MapEngineInstall {
  @Volatile private var installed = false

  fun ensureInstalled(webView: WebView) {
    if (installed) {
      return
    }
    synchronized(this) {
      if (installed) {
        return
      }
      try {
        NativeUIProjection.install(webView)
        installed = true
      } catch (error: IllegalStateException) {
        Log.w(
            "MapEngineInstall",
            "NativeUIProjection.install skipped (WebView already navigated); engine features may be limited",
            error,
        )
      }
    }
  }
}