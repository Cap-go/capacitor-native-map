/** DOM attribute on the Engine projection slot for a map instance. */
export const NATIVE_MAP_ENGINE_SLOT_ATTR = 'data-native-map-engine-slot';

export const NATIVE_MAP_ENGINE_EVENTS = {
  update: 'nativeMapEngineUpdate',
  shown: 'nativeMapEngineShown',
  hidden: 'nativeMapEngineHidden',
  web: 'nativeMapEngineWeb',
} as const;

export function projectionSelectorForMap(mapId: string): string {
  return `[${NATIVE_MAP_ENGINE_SLOT_ATTR}="${mapId}"]`;
}

/**
 * Ensures a DOM projection host exists for `@webview-native-ui/engine`.
 * Returns the CSS selector passed to native `NativeUIProjection`.
 */
export function ensureEngineProjectionSlot(
  host: HTMLElement,
  mapId: string,
  toBack: boolean,
  layout?: { x: number; y: number; width: number; height: number },
): string {
  const selector = projectionSelectorForMap(mapId);
  const existing = document.querySelector(selector);
  if (existing instanceof HTMLElement) {
    return selector;
  }

  const slot = document.createElement(toBack ? 'div' : 'capacitor-native-map');
  slot.setAttribute(NATIVE_MAP_ENGINE_SLOT_ATTR, mapId);
  slot.dataset.internalId = mapId;

  if (toBack && layout) {
    slot.style.position = 'absolute';
    slot.style.left = `${layout.x}px`;
    slot.style.top = `${layout.y}px`;
    slot.style.width = `${layout.width}px`;
    slot.style.height = `${layout.height}px`;
    slot.style.pointerEvents = 'none';
    slot.style.zIndex = '0';
    document.body.appendChild(slot);
  } else {
    slot.style.display = 'block';
    slot.style.width = '100%';
    slot.style.height = '100%';
    host.appendChild(slot);
  }

  return selector;
}

export function removeEngineProjectionSlot(mapId: string): void {
  const selector = projectionSelectorForMap(mapId);
  const slot = document.querySelector(selector);
  slot?.parentElement?.removeChild(slot);
}

export function syncEngineProjectionSlotLayout(
  mapId: string,
  layout: { x: number; y: number; width: number; height: number },
): void {
  const selector = projectionSelectorForMap(mapId);
  const slot = document.querySelector(selector);
  if (!(slot instanceof HTMLElement)) {
    return;
  }
  slot.style.left = `${layout.x}px`;
  slot.style.top = `${layout.y}px`;
  slot.style.width = `${layout.width}px`;
  slot.style.height = `${layout.height}px`;
}
