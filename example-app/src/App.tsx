import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { NativeMap } from '@capgo/capacitor-native-map';
import { playTour, type TourStep } from './tour';
import './App.css';

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

type DemoMode = 'embedded' | 'overlay' | 'tour';

const ENGINE_DEFAULT =
  import.meta.env.VITE_WEBVIEW_NATIVE_UI_ENGINE === '1' ||
  import.meta.env.VITE_WEBVIEW_NATIVE_UI_ENGINE === 'true' ||
  false;

// The tour drives the native overlay map, so it only runs on iOS and Android.
const TOUR_SUPPORTED = Capacitor.isNativePlatform();
// Start straight into the demo tour (used to record the README videos).
const AUTO_TOUR = TOUR_SUPPORTED && import.meta.env.VITE_DEMO_TOUR === '1';
const PLATFORM_LABELS: Record<string, string> = {
  ios: 'iOS · Apple MapKit',
  android: 'Android · Google Maps',
  web: 'Web · Google Maps JS',
};
const PLATFORM_LABEL = PLATFORM_LABELS[Capacitor.getPlatform()] ?? Capacitor.getPlatform();

function waitForNativeMapReady(map: NativeMap, timeoutMs = 120_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('onMapReady timeout')), timeoutMs);
    map.whenMapReady(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

const App = () => {
  const mapHostRef = useRef<HTMLElement | null>(null);
  const nativeMapRef = useRef<NativeMap | null>(null);
  const [mode, setMode] = useState<DemoMode>(
    AUTO_TOUR ? 'tour' : Capacitor.isNativePlatform() ? 'overlay' : 'embedded',
  );
  const [tourStep, setTourStep] = useState<{ step: TourStep; index: number } | null>(null);
  const [engineEnabled, setEngineEnabled] = useState(ENGINE_DEFAULT);
  const [mapReady, setMapReady] = useState(false);
  const [status, setStatus] = useState('Initializing map...');
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const engineActive = engineEnabled && Capacitor.isNativePlatform();

  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      if (mode === 'embedded' && !mapHostRef.current) {
        return;
      }
      if (Capacitor.getPlatform() !== 'ios' && !API_KEY) {
        setError('Set VITE_GOOGLE_MAPS_API_KEY for web and Android builds.');
        setStatus('Missing API key');
        setMapReady(false);
        return;
      }

      try {
        setMapReady(false);
        setStatus('Initializing map...');
        setError(null);
        await nativeMapRef.current?.destroy().catch(() => undefined);
        nativeMapRef.current = null;

        const overlay = (mode === 'overlay' || mode === 'tour') && Capacitor.isNativePlatform();
        const map = await NativeMap.create({
          id: overlay ? 'overlay-map' : 'demo-map',
          element: overlay ? document.body : mapHostRef.current!,
          toBack: overlay,
          webViewNativeUIEngine: Capacitor.isNativePlatform() && engineEnabled,
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
        await waitForNativeMapReady(map);

        if (destroyed) {
          await map.destroy();
          return;
        }

        if (mode === 'tour') {
          setStatus('');
          setError(null);
          setMapReady(true);
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
        setMapReady(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('Failed to load map');
        setMapReady(false);
      }
    };

    init();

    return () => {
      destroyed = true;
      nativeMapRef.current?.destroy().catch(() => undefined);
      nativeMapRef.current = null;
    };
  }, [mode, engineEnabled]);

  return (
    <main
      className={`app ${mode !== 'embedded' ? 'app-overlay' : ''}`}
      data-engine-enabled={engineActive ? 'true' : 'false'}
      data-demo-status={error ? 'error' : mapReady ? 'ready' : 'pending'}
    >
      {mode === 'overlay' && (
        <div className="map-overlay-ui">
          <header className="overlay-bar" data-map-overlay>
            <h1>Native map behind HTML</h1>
            <p>Buttons stay in the WebView. Open areas pass gestures to the map.</p>
          </header>
          <div className="overlay-actions" data-map-overlay>
            <button
              type="button"
              onClick={() => setStatus('Recentering...')}
            >
              HUD button
            </button>
            <button type="button" onClick={() => setSheetOpen(true)}>
              Open sheet
            </button>
            <button type="button" onClick={() => setMode('embedded')}>
              Embedded demo
            </button>
            {TOUR_SUPPORTED && (
              <button type="button" onClick={() => setMode('tour')}>
                Demo tour
              </button>
            )}
          </div>
          {sheetOpen && (
            <div className="sheet-modal" data-map-overlay>
              <p className="sheet-title">Web sheet over map</p>
              <p>Touches here stay on the Web layer, not the map.</p>
              <button type="button" onClick={() => setSheetOpen(false)}>
                Close sheet
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'embedded' && (
        <>
          <h1>@capgo/capacitor-native-map</h1>
          <p className="tagline">Google Maps on Android, Apple MapKit on iOS, Google Maps JS on web.</p>
          {Capacitor.isNativePlatform() && (
            <label className="engine-toggle">
              <input
                type="checkbox"
                checked={engineEnabled}
                onChange={(event) => setEngineEnabled(event.target.checked)}
              />
              WebView Native UI Engine
            </label>
          )}
          <button type="button" className="mode-switch" onClick={() => setMode('overlay')}>
            Try HTML overlay (toBack)
          </button>
          <capacitor-native-map
            ref={(el) => {
              mapHostRef.current = el;
            }}
            className="map-container"
          />
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