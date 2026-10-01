import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

import type {
  CameraConfig,
  Marker,
  MapPadding,
  MapListenerCallback,
  MapReadyCallbackData,
  CameraIdleCallbackData,
  CameraMoveStartedCallbackData,
  ClusterClickCallbackData,
  MapClickCallbackData,
  MarkerClickCallbackData,
  MyLocationButtonClickCallbackData,
  Polygon,
  PolygonClickCallbackData,
  Circle,
  CircleClickCallbackData,
  Polyline,
  PolylineCallbackData,
  TileOverlay,
} from './definitions';
import { LatLngBounds, MapType } from './definitions';
import type { CreateMapArgs } from './implementation';
import { CapacitorNativeMap } from './implementation';

export interface NativeMapInterface {
  create(options: CreateMapArgs, callback?: MapListenerCallback<MapReadyCallbackData>): Promise<NativeMap>;
  enableTouch(): Promise<void>;
  disableTouch(): Promise<void>;
  /**
   * Updates native map position and size (CSS pixels). Especially useful in `toBack` mode.
   */
  updateLayout(layout: { x?: number; y?: number; width?: number; height?: number }): Promise<void>;
  /** Shows the native map after {@link NativeMap.hide}. */
  show(): Promise<void>;
  /** Hides the native map without destroying it. */
  hide(): Promise<void>;
  enableClustering(
    /**
     * The minimum number of markers that can be clustered together. The default is 4 markers.
     */
    minClusterSize?: number,
  ): Promise<void>;
  disableClustering(): Promise<void>;
  addTileOverlay(tileOverlay: TileOverlay): Promise<{ id: string }>;
  removeTileOverlay(id: string): Promise<void>;
  addMarker(marker: Marker): Promise<string>;
  addMarkers(markers: Marker[]): Promise<string[]>;
  removeMarker(id: string): Promise<void>;
  removeMarkers(ids: string[]): Promise<void>;
  addPolygons(polygons: Polygon[]): Promise<string[]>;
  removePolygons(ids: string[]): Promise<void>;
  addCircles(circles: Circle[]): Promise<string[]>;
  removeCircles(ids: string[]): Promise<void>;
  addPolylines(polylines: Polyline[]): Promise<string[]>;
  removePolylines(ids: string[]): Promise<void>;
  destroy(): Promise<void>;
  setCamera(config: CameraConfig): Promise<void>;
  /**
   * Get current map type
   */
  getMapType(): Promise<MapType>;
  setMapType(mapType: MapType): Promise<void>;
  enableIndoorMaps(enabled: boolean): Promise<void>;
  enableTrafficLayer(enabled: boolean): Promise<void>;
  enableAccessibilityElements(enabled: boolean): Promise<void>;
  enableCurrentLocation(enabled: boolean): Promise<void>;
  setPadding(padding: MapPadding): Promise<void>;
  /**
   * Get the map's current viewport latitude and longitude bounds.
   *
   * @returns {LatLngBounds}
   */
  getMapBounds(): Promise<LatLngBounds>;
  /**
   * Sets the map viewport to contain the given bounds.
   * @param bounds The bounds to fit in the viewport.
   * @param padding Optional padding to apply in pixels. The bounds will be fit in the part of the map that remains after padding is removed.
   */
  fitBounds(bounds: LatLngBounds, padding?: number): Promise<void>;
  setOnBoundsChangedListener(callback?: MapListenerCallback<CameraIdleCallbackData>): Promise<void>;
  setOnCameraIdleListener(callback?: MapListenerCallback<CameraIdleCallbackData>): Promise<void>;
  setOnCameraMoveStartedListener(callback?: MapListenerCallback<CameraMoveStartedCallbackData>): Promise<void>;
  setOnClusterClickListener(callback?: MapListenerCallback<ClusterClickCallbackData>): Promise<void>;
  setOnClusterInfoWindowClickListener(callback?: MapListenerCallback<ClusterClickCallbackData>): Promise<void>;
  setOnInfoWindowClickListener(callback?: MapListenerCallback<MarkerClickCallbackData>): Promise<void>;
  setOnMapClickListener(callback?: MapListenerCallback<MapClickCallbackData>): Promise<void>;
  setOnMarkerClickListener(callback?: MapListenerCallback<MarkerClickCallbackData>): Promise<void>;
  setOnPolygonClickListener(callback?: MapListenerCallback<PolygonClickCallbackData>): Promise<void>;
  setOnCircleClickListener(callback?: MapListenerCallback<CircleClickCallbackData>): Promise<void>;
  setOnPolylineClickListener(callback?: MapListenerCallback<PolylineCallbackData>): Promise<void>;
  setOnMarkerDragStartListener(callback?: MapListenerCallback<MarkerClickCallbackData>): Promise<void>;
  setOnMarkerDragListener(callback?: MapListenerCallback<MarkerClickCallbackData>): Promise<void>;
  setOnMarkerDragEndListener(callback?: MapListenerCallback<MarkerClickCallbackData>): Promise<void>;
  setOnMyLocationButtonClickListener(callback?: MapListenerCallback<MyLocationButtonClickCallbackData>): Promise<void>;
  setOnMyLocationClickListener(callback?: MapListenerCallback<MapClickCallbackData>): Promise<void>;
}

