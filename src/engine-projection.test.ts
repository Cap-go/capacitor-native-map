import { afterEach, describe, expect, test } from 'bun:test';

import {
  ensureEngineProjectionSlot,
  NATIVE_MAP_ENGINE_SLOT_ATTR,
  projectionSelectorForMap,
  removeEngineProjectionSlot,
  syncEngineProjectionSlotLayout,
} from './engine-projection';

describe('engine projection DOM', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('projectionSelectorForMap is stable', () => {
    expect(projectionSelectorForMap('abc')).toBe(`[${NATIVE_MAP_ENGINE_SLOT_ATTR}="abc"]`);
  });

  test('ensureEngineProjectionSlot creates embedded host once', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const selector = ensureEngineProjectionSlot(host, 'map-1', false);
    expect(selector).toBe(projectionSelectorForMap('map-1'));
    expect(host.querySelector('capacitor-native-map')).not.toBeNull();
    expect(ensureEngineProjectionSlot(host, 'map-1', false)).toBe(selector);
    expect(host.querySelectorAll('capacitor-native-map')).toHaveLength(1);
  });

  test('ensureEngineProjectionSlot creates toBack host on body', () => {
    const host = document.body;
    ensureEngineProjectionSlot(host, 'back-1', true, { x: 1, y: 2, width: 100, height: 200 });
    const slot = document.querySelector(projectionSelectorForMap('back-1'));
    expect(slot).not.toBeNull();
    expect((slot as HTMLElement).style.left).toBe('1px');
    removeEngineProjectionSlot('back-1');
    expect(document.querySelector(projectionSelectorForMap('back-1'))).toBeNull();
  });

  test('syncEngineProjectionSlotLayout updates geometry', () => {
    ensureEngineProjectionSlot(document.body, 'lay-1', true, { x: 0, y: 0, width: 10, height: 10 });
    syncEngineProjectionSlotLayout('lay-1', { x: 5, y: 6, width: 50, height: 60 });
    const slot = document.querySelector(projectionSelectorForMap('lay-1')) as HTMLElement;
    expect(slot.style.left).toBe('5px');
    expect(slot.style.top).toBe('6px');
    expect(slot.style.width).toBe('50px');
    expect(slot.style.height).toBe('60px');
  });
});
