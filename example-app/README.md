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
bunx cap sync
bunx cap open android   # or ios
```