class MapCustomElement extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = '';

    if (Capacitor.getPlatform() == 'ios') {
      this.style.overflow = 'scroll';
      (this.style as any)['-webkit-overflow-scrolling'] = 'touch';

      const overflowDiv = document.createElement('div');
      overflowDiv.style.height = '200%';

      this.appendChild(overflowDiv);
    }
  }
}

customElements.define('capacitor-native-map', MapCustomElement);

export class NativeMap {
  private static toBackMapCount = 0;

  private id: string;
  private element: HTMLElement | null = null;
  private toBack = false;
  private toBackLayout?: { x: number; y: number; width: number; height: number };
  private windowResizeHandler?: () => void;
  private resizeObserver: ResizeObserver | null = null;
  private orientationChangeTimeoutId?: ReturnType<typeof setTimeout>;
  private orientationChangeHandler = (): void => {
    if (this.orientationChangeTimeoutId != null) {
      clearTimeout(this.orientationChangeTimeoutId);
    }
    this.orientationChangeTimeoutId = setTimeout(() => {
      this.orientationChangeTimeoutId = undefined;
      this.updateMapBounds();
    }, 500);
  };

  private onBoundsChangedListener?: PluginListenerHandle;
  private onCameraIdleListener?: PluginListenerHandle;
  private onCameraMoveStartedListener?: PluginListenerHandle;
  private onClusterClickListener?: PluginListenerHandle;
  private onClusterInfoWindowClickListener?: PluginListenerHandle;
  private onInfoWindowClickListener?: PluginListenerHandle;
  private onMapClickListener?: PluginListenerHandle;
  private onPolylineClickListener?: PluginListenerHandle;
  private onMarkerClickListener?: PluginListenerHandle;
  private onPolygonClickListener?: PluginListenerHandle;
  private onCircleClickListener?: PluginListenerHandle;
  private onMarkerDragStartListener?: PluginListenerHandle;
  private onMarkerDragListener?: PluginListenerHandle;
  private onMarkerDragEndListener?: PluginListenerHandle;
  private onMyLocationButtonClickListener?: PluginListenerHandle;
  private onMyLocationClickListener?: PluginListenerHandle;

  private constructor(id: string) {
    this.id = id;
  }

