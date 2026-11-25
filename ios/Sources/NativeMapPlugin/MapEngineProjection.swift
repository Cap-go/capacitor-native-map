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
    private weak var eventSink: CAPPlugin?
    #if canImport(WebViewNativeUIEngine)
    private var projection: NativeUIProjection?
    #endif

    static let engineEventNames: Set<String> = [updateEvent, shownEvent, hiddenEvent, webEvent]

    init(mapId: String) {
        self.mapId = mapId
    }

    func start(
        webView: WKWebView,
        pluginJsName: String,
        selector: String,
        mapVisible: Bool,
        eventSink: CAPPlugin?,
        viewProvider: @escaping () -> UIView?
    ) {
        self.eventSink = eventSink
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

    func receiveFromPlugin(eventName: String, data: [String: Any]) {
        #if canImport(WebViewNativeUIEngine)
        guard let incoming = data["mapId"] as? String, incoming == mapId else { return }
        projection?.receive(eventName, data: data)
        #endif
    }

    func notifyUpdate() {
        dispatchEngineEvent(Self.updateEvent)
    }

    func notifyShown() {
        dispatchEngineEvent(Self.shownEvent)
    }

    func notifyHidden() {
        dispatchEngineEvent(Self.hiddenEvent)
    }

    private func dispatchEngineEvent(_ event: String) {
        eventSink?.notifyListeners(event, data: ["mapId": mapId])
    }

    func destroy() {
        #if canImport(WebViewNativeUIEngine)
        projection?.destroy()
        projection = nil
        #endif
    }
}