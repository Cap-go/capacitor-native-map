import { LatLngBounds, MapType, type NativeMap } from '@capgo/capacitor-native-map';

/** One step of the demo tour: a caption plus the map calls that illustrate it. */
export interface TourStep {
  title: string;
  detail: string;
  run: (map: NativeMap, wait: (ms: number) => Promise<void>) => Promise<void>;
}

/** Thrown inside a step once the tour is stopped, so it never touches a newer map. */
class TourCancelled extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps the map so every call made after the tour is stopped throws instead of
 * reaching the native side, where a replacement map may reuse the same id.
 */
function guardMap(map: NativeMap, isCancelled: () => boolean): NativeMap {
  return new Proxy(map, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        if (isCancelled()) throw new TourCancelled();
        return value.apply(target, args);
      };
    },
  });
}

const SF = { lat: 37.7749, lng: -122.4194 };

const stores = [
  { name: 'Downtown', lat: 37.7897, lng: -122.4011, open: true },
  { name: 'Mission', lat: 37.7599, lng: -122.4148, open: true },
  { name: 'Haight', lat: 37.7692, lng: -122.4481, open: false },
  { name: 'Marina', lat: 37.8037, lng: -122.4368, open: true },
  { name: 'Dogpatch', lat: 37.7577, lng: -122.3884, open: false },
];

const route = [
  { lat: 37.8024, lng: -122.4058 }, // Coit Tower
  { lat: 37.7955, lng: -122.3937 }, // Ferry Building
  { lat: 37.7786, lng: -122.3893 }, // Oracle Park
  { lat: 37.7609, lng: -122.4350 }, // Castro
  { lat: 37.7694, lng: -122.4862 }, // Golden Gate Park
];

/** Removes everything a step added, so each step starts from a clean map. */
interface Cleanup {
  markers: string[];
  polylines: string[];
  circles: string[];
  polygons: string[];
}

const cleanup: Cleanup = { markers: [], polylines: [], circles: [], polygons: [] };

export async function resetMap(map: NativeMap): Promise<void> {
  if (cleanup.markers.length) await map.removeMarkers(cleanup.markers);
  if (cleanup.polylines.length) await map.removePolylines(cleanup.polylines);
  if (cleanup.circles.length) await map.removeCircles(cleanup.circles);
  if (cleanup.polygons.length) await map.removePolygons(cleanup.polygons);
  cleanup.markers = [];
  cleanup.polylines = [];
  cleanup.circles = [];
  cleanup.polygons = [];
  await map.disableClustering();
  await map.setMapType(MapType.Normal);
}

