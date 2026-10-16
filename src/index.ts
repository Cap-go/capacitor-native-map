/* eslint-disable @typescript-eslint/no-namespace */
import { LatLngBounds, MapType, Marker, Polygon, Circle, Polyline, StyleSpan } from './definitions';
import { NativeMap } from './map';

export { NativeMap, LatLngBounds, MapType, Marker, Polygon, Circle, Polyline, StyleSpan };

declare global {
  export namespace JSX {
    export interface IntrinsicElements {
      'capacitor-native-map': any;
    }
  }
}
