import Capacitor
import UIKit
import WebKit

enum ToBackCompositor {
    static func applyTransparentWebView(_ webView: WKWebView?) {
        guard let webView = webView else { return }
        DispatchQueue.main.async {
            webView.isOpaque = false
            webView.backgroundColor = .clear
            func clearBackgrounds(_ view: UIView) {
                view.backgroundColor = .clear
                for subview in view.subviews {
                    clearBackgrounds(subview)
                }
            }
            clearBackgrounds(webView)
            webView.superview?.backgroundColor = .clear
            webView.setNeedsLayout()
            webView.layoutIfNeeded()
        }
    }
}
