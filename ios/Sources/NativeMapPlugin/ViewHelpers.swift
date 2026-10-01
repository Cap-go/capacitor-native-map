import Foundation
import UIKit
import WebKit
import Capacitor

// MARK: - View-tree + touch-routing helpers (ported from @capacitor/google-maps)
//
// Split out of CapacitorNativeMap.swift so that file stays within SwiftLint's
// file-length budget. These compositing helpers mount the native map into the
// WKWebView's view tree and route touches down to it.

// MARK: - WKWebView touch routing
//
// Routes touches that land on a WKChildScrollView down to the native map view
// mounted inside it.
extension WKWebView {
    override open func hitTest(_ point: CGPoint, with event: UIEvent?) -> UIView? {
        var hitView = super.hitTest(point, with: event)
        if let childScrollClass = NSClassFromString("WKChildScrollView"),
           let candidate = hitView, candidate.isKind(of: childScrollClass) {
            for item in candidate.subviews.reversed() {
                let converted = item.convert(point, from: self)
                if let inner = item.hitTest(converted, with: event) {
                    hitView = inner
                    break
                }
            }
        }
        return hitView
    }
}

// MARK: - View tree helpers

extension UIView {
    func getAllSubViews() -> [UIView] {
        var collected: [UIView] = []
        var nextTag = tag
        var stack: [UIView] = [self]
        while let root = stack.popLast() {
            for view in root.subviews {
                if view.tag == Map.mapTag { continue }
                view.tag = nextTag
                nextTag += 1
                collected.append(view)
                stack.append(view)
            }
        }
        return collected.reversed()
    }

    func removeAllSubview() {
        subviews.forEach { $0.removeFromSuperview() }
    }
}

extension CGRect {
    static func fromJSObject(_ obj: JSObject) -> CGRect {
        let x = obj["x"] as? Double ?? 0
        let y = obj["y"] as? Double ?? 0
        let width = obj["width"] as? Double ?? 0
        let height = obj["height"] as? Double ?? 0
        return CGRect(x: x, y: y, width: width, height: height)
    }
}
