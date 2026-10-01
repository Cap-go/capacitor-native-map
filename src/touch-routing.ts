const INTERACTIVE_SELECTOR =
  'a,button,input,select,textarea,label,summary,details,[role="button"],[contenteditable="true"],[data-map-overlay]';

/**
 * Decide whether a native touch at (x, y) should be routed to the map or the WebView.
 */
export function shouldRouteTouchToMap(x: number, y: number, mapId: string, toBack: boolean): boolean {
  if (!toBack) {
    const elem = document.elementFromPoint(x, y) as HTMLElement | null;
    const mapElement = elem?.closest('[data-internal-id]') as HTMLElement | null;
    return mapElement?.dataset?.internalId === mapId;
  }

  const elem = document.elementFromPoint(x, y) as HTMLElement | null;
  if (!elem) {
    return true;
  }

  if (elem.closest(INTERACTIVE_SELECTOR)) {
    return false;
  }

  const overlayRoot = document.querySelector('[data-native-map-overlay-root]');
  if (overlayRoot && !overlayRoot.contains(elem)) {
    return true;
  }

  let current: HTMLElement | null = elem;
  while (current && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    const bg = style.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
      const opacity = parseFloat(style.opacity || '1');
      if (opacity > 0.05) {
        return false;
      }
    }
    current = current.parentElement;
  }

  return true;
}
