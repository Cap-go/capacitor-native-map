import Capacitor
import UIKit
import WebKit

enum ToBackCompositor {
    private struct SavedWebViewAppearance {
        var isOpaque: Bool
        var backgroundColor: UIColor?
        var superviewBackgroundColor: UIColor?
        var descendantBackgrounds: [ObjectIdentifier: UIColor?]
    }

    private static var toBackMapCount = 0
    private static var savedAppearance: SavedWebViewAppearance?

    static func acquireTransparentWebView(_ webView: WKWebView?) {
        guard let webView = webView else { return }
        DispatchQueue.main.async {
            toBackMapCount += 1
            guard toBackMapCount == 1 else { return }

            var descendantBackgrounds: [ObjectIdentifier: UIColor?] = [:]
            func recordBackgrounds(_ view: UIView) {
                descendantBackgrounds[ObjectIdentifier(view)] = view.backgroundColor
                for subview in view.subviews {
                    recordBackgrounds(subview)
                }
            }
            recordBackgrounds(webView)

            savedAppearance = SavedWebViewAppearance(
                isOpaque: webView.isOpaque,
                backgroundColor: webView.backgroundColor,
                superviewBackgroundColor: webView.superview?.backgroundColor,
                descendantBackgrounds: descendantBackgrounds
            )

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

    static func releaseTransparentWebView(_ webView: WKWebView?) {
        guard let webView = webView else { return }
        DispatchQueue.main.async {
            guard toBackMapCount > 0 else { return }
            toBackMapCount -= 1
            guard toBackMapCount == 0, let saved = savedAppearance else { return }

            webView.isOpaque = saved.isOpaque
            webView.backgroundColor = saved.backgroundColor
            webView.superview?.backgroundColor = saved.superviewBackgroundColor

            func restoreBackgrounds(_ view: UIView) {
                let key = ObjectIdentifier(view)
                if let prior = saved.descendantBackgrounds[key] {
                    view.backgroundColor = prior
                }
                for subview in view.subviews {
                    restoreBackgrounds(subview)
                }
            }
            restoreBackgrounds(webView)

            savedAppearance = nil
            webView.setNeedsLayout()
            webView.layoutIfNeeded()
        }
    }
}
