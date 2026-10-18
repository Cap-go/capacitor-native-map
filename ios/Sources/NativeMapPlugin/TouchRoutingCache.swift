import Foundation
import UIKit
import WebKit

/// Synchronous toBack touch routing from rects pushed by the WebView (see `touch-routing.ts`).
enum TouchRoutingCache {
    private static var webCaptureRects: [ObjectIdentifier: [CGRect]] = [:]
    private static let lock = NSLock()

    static func updateRects(for webView: WKWebView, rects: [CGRect]) {
        lock.lock()
        webCaptureRects[ObjectIdentifier(webView)] = rects
        lock.unlock()
    }

    static func shouldRouteTouchToMap(at point: CGPoint, in webView: WKWebView) -> Bool {
        lock.lock()
        let rects = webCaptureRects[ObjectIdentifier(webView)] ?? []
        lock.unlock()
        for rect in rects where rect.contains(point) {
            return false
        }
        return true
    }

    static func clearRects(forWebViewKey key: ObjectIdentifier) {
        lock.lock()
        webCaptureRects.removeValue(forKey: key)
        lock.unlock()
    }

    static func clearRects(for webView: WKWebView) {
        clearRects(forWebViewKey: ObjectIdentifier(webView))
    }
}

final class TouchRoutingMessageHandler: NSObject, WKScriptMessageHandler {
    static let handlerName = "nativeMapTouchRouting"
    private weak var webView: WKWebView?

    init(webView: WKWebView) {
        self.webView = webView
        super.init()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.handlerName,
              message.frameInfo.isMainFrame,
              let webView = webView,
              message.webView === webView else { return }
        guard let body = message.body as? [[String: Any]] else { return }
        let rects = body.compactMap { item -> CGRect? in
            guard let x = item["x"] as? Double,
                  let y = item["y"] as? Double,
                  let width = item["width"] as? Double,
                  let height = item["height"] as? Double else { return nil }
            return CGRect(x: x, y: y, width: width, height: height)
        }
        TouchRoutingCache.updateRects(for: webView, rects: rects)
    }
}

enum TouchRoutingBridge {
    private struct Installation {
        weak var webView: WKWebView?
        let proxy: TouchRoutingMessageProxy
        let handler: TouchRoutingMessageHandler
    }

    private static var installedWebViews: [ObjectIdentifier: Installation] = [:]

    private static func purgeStaleInstallations() {
        for (key, install) in installedWebViews where install.webView == nil {
            installedWebViews.removeValue(forKey: key)
            TouchRoutingCache.clearRects(forWebViewKey: key)
        }
    }

    static func install(on webView: WKWebView?) {
        purgeStaleInstallations()
        guard let webView = webView else { return }
        let key = ObjectIdentifier(webView)
        if let existing = installedWebViews[key], existing.webView === webView {
            return
        }

        let handler = TouchRoutingMessageHandler(webView: webView)
        let proxy = TouchRoutingMessageProxy(handler: handler)
        webView.configuration.userContentController.add(proxy, name: TouchRoutingMessageHandler.handlerName)
        installedWebViews[key] = Installation(webView: webView, proxy: proxy, handler: handler)
    }

    static func uninstall(from webView: WKWebView?) {
        purgeStaleInstallations()
        guard let webView = webView else { return }
        let key = ObjectIdentifier(webView)
        guard installedWebViews.removeValue(forKey: key) != nil else { return }
        webView.configuration.userContentController.removeScriptMessageHandler(forName: TouchRoutingMessageHandler.handlerName)
        TouchRoutingCache.clearRects(for: webView)
    }
}

private final class TouchRoutingMessageProxy: NSObject, WKScriptMessageHandler {
    private let handler: TouchRoutingMessageHandler

    init(handler: TouchRoutingMessageHandler) {
        self.handler = handler
        super.init()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        handler.userContentController(userContentController, didReceive: message)
    }
}
