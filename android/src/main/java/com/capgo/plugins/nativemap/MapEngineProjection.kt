package com.capgo.plugins.nativemap

import android.util.Log
import android.view.View
import android.view.Window
import android.webkit.WebView
import com.getcapacitor.JSObject
import io.github.webview_native_ui.engine.NativeUIProjection

class MapEngineProjection(private val mapId: String) {
    private var projection: NativeUIProjection? = null
    private var emit: ((String, JSObject) -> Unit)? = null

    fun start(
        window: Window,
        webView: WebView,
        pluginId: String,
        projectionSelector: String,
        mapVisible: Boolean,
        viewProvider: () -> View?,
        emit: (String, JSObject) -> Unit,
    ) {
        this.emit = emit
        if (projection != null) {
            return
        }
        try {
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
            if (mapVisible) {
                notifyShown()
            } else {
                notifyHidden()
            }
        } catch (error: Throwable) {
            Log.e(TAG, "WebView Native UI Engine unavailable", error)
        }
    }

    fun receiveFromPlugin(eventName: String, data: JSObject) {
        if (data.optString("mapId") != mapId) {
            return
        }
        projection?.receive(eventName, data)
    }

    fun notifyUpdate() {
        dispatchEngineEvent(UPDATE_EVENT)
    }

    fun notifyShown() {
        dispatchEngineEvent(SHOWN_EVENT)
    }

    fun notifyHidden() {
        dispatchEngineEvent(HIDDEN_EVENT)
    }

    private fun dispatchEngineEvent(event: String) {
        val data = JSObject().put("mapId", mapId)
        emit?.invoke(event, data)
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
        val ENGINE_EVENT_NAMES = setOf(UPDATE_EVENT, SHOWN_EVENT, HIDDEN_EVENT, WEB_EVENT)
    }
}

object MapEngineInstall {
    private var installedWebView: java.lang.ref.WeakReference<WebView>? = null

    fun ensureInstalled(webView: WebView) {
        val existing = installedWebView?.get()
        if (existing === webView) {
            return
        }
        synchronized(this) {
            val current = installedWebView?.get()
            if (current === webView) {
                return
            }
            try {
                NativeUIProjection.install(webView)
                installedWebView = java.lang.ref.WeakReference(webView)
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