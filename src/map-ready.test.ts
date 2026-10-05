import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

import type { MapReadyCallbackData } from './definitions';
import { MapReadyQueue } from './map-ready';

type MapReadyListener = (data: MapReadyCallbackData) => void;

const onMapReadyListeners: MapReadyListener[] = [];
const createImpl = mock(async (): Promise<void> => undefined);

mock.module('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => 'web',
    isNativePlatform: () => false,
  },
}));

mock.module('./implementation', () => ({
  CapacitorNativeMap: {
    create: createImpl,
    addListener: mock(async (event: string, cb: MapReadyListener) => {
      if (event === 'onMapReady') {
        onMapReadyListeners.push(cb);
      }
      return { remove: mock((): void => undefined) };
    }),
    destroy: mock(async (): Promise<void> => undefined),
  },
}));

const { NativeMap } = await import('./map');

function emitMapReady(mapId: string): void {
  const data: MapReadyCallbackData = { mapId };
  for (const listener of onMapReadyListeners) {
    listener(data);
  }
}

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

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => queueMicrotask(resolve));
}

describe('MapReadyQueue', () => {
  test('fires queued callback once on deliver', () => {
    const queue = new MapReadyQueue();
    let calls = 0;
    queue.whenReady(() => {
      calls += 1;
    });
    expect(calls).toBe(0);
    queue.deliver({ mapId: 'a' });
    expect(calls).toBe(1);
    queue.deliver({ mapId: 'a' });
    expect(calls).toBe(1);
  });
});

describe('NativeMap.create map ready', () => {
  beforeEach(() => {
    onMapReadyListeners.length = 0;
    createImpl.mockClear();
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

  test('second create after ready runs callback on microtask', async () => {
    const element = makeHostElement();
    const readyData: MapReadyCallbackData[] = [];

    await NativeMap.create(
      {
        id: 'map-dup',
        apiKey: 'test',
        config: { center: { lat: 0, lng: 0 }, zoom: 1 },
        element,
      },
      (data) => {
        readyData.push(data);
      },
    );
    await waitForNativeCreate();
    emitMapReady('map-dup');
    await flushMicrotasks();
    expect(readyData).toHaveLength(1);

    let secondCalled = false;
    const secondCreate = NativeMap.create(
      {
        id: 'map-dup',
        apiKey: 'test',
        config: { center: { lat: 0, lng: 0 }, zoom: 1 },
        element,
      },
      () => {
        secondCalled = true;
      },
    );
    expect(secondCalled).toBe(false);
    await secondCreate;
    await flushMicrotasks();
    expect(secondCalled).toBe(true);
  });

  test('first create before ready fires callback once on deliver', async () => {
    const element = makeHostElement();
    let calls = 0;

    const createPromise = NativeMap.create(
      {
        id: 'map-first',
        apiKey: 'test',
        config: { center: { lat: 0, lng: 0 }, zoom: 1 },
        element,
      },
      () => {
        calls += 1;
      },
    );

    expect(calls).toBe(0);
    await waitForNativeCreate();
    expect(calls).toBe(0);

    emitMapReady('map-first');
    await createPromise;
    expect(calls).toBe(1);

    emitMapReady('map-first');
    expect(calls).toBe(1);
  });
});
