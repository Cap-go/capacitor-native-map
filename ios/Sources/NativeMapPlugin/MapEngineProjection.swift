import Foundation
import UIKit
import WebKit
import WebViewNativeUIEngine
import Capacitor

final class MapEngineProjection {
    static let updateEvent = "nativeMapEngineUpdate"
    static let shownEvent = "nativeMapEngineShown"
    static let hiddenEvent = "nativeMapEngineHidden"
    static let webEvent = "nativeMapEngineWeb"

    private let mapId: String
    private var projection: NativeUIProjection?

    init(mapId: String) {
        self.mapId = mapId
    }

    func start(
        webView: WKWebView,
        pluginJsName: String,
        selector: String,
        viewProvider: @escaping () -> UIView?
    ) {
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
            notifyShown()
        } catch {
            CAPLog.print("[NativeMaps] WebView Native UI Engine unavailable: \(error)")
        }
    }

    func notifyUpdate() {
        guard projection != nil else { return }
        projection?.receive(Self.updateEvent, data: ["mapId": mapId])
    }

    func notifyShown() {
        guard projection != nil else { return }
        projection?.receive(Self.shownEvent, data: ["mapId": mapId])
    }

    func notifyHidden() {
        guard projection != nil else { return }
        projection?.receive(Self.hiddenEvent, data: ["mapId": mapId])
    }

    func destroy() {
        projection?.destroy()
        projection = nil
    }
}