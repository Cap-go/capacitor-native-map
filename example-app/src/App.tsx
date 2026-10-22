import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { NativeMap } from '@capgo/capacitor-native-map';
import { playTour, type TourStep } from './tour';
import './App.css';

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

type DemoMode = 'embedded' | 'overlay' | 'tour';

// Start straight into the demo tour (used to record the README videos).
const AUTO_TOUR = import.meta.env.VITE_DEMO_TOUR === '1';
const PLATFORM_LABEL = Capacitor.getPlatform() === 'ios' ? 'iOS · Apple MapKit' : 'Android · Google Maps';

const App = () => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const nativeMapRef = useRef<NativeMap | null>(null);
  const [mode, setMode] = useState<DemoMode>(
    AUTO_TOUR ? 'tour' : Capacitor.isNativePlatform() ? 'overlay' : 'embedded',
  );
  const [tourStep, setTourStep] = useState<{ step: TourStep; index: number } | null>(null);
  const [status, setStatus] = useState('Initializing map...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      if (mode === 'embedded' && !mapRef.current) {
        return;
      }
      if (Capacitor.getPlatform() !== 'ios' && !API_KEY) {
        setError('Set VITE_GOOGLE_MAPS_API_KEY for web and Android builds.');
        setStatus('Missing API key');
        return;
      }

      try {
        await nativeMapRef.current?.destroy().catch(() => undefined);
        nativeMapRef.current = null;

        const overlay = (mode === 'overlay' || mode === 'tour') && Capacitor.isNativePlatform();
        const map = await NativeMap.create({
          id: overlay ? 'overlay-map' : 'demo-map',
          element: overlay ? document.body : mapRef.current!,
          toBack: overlay,
          apiKey: API_KEY,
          config: {
            center: DEFAULT_CENTER,
            zoom: 12,
            width: overlay ? window.innerWidth : undefined,
            height: overlay ? window.innerHeight : undefined,
            x: 0,
            y: 0,
          },
        });

        if (destroyed) {
          await map.destroy();
          return;
        }

        nativeMapRef.current = map;
        if (mode === 'tour') {
          setStatus('');
          setError(null);
          while (!destroyed) {
            await playTour(map, (step, index) => setTourStep({ step, index }), () => destroyed);
          }
          return;
        }
        await map.addMarker({
          coordinate: DEFAULT_CENTER,
          title: 'Hello',
          snippet: overlay ? 'HTML overlay demo' : 'Capgo Native Map',
        });
        await map.setCamera({
          coordinate: { lat: 37.7849, lng: -122.4094 },
          zoom: 14,
          animate: true,
        });
        setStatus(overlay ? 'Overlay map ready. Pan and pinch on open areas.' : 'Map ready with marker and camera move.');
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
  }, [mode]);

  return (
    <main className={`app ${mode !== 'embedded' ? 'app-overlay' : ''}`}>
      {mode === 'overlay' && (
        <div className="map-overlay-ui">
          <header className="overlay-bar" data-map-overlay>
            <h1>Native map behind HTML</h1>
            <p>Buttons stay in the WebView. Open areas pass gestures to the map.</p>
          </header>
          <div className="overlay-actions" data-map-overlay>
            <button type="button" onClick={() => setStatus('Recentering...')}>
              HUD button
            </button>
            <button type="button" onClick={() => setMode('embedded')}>
              Embedded demo
            </button>
            <button type="button" onClick={() => setMode('tour')}>
              Demo tour
            </button>
          </div>
        </div>
      )}

      {mode === 'embedded' && (
        <>
          <h1>@capgo/capacitor-native-map</h1>
          <p className="tagline">Google Maps on Android, Apple MapKit on iOS, Google Maps JS on web.</p>
          <button type="button" className="mode-switch" onClick={() => setMode('overlay')}>
            Try HTML overlay (toBack)
          </button>
          <div ref={mapRef} className="map-container" />
        </>
      )}

      {mode === 'tour' && (
        <div className="map-overlay-ui">
          <header className="overlay-bar tour-card" data-map-overlay>
            <span className="tour-platform">{PLATFORM_LABEL}</span>
            <h1>{tourStep ? `${tourStep.index + 1}. ${tourStep.step.title}` : 'Demo tour'}</h1>
            <p>
              <code>{tourStep?.step.detail ?? 'Loading map…'}</code>
            </p>
          </header>
          {!AUTO_TOUR && (
            <div className="overlay-actions" data-map-overlay>
              <button type="button" onClick={() => setMode('overlay')}>
                Stop tour
              </button>
            </div>
          )}
        </div>
      )}

      <p className="status-message">{status}</p>
      {error && <p className="error">{error}</p>}
    </main>
  );
};

export default App;