  /**
   * Creates a new instance of a Google Map
   * @param options
   * @param callback
   * @returns NativeMap
   */
  public static async create(
    options: CreateMapArgs,
    callback?: MapListenerCallback<MapReadyCallbackData>,
  ): Promise<NativeMap> {
    const newMap = new NativeMap(options.id);

    const toBack = options.toBack === true;
    newMap.toBack = toBack;

    if (!toBack && !options.element) {
      throw new Error('element is required when toBack is false');
    }

    const hostElement = options.element ?? document.body;
    if (!hostElement) {
      throw new Error('container element is required');
    }

    const createOptions: CreateMapArgs = {
      ...options,
      toBack,
      config: {
        ...options.config,
        androidLiteMode: options.config.androidLiteMode ?? false,
      },
    };

    newMap.element = hostElement;
    if (!toBack) {
      newMap.element.dataset.internalId = options.id;
    }

    let elementBounds: DOMRect;
    if (toBack) {
      elementBounds = new DOMRect(
        options.config.x ?? 0,
        options.config.y ?? 0,
        options.config.width ?? window.innerWidth,
        options.config.height ?? window.innerHeight,
      );
      newMap.toBackLayout = {
        x: elementBounds.x,
        y: elementBounds.y,
        width: elementBounds.width,
        height: elementBounds.height,
      };
      NativeMap.toBackMapCount += 1;
      if (NativeMap.toBackMapCount === 1) {
        document.documentElement.classList.add('native-map-to-back');
        document.body.classList.add('native-map-to-back');
      }
    } else {
      elementBounds = await NativeMap.getElementBounds(hostElement);
    }
    createOptions.config.width = elementBounds.width;
    createOptions.config.height = elementBounds.height;
    createOptions.config.x = elementBounds.x;
    createOptions.config.y = elementBounds.y;
    createOptions.config.devicePixelRatio = window.devicePixelRatio;

    if (Capacitor.getPlatform() == 'android') {
      newMap.initScrolling();
    }
    if (Capacitor.isNativePlatform()) {
      createOptions.element = {} as HTMLElement;

      const getMapBounds = () => newMap.mapBoundsForNative();

      const onDisplay = () => {
        CapacitorNativeMap.onDisplay({
          id: newMap.id,
          mapBounds: getMapBounds(),
        });
      };

      const onResize = () => {
        CapacitorNativeMap.onResize({
          id: newMap.id,
          mapBounds: getMapBounds(),
        });
      };

      const ionicPage = newMap.element.closest('.ion-page');
      if (Capacitor.getPlatform() === 'ios' && ionicPage) {
        ionicPage.addEventListener('ionViewWillEnter', () => {
          setTimeout(() => {
            onDisplay();
          }, 100);
        });
        ionicPage.addEventListener('ionViewDidEnter', () => {
          setTimeout(() => {
            onDisplay();
          }, 100);
        });
      }

      const lastState = {
        width: elementBounds.width,
        height: elementBounds.height,
        isHidden: false,
      };
      if (toBack) {
        newMap.windowResizeHandler = onResize;
        window.addEventListener('resize', onResize);
      } else {
        newMap.resizeObserver = new ResizeObserver(() => {
          if (newMap.element != null) {
            const mapRect = newMap.element.getBoundingClientRect();

            const isHidden = mapRect.width === 0 && mapRect.height === 0;
            if (!isHidden) {
              if (lastState.isHidden) {
                if (Capacitor.getPlatform() === 'ios' && !ionicPage) {
                  onDisplay();
                }
              } else if (lastState.width !== mapRect.width || lastState.height !== mapRect.height) {
                onResize();
              }
            }

            lastState.width = mapRect.width;
            lastState.height = mapRect.height;
            lastState.isHidden = isHidden;
          }
        });
        newMap.resizeObserver.observe(newMap.element);
      }
    }

    let onMapReadyListener: PluginListenerHandle | undefined;
    if (callback) {
      onMapReadyListener = await CapacitorNativeMap.addListener('onMapReady', (data: MapReadyCallbackData) => {
        if (data.mapId == newMap.id) {
          callback(data);
          onMapReadyListener?.remove();
        }
      });
    }

    // small delay to allow for iOS WKWebView to setup corresponding element sub-scroll views ???
    const cleanupFailedCreate = (): void => {
      onMapReadyListener?.remove();
      if (Capacitor.isNativePlatform()) {
        newMap.resizeObserver?.disconnect();
        if (newMap.windowResizeHandler) {
          window.removeEventListener('resize', newMap.windowResizeHandler);
          newMap.windowResizeHandler = undefined;
        }
      }
      if (toBack) {
        NativeMap.releaseToBackDocumentClasses();
        newMap.toBackLayout = undefined;
      }
    };

    try {
      await new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            await CapacitorNativeMap.create(createOptions);
            resolve(undefined);
          } catch (err) {
            reject(err);
          }
        }, 200);
      });
    } catch (err) {
      cleanupFailedCreate();
      throw err;
    }

    return newMap;
  }

  private mapBoundsForNative(): { x: number; y: number; width: number; height: number } {
    if (this.toBack && this.toBackLayout) {
      return this.toBackLayout;
    }
    return NativeMap.layoutBoundsForElement(this.element, this.toBack);
  }

  private static releaseToBackDocumentClasses(): void {
    if (NativeMap.toBackMapCount <= 0) {
      return;
    }
    NativeMap.toBackMapCount -= 1;
    if (NativeMap.toBackMapCount === 0) {
      document.documentElement.classList.remove('native-map-to-back');
      document.body.classList.remove('native-map-to-back');
    }
  }

  private static async getElementBounds(element: HTMLElement): Promise<DOMRect> {
    return new Promise((resolve) => {
      let elementBounds = element.getBoundingClientRect();
      if (elementBounds.width == 0) {
        let retries = 0;
        const boundsInterval = setInterval(function () {
          if (elementBounds.width == 0 && retries < 30) {
            elementBounds = element.getBoundingClientRect();
            retries++;
          } else {
            if (retries == 30) {
              console.warn('Map size could not be determined');
            }
            clearInterval(boundsInterval);
            resolve(elementBounds);
          }
        }, 100);
      } else {
        resolve(elementBounds);
      }
    });
  }

  /**
   * Enable touch events on native map
   *
   * @returns void
   */
  async enableTouch(): Promise<void> {
    return CapacitorNativeMap.enableTouch({
      id: this.id,
    });
  }

  /**
   * Disable touch events on native map
   *
   * @returns void
   */
  async disableTouch(): Promise<void> {
    return CapacitorNativeMap.disableTouch({
      id: this.id,
    });
  }

  async updateLayout(layout: { x?: number; y?: number; width?: number; height?: number }): Promise<void> {
    await CapacitorNativeMap.updateLayout({
      id: this.id,
      ...layout,
    });
    if (layout.width != null || layout.height != null || layout.x != null || layout.y != null) {
      if (this.toBack && this.toBackLayout) {
        this.toBackLayout = {
          x: layout.x ?? this.toBackLayout.x,
          y: layout.y ?? this.toBackLayout.y,
          width: layout.width ?? this.toBackLayout.width,
          height: layout.height ?? this.toBackLayout.height,
        };
      }
      this.updateMapBounds();
    }
  }

  async show(): Promise<void> {
    return CapacitorNativeMap.show({ id: this.id });
  }

  async hide(): Promise<void> {
    return CapacitorNativeMap.hide({ id: this.id });
  }

  /**
   * Enable marker clustering
   *
   * @param minClusterSize - The minimum number of markers that can be clustered together.
   * @defaultValue 4
   *
   * @returns void
   */
  async enableClustering(minClusterSize?: number): Promise<void> {
    return CapacitorNativeMap.enableClustering({
      id: this.id,
      minClusterSize,
    });
  }

  /**
   * Disable marker clustering
   *
   * @returns void
   */
  async disableClustering(): Promise<void> {
    return CapacitorNativeMap.disableClustering({
      id: this.id,
    });
  }

  /**
   * Adds a tile overlay to the map
   *
   * @param tileOverlay
   * @returns created tile overlay id
   */
  async addTileOverlay(tileOverlay: TileOverlay): Promise<string> {
    const res = await CapacitorNativeMap.addTileOverlay({
      id: this.id,
      tileOverlay,
    });

    return res.id;
  }

  /**
   * Removes a tile overlay from the map
   *
   * @param id of the tile overlay to remove from the map
   * @returns void
   */
  async removeTileOverlay(id: string): Promise<void> {
    return CapacitorNativeMap.removeTileOverlay({
      id: this.id,
      tileOverlayId: id,
    });
  }

  /**
   * Adds a marker to the map
   *
   * @param marker
   * @returns created marker id
   */
  async addMarker(marker: Marker): Promise<string> {
    const res = await CapacitorNativeMap.addMarker({
      id: this.id,
      marker,
    });

    return res.id;
  }

  /**
   * Adds multiple markers to the map
   *
   * @param markers
   * @returns array of created marker IDs
   */
  async addMarkers(markers: Marker[]): Promise<string[]> {
    const res = await CapacitorNativeMap.addMarkers({
      id: this.id,
      markers,
    });

    return res.ids;
  }

  /**
   * Remove marker from the map
   *
   * @param id id of the marker to remove from the map
   * @returns
   */
  async removeMarker(id: string): Promise<void> {
    return CapacitorNativeMap.removeMarker({
      id: this.id,
      markerId: id,
    });
  }

  /**
   * Remove markers from the map
   *
   * @param ids array of ids to remove from the map
   * @returns
   */
  async removeMarkers(ids: string[]): Promise<void> {
    return CapacitorNativeMap.removeMarkers({
      id: this.id,
      markerIds: ids,
    });
  }

  async addPolygons(polygons: Polygon[]): Promise<string[]> {
    const res = await CapacitorNativeMap.addPolygons({
      id: this.id,
      polygons,
    });

    return res.ids;
  }

  async addPolylines(polylines: Polyline[]): Promise<string[]> {
    const res = await CapacitorNativeMap.addPolylines({
      id: this.id,
      polylines,
    });

    return res.ids;
  }

  async removePolygons(ids: string[]): Promise<void> {
    return CapacitorNativeMap.removePolygons({
      id: this.id,
      polygonIds: ids,
    });
  }

  async addCircles(circles: Circle[]): Promise<string[]> {
    const res = await CapacitorNativeMap.addCircles({
      id: this.id,
      circles,
    });

    return res.ids;
  }

  async removeCircles(ids: string[]): Promise<void> {
    return CapacitorNativeMap.removeCircles({
      id: this.id,
      circleIds: ids,
    });
  }

  async removePolylines(ids: string[]): Promise<void> {
    return CapacitorNativeMap.removePolylines({
      id: this.id,
      polylineIds: ids,
    });
  }

  /**
   * Destroy the current instance of the map
   */
  async destroy(): Promise<void> {
    if (Capacitor.getPlatform() == 'android') {
      this.disableScrolling();
    }

    if (Capacitor.isNativePlatform()) {
      this.resizeObserver?.disconnect();
      if (this.windowResizeHandler) {
        window.removeEventListener('resize', this.windowResizeHandler);
        this.windowResizeHandler = undefined;
      }
    }

    if (this.toBack) {
      NativeMap.releaseToBackDocumentClasses();
      this.toBackLayout = undefined;
    }

    this.removeAllMapListeners();

    return CapacitorNativeMap.destroy({
      id: this.id,
    });
  }

  /**
   * Update the map camera configuration
   *
   * @param config
   * @returns
   */
  async setCamera(config: CameraConfig): Promise<void> {
    return CapacitorNativeMap.setCamera({
      id: this.id,
      config,
    });
  }

  async getMapType(): Promise<MapType> {
    const res = await CapacitorNativeMap.getMapType({ id: this.id });
    const raw = (res as { type?: string; mapType?: string }).type ?? (res as { mapType?: string }).mapType ?? 'Normal';
    if (raw in MapType) {
      return MapType[raw as keyof typeof MapType];
    }
    const capitalized = `${raw.charAt(0).toUpperCase()}${raw.slice(1)}`;
    if (capitalized in MapType) {
      return MapType[capitalized as keyof typeof MapType];
    }
    if (raw === 'standard' || raw === 'roadmap') {
      return MapType.Normal;
    }
    return MapType.Normal;
  }

  /**
   * Sets the type of map tiles that should be displayed.
   *
   * @param mapType
   * @returns
   */
  async setMapType(mapType: MapType): Promise<void> {
    return CapacitorNativeMap.setMapType({
      id: this.id,
      mapType,
    });
  }

  /**
   * Sets whether indoor maps are shown, where available.
   *
   * @param enabled
   * @returns
   */
  async enableIndoorMaps(enabled: boolean): Promise<void> {
    return CapacitorNativeMap.enableIndoorMaps({
      id: this.id,
      enabled,
    });
  }

  /**
   * Controls whether the map is drawing traffic data, if available.
   *
   * @param enabled
   * @returns
   */
  async enableTrafficLayer(enabled: boolean): Promise<void> {
    return CapacitorNativeMap.enableTrafficLayer({
      id: this.id,
      enabled,
    });
  }

  /**
   * Show accessibility elements for overlay objects, such as Marker and Polyline.
   *
   * Only available on iOS.
   *
   * @param enabled
   * @returns
   */
  async enableAccessibilityElements(enabled: boolean): Promise<void> {
    return CapacitorNativeMap.enableAccessibilityElements({
      id: this.id,
      enabled,
    });
  }

  /**
   * Set whether the My Location dot and accuracy circle is enabled.
   *
   * @param enabled
   * @returns
   */
  async enableCurrentLocation(enabled: boolean): Promise<void> {
    return CapacitorNativeMap.enableCurrentLocation({
      id: this.id,
      enabled,
    });
  }

  /**
   * Set padding on the 'visible' region of the view.
   *
   * @param padding
   * @returns
   */
  async setPadding(padding: MapPadding): Promise<void> {
    return CapacitorNativeMap.setPadding({
      id: this.id,
      padding,
    });
  }

  /**
   * Get the map's current viewport latitude and longitude bounds.
   *
   * @returns {LatLngBounds}
   */
  async getMapBounds(): Promise<LatLngBounds> {
    return new LatLngBounds(
      await CapacitorNativeMap.getMapBounds({
        id: this.id,
      }),
    );
  }

  async fitBounds(bounds: LatLngBounds, padding?: number): Promise<void> {
    return CapacitorNativeMap.fitBounds({
      id: this.id,
      bounds,
      padding,
    });
  }

  initScrolling(): void {
    const ionContents = document.getElementsByTagName('ion-content');

    Array.from(ionContents).forEach((ionContent) => {
      (ionContent as any).scrollEvents = true;
    });

    window.addEventListener('ionScroll', this.handleScrollEvent);
    window.addEventListener('scroll', this.handleScrollEvent);
    window.addEventListener('resize', this.handleScrollEvent);
    if (screen.orientation) {
      screen.orientation.addEventListener('change', this.orientationChangeHandler);
    } else {
      window.addEventListener('orientationchange', this.orientationChangeHandler);
    }
  }

  disableScrolling(): void {
    if (this.orientationChangeTimeoutId != null) {
      clearTimeout(this.orientationChangeTimeoutId);
      this.orientationChangeTimeoutId = undefined;
    }
    window.removeEventListener('ionScroll', this.handleScrollEvent);
    window.removeEventListener('scroll', this.handleScrollEvent);
    window.removeEventListener('resize', this.handleScrollEvent);
    if (screen.orientation) {
      screen.orientation.removeEventListener('change', this.orientationChangeHandler);
    } else {
      window.removeEventListener('orientationchange', this.orientationChangeHandler);
    }
  }

  handleScrollEvent = (): void => this.updateMapBounds();

  private updateMapBounds(): void {
    if (this.element) {
      CapacitorNativeMap.onScroll({
        id: this.id,
        mapBounds: this.mapBoundsForNative(),
      });
    }
  }

  private static layoutBoundsForElement(
    element: HTMLElement | null,
    toBack: boolean,
  ): { x: number; y: number; width: number; height: number } {
    if (toBack) {
      return { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    }
    const mapRect = element?.getBoundingClientRect() ?? ({} as DOMRect);
    return {
      x: mapRect.x,
      y: mapRect.y,
      width: mapRect.width,
      height: mapRect.height,
    };
  }

  /*
  private findContainerElement(): HTMLElement | null {
    if (!this.element) {
      return null;
    }

    let parentElement = this.element.parentElement;
    while (parentElement !== null) {
      if (window.getComputedStyle(parentElement).overflowY !== 'hidden') {
        return parentElement;
      }

      parentElement = parentElement.parentElement;
    }

    return null;
  }
  */

  /**
   * Set the event listener on the map for 'onCameraIdle' events.
   *
   * @param callback
   * @returns
   */
  async setOnCameraIdleListener(callback?: MapListenerCallback<CameraIdleCallbackData>): Promise<void> {
    if (this.onCameraIdleListener) {
      this.onCameraIdleListener.remove();
    }

    if (callback) {
      this.onCameraIdleListener = await CapacitorNativeMap.addListener('onCameraIdle', this.generateCallback(callback));
    } else {
      this.onCameraIdleListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onBoundsChanged' events.
   *
   * @param callback
   * @returns
   */
  async setOnBoundsChangedListener(callback?: MapListenerCallback<CameraIdleCallbackData>): Promise<void> {
    if (this.onBoundsChangedListener) {
      this.onBoundsChangedListener.remove();
    }

    if (callback) {
      this.onBoundsChangedListener = await CapacitorNativeMap.addListener(
        'onBoundsChanged',
        this.generateCallback(callback),
      );
    } else {
      this.onBoundsChangedListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onCameraMoveStarted' events.
   *
   * @param callback
   * @returns
   */
  async setOnCameraMoveStartedListener(callback?: MapListenerCallback<CameraMoveStartedCallbackData>): Promise<void> {
    if (this.onCameraMoveStartedListener) {
      this.onCameraMoveStartedListener.remove();
    }

    if (callback) {
      this.onCameraMoveStartedListener = await CapacitorNativeMap.addListener(
        'onCameraMoveStarted',
        this.generateCallback(callback),
      );
    } else {
      this.onCameraMoveStartedListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onClusterClick' events.
   *
   * @param callback
   * @returns
   */
  async setOnClusterClickListener(callback?: MapListenerCallback<ClusterClickCallbackData>): Promise<void> {
    if (this.onClusterClickListener) {
      this.onClusterClickListener.remove();
    }

    if (callback) {
      this.onClusterClickListener = await CapacitorNativeMap.addListener(
        'onClusterClick',
        this.generateCallback(callback),
      );
    } else {
      this.onClusterClickListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onClusterInfoWindowClick' events.
   *
   * @param callback
   * @returns
   */
  async setOnClusterInfoWindowClickListener(callback?: MapListenerCallback<ClusterClickCallbackData>): Promise<void> {
    if (this.onClusterInfoWindowClickListener) {
      this.onClusterInfoWindowClickListener.remove();
    }

    if (callback) {
      this.onClusterInfoWindowClickListener = await CapacitorNativeMap.addListener(
        'onClusterInfoWindowClick',
        this.generateCallback(callback),
      );
    } else {
      this.onClusterInfoWindowClickListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onInfoWindowClick' events.
   *
   * @param callback
   * @returns
   */
  async setOnInfoWindowClickListener(callback?: MapListenerCallback<MarkerClickCallbackData>): Promise<void> {
    if (this.onInfoWindowClickListener) {
      this.onInfoWindowClickListener.remove();
    }

    if (callback) {
      this.onInfoWindowClickListener = await CapacitorNativeMap.addListener(
        'onInfoWindowClick',
        this.generateCallback(callback),
      );
    } else {
      this.onInfoWindowClickListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onMapClick' events.
   *
   * @param callback
   * @returns
   */
  async setOnMapClickListener(callback?: MapListenerCallback<MapClickCallbackData>): Promise<void> {
    if (this.onMapClickListener) {
      this.onMapClickListener.remove();
    }

    if (callback) {
      this.onMapClickListener = await CapacitorNativeMap.addListener('onMapClick', this.generateCallback(callback));
    } else {
      this.onMapClickListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onPolygonClick' events.
   *
   * @param callback
   * @returns
   */
  async setOnPolygonClickListener(callback?: MapListenerCallback<PolygonClickCallbackData>): Promise<void> {
    if (this.onPolygonClickListener) {
      this.onPolygonClickListener.remove();
    }

    if (callback) {
      this.onPolygonClickListener = await CapacitorNativeMap.addListener(
        'onPolygonClick',
        this.generateCallback(callback),
      );
    } else {
      this.onPolygonClickListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onCircleClick' events.
   *
   * @param callback
   * @returns
   */
  async setOnCircleClickListener(callback?: MapListenerCallback<CircleClickCallbackData>): Promise<void> {
    if (this.onCircleClickListener) [this.onCircleClickListener.remove()];

    if (callback) {
      this.onCircleClickListener = await CapacitorNativeMap.addListener(
        'onCircleClick',
        this.generateCallback(callback),
      );
    } else {
      this.onCircleClickListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onMarkerClick' events.
   *
   * @param callback
   * @returns
   */
  async setOnMarkerClickListener(callback?: MapListenerCallback<MarkerClickCallbackData>): Promise<void> {
    if (this.onMarkerClickListener) {
      this.onMarkerClickListener.remove();
    }

    if (callback) {
      this.onMarkerClickListener = await CapacitorNativeMap.addListener(
        'onMarkerClick',
        this.generateCallback(callback),
      );
    } else {
      this.onMarkerClickListener = undefined;
    }
  }
  /**
   * Set the event listener on the map for 'onPolylineClick' events.
   *
   * @param callback
   * @returns
   */
  async setOnPolylineClickListener(callback?: MapListenerCallback<PolylineCallbackData>): Promise<void> {
    if (this.onPolylineClickListener) {
      this.onPolylineClickListener.remove();
    }

    if (callback) {
      this.onPolylineClickListener = await CapacitorNativeMap.addListener(
        'onPolylineClick',
        this.generateCallback(callback),
      );
    } else {
      this.onPolylineClickListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onMarkerDragStart' events.
   *
   * @param callback
   * @returns
   */
  async setOnMarkerDragStartListener(callback?: MapListenerCallback<MarkerClickCallbackData>): Promise<void> {
    if (this.onMarkerDragStartListener) {
      this.onMarkerDragStartListener.remove();
    }

    if (callback) {
      this.onMarkerDragStartListener = await CapacitorNativeMap.addListener(
        'onMarkerDragStart',
        this.generateCallback(callback),
      );
    } else {
      this.onMarkerDragStartListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onMarkerDrag' events.
   *
   * @param callback
   * @returns
   */
  async setOnMarkerDragListener(callback?: MapListenerCallback<MarkerClickCallbackData>): Promise<void> {
    if (this.onMarkerDragListener) {
      this.onMarkerDragListener.remove();
    }

    if (callback) {
      this.onMarkerDragListener = await CapacitorNativeMap.addListener('onMarkerDrag', this.generateCallback(callback));
    } else {
      this.onMarkerDragListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onMarkerDragEnd' events.
   *
   * @param callback
   * @returns
   */
  async setOnMarkerDragEndListener(callback?: MapListenerCallback<MarkerClickCallbackData>): Promise<void> {
    if (this.onMarkerDragEndListener) {
      this.onMarkerDragEndListener.remove();
    }

    if (callback) {
      this.onMarkerDragEndListener = await CapacitorNativeMap.addListener(
        'onMarkerDragEnd',
        this.generateCallback(callback),
      );
    } else {
      this.onMarkerDragEndListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onMyLocationButtonClick' events.
   *
   * @param callback
   * @returns
   */
  async setOnMyLocationButtonClickListener(
    callback?: MapListenerCallback<MyLocationButtonClickCallbackData>,
  ): Promise<void> {
    if (this.onMyLocationButtonClickListener) {
      this.onMyLocationButtonClickListener.remove();
    }

    if (callback) {
      this.onMyLocationButtonClickListener = await CapacitorNativeMap.addListener(
        'onMyLocationButtonClick',
        this.generateCallback(callback),
      );
    } else {
      this.onMyLocationButtonClickListener = undefined;
    }
  }

  /**
   * Set the event listener on the map for 'onMyLocationClick' events.
   *
   * @param callback
   * @returns
   */
  async setOnMyLocationClickListener(callback?: MapListenerCallback<MapClickCallbackData>): Promise<void> {
    if (this.onMyLocationClickListener) {
      this.onMyLocationClickListener.remove();
    }

    if (callback) {
      this.onMyLocationClickListener = await CapacitorNativeMap.addListener(
        'onMyLocationClick',
        this.generateCallback(callback),
      );
    } else {
      this.onMyLocationClickListener = undefined;
    }
  }

  /**
   * Remove all event listeners on the map.
   *
   * @param callback
   * @returns
   */
  async removeAllMapListeners(): Promise<void> {
    if (this.onBoundsChangedListener) {
      this.onBoundsChangedListener.remove();
      this.onBoundsChangedListener = undefined;
    }
    if (this.onCameraIdleListener) {
      this.onCameraIdleListener.remove();
      this.onCameraIdleListener = undefined;
    }
    if (this.onCameraMoveStartedListener) {
      this.onCameraMoveStartedListener.remove();
      this.onCameraMoveStartedListener = undefined;
    }

    if (this.onClusterClickListener) {
      this.onClusterClickListener.remove();
      this.onClusterClickListener = undefined;
    }

    if (this.onClusterInfoWindowClickListener) {
      this.onClusterInfoWindowClickListener.remove();
      this.onClusterInfoWindowClickListener = undefined;
    }

    if (this.onInfoWindowClickListener) {
      this.onInfoWindowClickListener.remove();
      this.onInfoWindowClickListener = undefined;
    }

    if (this.onMapClickListener) {
      this.onMapClickListener.remove();
      this.onMapClickListener = undefined;
    }

    if (this.onPolylineClickListener) {
      this.onPolylineClickListener.remove();
      this.onPolylineClickListener = undefined;
    }

    if (this.onMarkerClickListener) {
      this.onMarkerClickListener.remove();
      this.onMarkerClickListener = undefined;
    }

    if (this.onPolygonClickListener) {
      this.onPolygonClickListener.remove();
      this.onPolygonClickListener = undefined;
    }

    if (this.onCircleClickListener) {
      this.onCircleClickListener.remove();
      this.onCircleClickListener = undefined;
    }

    if (this.onMarkerDragStartListener) {
      this.onMarkerDragStartListener.remove();
      this.onMarkerDragStartListener = undefined;
    }

    if (this.onMarkerDragListener) {
      this.onMarkerDragListener.remove();
      this.onMarkerDragListener = undefined;
    }

    if (this.onMarkerDragEndListener) {
      this.onMarkerDragEndListener.remove();
      this.onMarkerDragEndListener = undefined;
    }

    if (this.onMyLocationButtonClickListener) {
      this.onMyLocationButtonClickListener.remove();
      this.onMyLocationButtonClickListener = undefined;
    }

    if (this.onMyLocationClickListener) {
      this.onMyLocationClickListener.remove();
      this.onMyLocationClickListener = undefined;
    }
  }

  private generateCallback(callback: MapListenerCallback<any>): MapListenerCallback<any> {
    const mapId = this.id;
    return (data: any) => {
      if (data.mapId == mapId) {
        callback(data);
      }
    };
  }
}
