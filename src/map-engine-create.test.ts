import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

const createImpl = mock(async (): Promise<void> => undefined);

mock.module('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'ios',
    isNativePlatform: () => true,
  },
}));

mock.module('./implementation', () => ({
  CapacitorNativeMap: {
    create: createImpl,
    addListener: mock(async () => ({ remove: mock((): void => undefined) })),
    destroy: mock(async (): Promise<void> => undefined),
    onDisplay: mock(async (): Promise<void> => undefined),
    onResize: mock(async (): Promise<void> => undefined),
    onScroll: mock(async (): Promise<void> => undefined),
  },
}));

const { NativeMap } = await import('./map');

function makeHostElement(): HTMLElement {
  const element = document.createElement('div');
  element.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: 320,
      height: 240,
      top: 0,
      left: 0,
      right: 320,
      bottom: 240,
      toJSON: () => ({}),
    }) as DOMRect;
  document.body.appendChild(element);
  return element;
}

async function waitForNativeCreate(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 250));
}

describe('NativeMap.create webViewNativeUIEngine', () => {
  beforeEach(() => {
    createImpl.mockClear();
    document.body.innerHTML = '';
    (NativeMap as unknown as { activeMapsById: Map<string, unknown> }).activeMapsById.clear();
  });

  afterEach(async () => {
    const active = (NativeMap as unknown as { activeMapsById: Map<string, NativeMap> }).activeMapsById;
    for (const map of [...active.values()]) {
      await map.destroy();
    }
    active.clear();
    document.body.innerHTML = '';
  });

  test('default omits engine flags and projection slot', async () => {
    const element = makeHostElement();
    await NativeMap.create({
      id: 'plain-map',
      apiKey: 'test',
      config: { center: { lat: 0, lng: 0 }, zoom: 1 },
      element,
    });
    await waitForNativeCreate();
    const args = createImpl.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(args.webViewNativeUIEngine).toBeUndefined();
    expect(args.projectionSelector).toBeUndefined();
    expect(document.querySelector('[data-native-map-engine-slot]')).toBeNull();
  });

  test('forceCreate keeps projection slot for replacement', async () => {
    const element = makeHostElement();
    const first = await NativeMap.create({
      id: 'force-engine',
      apiKey: 'test',
      config: { center: { lat: 0, lng: 0 }, zoom: 1 },
      element,
      webViewNativeUIEngine: true,
    });
    await waitForNativeCreate();
    const slotBefore = document.querySelector('[data-native-map-engine-slot="force-engine"]');

    const second = await NativeMap.create({
      id: 'force-engine',
      forceCreate: true,
      apiKey: 'test',
      config: { center: { lat: 0, lng: 0 }, zoom: 1 },
      element,
      webViewNativeUIEngine: true,
    });
    await waitForNativeCreate();

    const slotAfter = document.querySelector('[data-native-map-engine-slot="force-engine"]');
    expect(slotAfter).toBe(slotBefore);
    const args = createImpl.mock.calls[createImpl.mock.calls.length - 1]?.[0] as Record<string, unknown>;
    expect(args.projectionSelector).toBe('[data-native-map-engine-slot="force-engine"]');
    await second.destroy();
    await first.destroy().catch(() => undefined);
  });

  test('enabled adds projection selector for native create', async () => {
    const element = makeHostElement();
    await NativeMap.create({
      id: 'engine-map',
      apiKey: 'test',
      config: { center: { lat: 0, lng: 0 }, zoom: 1 },
      element,
      webViewNativeUIEngine: true,
    });
    await waitForNativeCreate();
    const args = createImpl.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(args.webViewNativeUIEngine).toBe(true);
    expect(args.projectionSelector).toBe('[data-native-map-engine-slot="engine-map"]');
    expect(document.querySelector('[data-native-map-engine-slot="engine-map"]')).not.toBeNull();
  });
});
