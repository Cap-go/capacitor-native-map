const INTERACTIVE_SELECTOR =
  'a,button,input,select,textarea,label,summary,details,[role="button"],[contenteditable="true"],[data-map-overlay]';

const IOS_TOUCH_ROUTING_HANDLER = 'nativeMapTouchRouting';

const MUTATION_ATTRIBUTE_FILTER = ['class', 'style', 'role', 'contenteditable', 'data-map-overlay'];

export type WebCaptureRect = { x: number; y: number; width: number; height: number };

function parseBackgroundAlpha(color: string): number {
  if (color === 'transparent') {
    return 0;
  }
  const rgbaMatch = color.match(/rgba?\(\s*([^)]+)\)/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(',').map((part) => part.trim());
    if (parts.length >= 4) {
      return parseFloat(parts[3]);
    }
    return 1;
  }
  return 1;
}

function backgroundBlocksTouches(style: CSSStyleDeclaration): boolean {
  const bg = style.backgroundColor;
  if (!bg || bg === 'transparent') {
    return false;
  }
  if (parseBackgroundAlpha(bg) <= 0.05) {
    return false;
  }
  const opacity = parseFloat(style.opacity || '1');
  return opacity > 0.05;
}

function isCaptureEligible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) {
    return false;
  }
  let current: HTMLElement | null = el;
  while (current && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    if (parseFloat(style.opacity || '1') <= 0.05) {
      return false;
    }
    if (style.pointerEvents === 'none') {
      return false;
    }
    current = current.parentElement;
  }
  return true;
}

/** Regions where the WebView should keep the touch (not the native map). */
export function collectWebCaptureRects(): WebCaptureRect[] {
  const out: WebCaptureRect[] = [];
  const seen = new WeakSet<Element>();

  const addRect = (el: Element): void => {
    if (seen.has(el) || !isCaptureEligible(el)) {
      return;
    }
    seen.add(el);
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      return;
    }
    out.push({ x: r.left, y: r.top, width: r.width, height: r.height });
  };

  document.querySelectorAll(INTERACTIVE_SELECTOR).forEach((el) => addRect(el));

  const nodes = document.body?.querySelectorAll('*') ?? [];
  for (const el of nodes) {
    if (!(el instanceof HTMLElement)) {
      continue;
    }
    if (el.closest(INTERACTIVE_SELECTOR)) {
      continue;
    }
    const style = window.getComputedStyle(el);
    if (backgroundBlocksTouches(style)) {
      addRect(el);
    }
  }

  return out;
}

export function publishIosTouchRoutingCache(): void {
  const handlers = (
    window as Window & { webkit?: { messageHandlers?: Record<string, { postMessage: (m: unknown) => void }> } }
  ).webkit?.messageHandlers;
  const handler = handlers?.[IOS_TOUCH_ROUTING_HANDLER];
  if (!handler) {
    return;
  }
  handler.postMessage(collectWebCaptureRects());
}

let iosTouchRoutingPublisherCount = 0;
let iosTouchRoutingRafId = 0;
let iosTouchRoutingMutationObserver: MutationObserver | undefined;
const iosTouchRoutingOnLayout = (): void => {
  if (iosTouchRoutingRafId) {
    cancelAnimationFrame(iosTouchRoutingRafId);
  }
  iosTouchRoutingRafId = requestAnimationFrame(() => {
    iosTouchRoutingRafId = 0;
    publishIosTouchRoutingCache();
  });
};

export function installIosTouchRoutingCachePublisher(): void {
  iosTouchRoutingPublisherCount += 1;
  if (iosTouchRoutingPublisherCount !== 1) {
    return;
  }
  window.addEventListener('resize', iosTouchRoutingOnLayout);
  window.addEventListener('scroll', iosTouchRoutingOnLayout, true);
  iosTouchRoutingMutationObserver = new MutationObserver(iosTouchRoutingOnLayout);
  iosTouchRoutingMutationObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: MUTATION_ATTRIBUTE_FILTER,
  });
  iosTouchRoutingOnLayout();
}

export function uninstallIosTouchRoutingCachePublisher(): void {
  if (iosTouchRoutingPublisherCount <= 0) {
    return;
  }
  iosTouchRoutingPublisherCount -= 1;
  if (iosTouchRoutingPublisherCount !== 0) {
    return;
  }
  window.removeEventListener('resize', iosTouchRoutingOnLayout);
  window.removeEventListener('scroll', iosTouchRoutingOnLayout, true);
  iosTouchRoutingMutationObserver?.disconnect();
  iosTouchRoutingMutationObserver = undefined;
  if (iosTouchRoutingRafId) {
    cancelAnimationFrame(iosTouchRoutingRafId);
    iosTouchRoutingRafId = 0;
  }
}

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

  let current: HTMLElement | null = elem;
  while (current && current !== document.documentElement) {
    const style = window.getComputedStyle(current);
    if (backgroundBlocksTouches(style)) {
      return false;
    }
    current = current.parentElement;
  }

  return true;
}
