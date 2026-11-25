# Native Map Example

This Vite + React app demonstrates `@capgo/capacitor-native-map`: create a map, add a marker, and move the camera.

## API keys

- **Web / Android (Google Maps):** set a valid Google Maps API key when calling `NativeMap.create({ apiKey, ... })`.
- **Android:** also add your key to `AndroidManifest.xml` as `com.google.android.geo.API_KEY` (see the example manifest).
- **iOS:** uses Apple MapKit; no Google API key is required.

## Run locally

```bash
bun install
bun run build
bunx cap sync ios   # or: bunx cap sync android
bunx cap open ios
```

The example app includes a **WebView Native UI Engine** checkbox (native platforms only). Toggle it to compare maps with `webViewNativeUIEngine` on or off.

## Maestro (from repo root)

```bash
cd example-app && bun install && bun run build && bunx cap sync ios
maestro test .maestro/flows/engine-disabled-embedded.yaml
maestro test .maestro/flows/engine-enabled-embedded.yaml
maestro test .maestro/flows/native-map-smoke.yaml
```
