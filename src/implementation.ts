import type { Plugin } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

import type {
  CameraConfig,
  Circle,
  NativeMapConfig,
  LatLng,
  LatLngBounds,
  MapPadding,
  MapType,
  Marker,
  Polygon,
  Polyline,
  TileOverlay,
} from './definitions';
import { shouldRouteTouchToMap } from './touch-routing';

/**
 * An interface containing the options used when creating a map.
 */
export interface CreateMapArgs {
  /**
   * A unique identifier for the map instance.
   */
  id: string;
  /**
   * Google Maps API key. Required on web. On Android, also set
   * `com.google.android.geo.API_KEY` in the app manifest. Not used on iOS (MapKit).
   */
  apiKey?: string;
  /**
   * The initial configuration settings for the map.
   */
  config: NativeMapConfig;
  /**
   * The DOM element that determines size and positioning for embedded maps.
   * Optional when `toBack` is `true` (defaults to `document.body`).
   */
  element?: HTMLElement;
  /**
   * Destroy and re-create the map instance if a map with the supplied id already exists
   * @default false
   */
  forceCreate?: boolean;
  /**
   * The region parameter alters your application to serve different map tiles or bias the application (such as biasing geocoding results towards the region).
   *
   * Only available for web.
   */
  region?: string;

  /**
   * The language parameter affects the names of controls, copyright notices, driving directions, and control labels, as well as the responses to service requests.
   *
   * Only available for web.
   */
  language?: string;
  /**
   * When `true`, renders the native map behind a transparent WebView so your HTML UI
   * can sit on top. Touches on transparent web areas pass through to the map,
   * including multi-touch gestures (pinch zoom, rotate, two-finger tilt, pan).
   * Touches on interactive HTML elements stay in the WebView.
   *
   * On native platforms, set `config.x`, `config.y`, `config.width`, and `config.height`
   * for position and size (defaults to the viewport when omitted). Use {@link NativeMap.updateLayout}
   * to change layout at runtime.
   *
   * @default false
   */
  toBack?: boolean;
}

/**
 * Layout rectangle for {@link NativeMapPlugin.updateLayout}, in CSS pixels relative to the WebView.
 */
export interface MapLayoutArgs {
  /**
   * Map instance id returned from {@link NativeMap.create}.
   */
  id: string;
  /**
   * Distance from the left edge of the WebView, in CSS pixels.
   */
  x?: number;
  /**
   * Distance from the top edge of the WebView, in CSS pixels.
   */
  y?: number;
  /**
   * Map width in CSS pixels.
   */
  width?: number;
  /**
   * Map height in CSS pixels.
   */
  height?: number;
}

export interface DestroyMapArgs {
  id: string;
}

export interface RemoveMarkerArgs {
  id: string;
  markerId: string;
}

export interface RemoveMarkersArgs {
  id: string;
  markerIds: string[];
}

export interface AddMarkerArgs {
  id: string;
  marker: Marker;
}

export interface AddPolygonsArgs {
  id: string;
  polygons: Polygon[];
}

export interface RemovePolygonsArgs {
  id: string;
  polygonIds: string[];
}

export interface AddCirclesArgs {
  id: string;
  circles: Circle[];
}

export interface RemoveCirclesArgs {
  id: string;
  circleIds: string[];
}
export interface AddPolylinesArgs {
  id: string;
  polylines: Polyline[];
}

export interface RemovePolylinesArgs {
  id: string;
  polylineIds: string[];
}

export interface CameraArgs {
  id: string;
  config: CameraConfig;
}

export interface MapTypeArgs {
  id: string;
  mapType: MapType;
}

export interface IndoorMapArgs {
  id: string;
  enabled: boolean;
}

export interface RemoveTileOverlayArgs {
  id: string;
  tileOverlayId: string;
}

export interface AddTileOverlayArgs {
  id: string;
  tileOverlay: TileOverlay;
}

export interface TrafficLayerArgs {
  id: string;
  enabled: boolean;
}

export interface AccElementsArgs {
  id: string;
  enabled: boolean;
}

export interface PaddingArgs {
  id: string;
  padding: MapPadding;
}

