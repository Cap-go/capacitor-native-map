import Foundation
import UIKit
import WebKit
import Capacitor

#if canImport(WebViewNativeUIEngine)
import WebViewNativeUIEngine
#endif

final class MapEngineProjection {
    static let updateEvent = "nativeMapEngineUpdate"
    static let shownEvent = "nativeMapEngineShown"
    static let hiddenEvent = "nativeMapEngineHidden"
    static let webEvent = "nativeMapEngineWeb"

    private let mapId: String
    #if canImport(WebViewNativeUIEngine)
    private var projection: NativeUIProjection?
    #endif

    init(mapId: String) {
        self.mapId = mapId
    }

    func start(
        webView: WKWebView,
        pluginJsName: String,
        selector: String,
        mapVisible: Bool,
        viewProvider: @escaping () -> UIView?
    ) {
        #if canImport(WebViewNativeUIEngine)
        guard projection == nil else { return }
        do {
            projection = try NativeUIProjection(
                webView: webView,
                plugin: pluginJsName,
                projectionSelector: selector,
                receiveListeners: .init(
                    update: [Self.updateEvent],
                    projection: .init(
                        native: [Self.shownEvent],
                        web: [Self.webEvent],
                        none: [Self.hiddenEvent]
                    ),
                    match: ["mapId": mapId]
                ),
                view: viewProvider
            )
            if mapVisible {
                notifyShown()
            } else {
                notifyHidden()
            }
        } catch {
            CAPLog.print("[NativeMaps] WebView Native UI Engine unavailable: \(error)")
        }
        #else
        CAPLog.print("[NativeMaps] WebView Native UI Engine SDK not linked; webViewNativeUIEngine has no effect")
        #endif
    }

    func notifyUpdate() {
        #if canImport(WebViewNativeUIEngine)
        guard projection != nil else { return }
        projection?.receive(Self.updateEvent, data: ["mapId": mapId])
        #endif
    }

    func notifyShown() {
        #if canImport(WebViewNativeUIEngine)
        guard projection != nil else { return }
        projection?.receive(Self.shownEvent, data: ["mapId": mapId])
        #endif
    }

    func notifyHidden() {
        #if canImport(WebViewNativeUIEngine)
        guard projection != nil else { return }
        projection?.receive(Self.hiddenEvent, data: ["mapId": mapId])
        #endif
    }

    func destroy() {
        #if canImport(WebViewNativeUIEngine)
        projection?.destroy()
        projection = nil
        #endif
    }
}