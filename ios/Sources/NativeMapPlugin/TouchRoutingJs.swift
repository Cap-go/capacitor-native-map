import Foundation
import WebKit

extension NativeMapPlugin {
    /// Mirrors `src/touch-routing.ts` for synchronous native hit testing.
    func shouldRouteTouchToMap(at point: CGPoint, in webView: WKWebView) -> Bool {
        let x = point.x
        let y = point.y
        let js = """
        (function() {
          const interactive = 'a,button,input,select,textarea,label,summary,details,[role="button"],[contenteditable="true"],[data-map-overlay]';
          const elem = document.elementFromPoint(\(x), \(y));
          if (!elem) { return true; }
          if (elem.closest(interactive)) { return false; }
          let current = elem;
          while (current && current !== document.documentElement) {
            const style = window.getComputedStyle(current);
            const bg = style.backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
              const opacity = parseFloat(style.opacity || '1');
              if (opacity > 0.05) { return false; }
            }
            current = current.parentElement;
          }
          return true;
        })();
        """
        var routeToMap = true
        let semaphore = DispatchSemaphore(value: 0)
        webView.evaluateJavaScript(js) { result, _ in
            if let value = result as? Bool {
                routeToMap = value
            }
            semaphore.signal()
        }
        semaphore.wait()
        return routeToMap
    }
}
