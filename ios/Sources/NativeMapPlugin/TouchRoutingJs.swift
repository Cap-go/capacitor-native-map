import Foundation
import WebKit

extension NativeMapPlugin {
    func shouldRouteTouchToMap(at point: CGPoint, in webView: WKWebView) -> Bool {
        TouchRoutingCache.shouldRouteTouchToMap(at: point, in: webView)
    }
}