export const tourSteps: TourStep[] = [
  {
    title: 'Store locator',
    detail: 'addMarkers + tintColor + fitBounds',
    run: async (map, wait) => {
      await map.setCamera({ coordinate: SF, zoom: 11, angle: 0, bearing: 0, animate: true });
      await wait(800);
      cleanup.markers = await map.addMarkers(
        stores.map((store) => ({
          coordinate: { lat: store.lat, lng: store.lng },
          title: store.name,
          snippet: store.open ? 'Open now' : 'Closed',
          tintColor: store.open ? { r: 16, g: 185, b: 129, a: 255 } : { r: 239, g: 68, b: 68, a: 255 },
        })),
      );
      const lats = stores.map((s) => s.lat);
      const lngs = stores.map((s) => s.lng);
      await map.fitBounds(
        new LatLngBounds({
          southwest: { lat: Math.min(...lats), lng: Math.min(...lngs) },
          northeast: { lat: Math.max(...lats), lng: Math.max(...lngs) },
          center: SF,
        }),
        80,
      );
    },
  },
  {
    title: 'Delivery zones',
    detail: 'addCircles + addPolygons',
    run: async (map, wait) => {
      await map.setCamera({ coordinate: { lat: 37.7800, lng: -122.4150 }, zoom: 13, animate: true });
      cleanup.circles = await map.addCircles([
        {
          center: { lat: 37.7897, lng: -122.4011 },
          radius: 900,
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          strokeColor: '#2563eb',
          strokeWeight: 3,
        },
      ]);
      cleanup.polygons = await map.addPolygons([
        {
          paths: [
            { lat: 37.7700, lng: -122.4270 },
            { lat: 37.7700, lng: -122.4060 },
            { lat: 37.7560, lng: -122.4040 },
            { lat: 37.7540, lng: -122.4250 },
          ],
          fillColor: '#f59e0b',
          fillOpacity: 0.3,
          strokeColor: '#d97706',
          strokeWeight: 3,
        },
      ]);
    },
  },
  {
    title: 'Delivery route',
    detail: 'addPolylines',
    run: async (map, wait) => {
      await map.setCamera({ coordinate: { lat: 37.7820, lng: -122.4330 }, zoom: 13, animate: true });
      cleanup.polylines = await map.addPolylines([
        { path: route, strokeColor: '#94a3b8', strokeWeight: 10 },
        { path: route.slice(0, 3), strokeColor: '#2563eb', strokeWeight: 10 },
      ]);
      cleanup.markers = await map.addMarkers([
        { coordinate: route[0], title: 'Pickup', tintColor: { r: 37, g: 99, b: 235, a: 255 } },
        { coordinate: route[route.length - 1], title: 'Drop-off', tintColor: { r: 239, g: 68, b: 68, a: 255 } },
      ]);
    },
  },
  {
    title: 'Clustering',
    detail: '500 markers + enableClustering',
    run: async (map, wait) => {
      await map.setCamera({ coordinate: SF, zoom: 11, animate: true });
      await map.enableClustering(3);
      // Deterministic pseudo-random spread so every recording looks the same.
      let seed = 42;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
      };
      cleanup.markers = await map.addMarkers(
        Array.from({ length: 500 }, (_, i) => ({
          coordinate: { lat: SF.lat + (rand() - 0.5) * 0.12, lng: SF.lng + (rand() - 0.5) * 0.12 },
          title: `Scooter #${i + 1}`,
        })),
      );
      await wait(2200);
      await map.setCamera({ coordinate: { lat: 37.7849, lng: -122.4094 }, zoom: 14, animate: true });
    },
  },
  {
    title: '3D camera tour',
    detail: 'setCamera with angle + bearing',
    run: async (map, wait) => {
      await map.setCamera({ coordinate: { lat: 37.7952, lng: -122.4028 }, zoom: 16.5, angle: 45, bearing: 30, animate: true });
      await wait(2200);
      await map.setCamera({ coordinate: { lat: 37.7897, lng: -122.3972 }, zoom: 17, angle: 45, bearing: 160, animate: true });
    },
  },
  {
    title: 'Map types',
    detail: 'setMapType: Satellite → Hybrid',
    run: async (map, wait) => {
      await map.setCamera({ coordinate: { lat: 37.8199, lng: -122.4783 }, zoom: 14, angle: 0, bearing: 0, animate: true });
      await wait(1000);
      await map.setMapType(MapType.Satellite);
      await wait(1800);
      await map.setMapType(MapType.Hybrid);
    },
  },
];

/** Plays every step in order, `stepMs` apart, reporting the current step. */
export async function playTour(
  map: NativeMap,
  onStep: (step: TourStep, index: number) => void,
  isCancelled: () => boolean,
  stepMs = 4500,
): Promise<void> {
  const guarded = guardMap(map, isCancelled);
  const wait = async (ms: number) => {
    await sleep(ms);
    if (isCancelled()) throw new TourCancelled();
  };
  try {
    for (const [index, step] of tourSteps.entries()) {
      if (isCancelled()) return;
      await resetMap(guarded);
      onStep(step, index);
      await step.run(guarded, wait);
      await wait(stepMs);
    }
  } catch (error) {
    if (error instanceof TourCancelled) return;
    throw error;
  }
}