export interface CurrentLocArgs {
  id: string;
  enabled: boolean;
}
export interface AddMarkersArgs {
  id: string;
  markers: Marker[];
}

export interface MapBoundsArgs {
  id: string;
  mapBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface MapBoundsContainsArgs {
  bounds: LatLngBounds;
  point: LatLng;
}

export type MapBoundsExtendArgs = MapBoundsContainsArgs;

export interface EnableClusteringArgs {
  id: string;
  minClusterSize?: number;
}

export interface FitBoundsArgs {
  id: string;
  bounds: LatLngBounds;
  padding?: number;
}

export interface NativeMapPlugin extends Plugin {
  create(options: CreateMapArgs): Promise<void>;
  enableTouch(args: { id: string }): Promise<void>;
  disableTouch(args: { id: string }): Promise<void>;
  addTileOverlay(args: AddTileOverlayArgs): Promise<{ id: string }>;
  removeTileOverlay(args: RemoveTileOverlayArgs): Promise<void>;
  addMarker(args: AddMarkerArgs): Promise<{ id: string }>;
  addMarkers(args: AddMarkersArgs): Promise<{ ids: string[] }>;
  removeMarker(args: RemoveMarkerArgs): Promise<void>;
  removeMarkers(args: RemoveMarkersArgs): Promise<void>;
  addPolygons(args: AddPolygonsArgs): Promise<{ ids: string[] }>;
  removePolygons(args: RemovePolygonsArgs): Promise<void>;
  addCircles(args: AddCirclesArgs): Promise<{ ids: string[] }>;
  removeCircles(args: RemoveCirclesArgs): Promise<void>;
  addPolylines(args: AddPolylinesArgs): Promise<{ ids: string[] }>;
  removePolylines(args: RemovePolylinesArgs): Promise<void>;
  enableClustering(args: EnableClusteringArgs): Promise<void>;
  disableClustering(args: { id: string }): Promise<void>;
  destroy(args: DestroyMapArgs): Promise<void>;
  setCamera(args: CameraArgs): Promise<void>;
  getMapType(args: { id: string }): Promise<{ type: string }>;
  setMapType(args: MapTypeArgs): Promise<void>;
  enableIndoorMaps(args: IndoorMapArgs): Promise<void>;
  enableTrafficLayer(args: TrafficLayerArgs): Promise<void>;
  enableAccessibilityElements(args: AccElementsArgs): Promise<void>;
  enableCurrentLocation(args: CurrentLocArgs): Promise<void>;
  setPadding(args: PaddingArgs): Promise<void>;
  onScroll(args: MapBoundsArgs): Promise<void>;
  onResize(args: MapBoundsArgs): Promise<void>;
  onDisplay(args: MapBoundsArgs): Promise<void>;
  dispatchMapEvent(args: { id: string; focus: boolean }): Promise<void>;
  getMapBounds(args: { id: string }): Promise<LatLngBounds>;
  fitBounds(args: FitBoundsArgs): Promise<void>;
  mapBoundsContains(args: MapBoundsContainsArgs): Promise<{ contains: boolean }>;
  mapBoundsExtend(args: MapBoundsExtendArgs): Promise<{ bounds: LatLngBounds }>;
  /**
   * Updates the native map position and size without recreating the map.
   * Useful with `toBack` mode to resize or reposition the map layer.
   */
  updateLayout(args: MapLayoutArgs): Promise<void>;
  /**
   * Shows a map that was hidden with {@link NativeMapPlugin.hide}.
   */
  show(args: { id: string }): Promise<void>;
  /**
   * Hides the native map view while keeping the instance alive.
   */
  hide(args: { id: string }): Promise<void>;
}

const CapacitorNativeMap = registerPlugin<NativeMapPlugin>('NativeMap', {
  web: () => import('./web').then((m) => new m.CapacitorNativeMapWeb()),
});

CapacitorNativeMap.addListener('isMapInFocus', (data) => {
  const x = data.x as number;
  const y = data.y as number;
  const mapId = data.mapId as string;
  const toBack = data.toBack === true;
  const mapInFocus = shouldRouteTouchToMap(x, y, mapId, toBack);
  CapacitorNativeMap.dispatchMapEvent({ id: mapId, focus: mapInFocus });
});

export { CapacitorNativeMap };
