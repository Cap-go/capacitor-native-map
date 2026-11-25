# Cap-go/website patch: native-map engine option

Target page: `content/docs/plugins/native-map.md` (or equivalent)

## Section to add after install / before API reference

### WebView Native UI Engine (optional)

`NativeMap.create({ webViewNativeUIEngine: true })` integrates
[`@webview-native-ui/engine`](https://github.com/webview-native-ui/engine) so a native map can scroll with your
Web layout and Web modals can cover the map without breaking touch routing. Default is `false` (no Engine
registration, same behavior as older plugin versions).

**App setup**

1. `npm install --save-exact @webview-native-ui/engine@1.0.11` (match the plugin release).
2. **iOS (SwiftPM):** resolved via the plugin dependency.
3. **iOS (CocoaPods):** in the app target `Podfile`, outside `capacitor_pods`:

   ```ruby
   pod 'WebViewNativeUIEngine', :path => '../../node_modules/@webview-native-ui/engine'
   ```

4. **Android:** the plugin pulls `io.github.webview-native-ui:engine:1.0.11`; ensure `google()` and `mavenCentral()`.

**Usage**

```ts
await NativeMap.create({
  id: 'feed-map',
  element: document.getElementById('map-slot')!,
  webViewNativeUIEngine: true,
  apiKey: GOOGLE_MAPS_API_KEY,
  config: { center, zoom },
});
```

Works with `toBack: true` for HUD-style overlays: HTML controls stay in the WebView, open areas still pass gestures
to the map, and Engine handles z-order when a Web sheet covers the map.

**Ionic apps:** optional `enableSupportIonicOverlays()` from `@webview-native-ui/engine/ionic` once at startup.

## Short guide bullet list

- Scroll: embed the map in a scrollable feed with `webViewNativeUIEngine: true`; the Engine DOM slot is created
  automatically (`data-native-map-engine-slot`).
- Overlay: combine with `toBack` when the map is full-screen behind HTML; use Engine for modals and bottom sheets.
- Leave the flag off in production until native deps are synced; behavior is unchanged when `false`.