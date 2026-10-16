package com.capgo.plugins.nativemap

import org.json.JSONObject

class CapacitorNativeMapBounds(fromJSONObject: JSONObject) {
    var width: Int = 0
    var height: Int = 0
    var x: Int = 0
    var y: Int = 0

    init {
        if(!fromJSONObject.has("width")) {
            throw InvalidArgumentsError("NativeMapConfig object is missing the required 'width' property")
        }

        if(!fromJSONObject.has("height")) {
            throw InvalidArgumentsError("NativeMapConfig object is missing the required 'height' property")
        }

        if(!fromJSONObject.has("x")) {
            throw InvalidArgumentsError("NativeMapConfig object is missing the required 'x' property")
        }

        if(!fromJSONObject.has("y")) {
            throw InvalidArgumentsError("NativeMapConfig object is missing the required 'y' property")
        }

        width = fromJSONObject.getInt("width")
        height = fromJSONObject.getInt("height")
        x = fromJSONObject.getInt("x")
        y = fromJSONObject.getInt("y")
    }
}