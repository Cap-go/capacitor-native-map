// Portions adapted from @capacitor/google-maps (MIT) bridge method names for a unified JS API.
import Foundation
import Capacitor

extension NativeMapPlugin {

    @objc func enableTouch(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), let map = maps[id] else {
            call.reject("map not found", PluginError.mapNotFound)
            return
        }
        map.setGestures(scroll: true, zoom: true, rotate: true, pitch: true)
        call.resolve()
    }

    @objc func disableTouch(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), let map = maps[id] else {
            call.reject("map not found", PluginError.mapNotFound)
            return
        }
        map.setGestures(scroll: false, zoom: false, rotate: false, pitch: false)
        call.resolve()
    }

    @objc func enableIndoorMaps(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func enableAccessibilityElements(_ call: CAPPluginCall) {
        call.resolve()
    }

    @objc func enableTrafficLayer(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), let map = maps[id] else {
            call.reject("map not found", PluginError.mapNotFound)
            return
        }
        let enabled = call.getBool("enabled", false)
        map.setTraffic(enabled)
        call.resolve()
    }

    @objc func addTileOverlay(_ call: CAPPluginCall) {
        call.reject("tile overlays are not supported on iOS", PluginError.unavailable)
    }

    @objc func removeTileOverlay(_ call: CAPPluginCall) {
        call.reject("tile overlays are not supported on iOS", PluginError.unavailable)
    }

    @objc func removePolygons(_ call: CAPPluginCall) {
        removeOverlayIds(call, key: "polygonIds")
    }

    @objc func removeCircles(_ call: CAPPluginCall) {
        removeOverlayIds(call, key: "circleIds")
    }

    @objc func removePolylines(_ call: CAPPluginCall) {
        removeOverlayIds(call, key: "polylineIds")
    }

    private func removeOverlayIds(_ call: CAPPluginCall, key: String) {
        guard let id = call.getString("id"), let map = maps[id] else {
            call.reject("map not found", PluginError.mapNotFound)
            return
        }
        guard let ids = call.getArray(key) as? [String] else {
            call.reject("\(key) is required", PluginError.invalidArgument)
            return
        }
        map.removeOverlays(ids)
        call.resolve()
    }

    @objc func mapBoundsContains(_ call: CAPPluginCall) {
        guard let boundsObj = call.getObject("bounds"),
              let pointObj = call.getObject("point") else {
            call.reject("bounds and point are required", PluginError.invalidArgument)
            return
        }
        let sw = boundsObj["southwest"] as? JSObject ?? [:]
        let ne = boundsObj["northeast"] as? JSObject ?? [:]
        let lat = pointObj["lat"] as? Double ?? 0
        let lng = pointObj["lng"] as? Double ?? 0
        let south = sw["lat"] as? Double ?? -90
        let west = sw["lng"] as? Double ?? -180
        let north = ne["lat"] as? Double ?? 90
        let east = ne["lng"] as? Double ?? 180
        let contains = lat >= south && lat <= north && lng >= west && lng <= east
        call.resolve(["contains": contains])
    }

    @objc func mapBoundsExtend(_ call: CAPPluginCall) {
        guard let boundsObj = call.getObject("bounds"),
              let pointObj = call.getObject("point") else {
            call.reject("bounds and point are required", PluginError.invalidArgument)
            return
        }
        let sw = boundsObj["southwest"] as? JSObject ?? [:]
        let ne = boundsObj["northeast"] as? JSObject ?? [:]
        let lat = pointObj["lat"] as? Double ?? 0
        let lng = pointObj["lng"] as? Double ?? 0
        let south = min(sw["lat"] as? Double ?? lat, lat)
        let west = min(sw["lng"] as? Double ?? lng, lng)
        let north = max(ne["lat"] as? Double ?? lat, lat)
        let east = max(ne["lng"] as? Double ?? lng, lng)
        call.resolve([
            "bounds": [
                "southwest": ["lat": south, "lng": west],
                "northeast": ["lat": north, "lng": east]
            ]
        ])
    }

    @objc func dispatchMapEvent(_ call: CAPPluginCall) {
        call.resolve()
    }
}
