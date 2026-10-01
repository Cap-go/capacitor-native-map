import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { NativeMap } from '@capgo/capacitor-native-map';
import './App.css';

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

const App = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const nativeMapRef = useRef<NativeMap | null>(null);
  const [status, setStatus] = useState('Initializing map...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      if (!mapRef.current) {
        return;
      }
      if (Capacitor.getPlatform() !== 'ios' && !API_KEY) {
        setError('Set VITE_GOOGLE_MAPS_API_KEY for web and Android builds.');
        setStatus('Missing API key');
        return;
      }

      try {
        const map = await NativeMap.create({
          id: 'demo-map',
          element: mapRef.current,
          apiKey: API_KEY,
          config: {
            center: DEFAULT_CENTER,
            zoom: 12,
          },
        });

        if (destroyed) {
          await map.destroy();
          return;
        }

        nativeMapRef.current = map;
        await map.addMarker({
          coordinate: DEFAULT_CENTER,
          title: 'Hello',
          snippet: 'Capgo Native Map',
        });
        await map.setCamera({
          coordinate: { lat: 37.7849, lng: -122.4094 },
          zoom: 14,
          animate: true,
        });
        setStatus('Map ready with marker and camera move.');
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('Failed to load map');
      }
    };

    init();

    return () => {
      destroyed = true;
      nativeMapRef.current?.destroy().catch(() => undefined);
      nativeMapRef.current = null;
    };
  }, []);

  return (
    <main className="app">
      <h1>@capgo/capacitor-native-map</h1>
      <p className="tagline">Google Maps on Android, Apple MapKit on iOS, Google Maps JS on web.</p>
      <p className="status-message">{status}</p>
      {error && <p className="error">{error}</p>}
      <div ref={mapRef} className="map-container" />
    </main>
  );
};

export default App;
