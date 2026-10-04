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

    private struct WebViewCompositorState {
        var toBackMapCount: Int = 0
        var savedAppearance: SavedWebViewAppearance?
    }

    private static var states: [ObjectIdentifier: WebViewCompositorState] = [:]

    private static func state(for webView: WKWebView) -> WebViewCompositorState {
        let key = ObjectIdentifier(webView)
        if let existing = states[key] {
            return existing
        }
        let fresh = WebViewCompositorState()
        states[key] = fresh
        return fresh
    }

    private static func setState(_ state: WebViewCompositorState, for webView: WKWebView) {
        states[ObjectIdentifier(webView)] = state
    }

    static func acquireTransparentWebView(_ webView: WKWebView?) {
        guard let webView = webView else { return }
        DispatchQueue.main.async {
            var state = state(for: webView)
            state.toBackMapCount += 1
            guard state.toBackMapCount == 1 else {
                setState(state, for: webView)
                return
            }

            var descendantBackgrounds: [ObjectIdentifier: UIColor?] = [:]
            func recordBackgrounds(_ view: UIView) {
                descendantBackgrounds[ObjectIdentifier(view)] = view.backgroundColor
                for subview in view.subviews {
                    recordBackgrounds(subview)
                }
            }
            recordBackgrounds(webView)

            state.savedAppearance = SavedWebViewAppearance(
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
            setState(state, for: webView)
        }
    }

    static func releaseTransparentWebView(_ webView: WKWebView?) {
        guard let webView = webView else { return }
        DispatchQueue.main.async {
            var state = state(for: webView)
            guard state.toBackMapCount > 0 else { return }
            state.toBackMapCount -= 1
            guard state.toBackMapCount == 0, let saved = state.savedAppearance else {
                setState(state, for: webView)
                return
            }

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

            state.savedAppearance = nil
            setState(state, for: webView)
            if state.toBackMapCount == 0 {
                states.removeValue(forKey: ObjectIdentifier(webView))
            }
        }
    }
}
