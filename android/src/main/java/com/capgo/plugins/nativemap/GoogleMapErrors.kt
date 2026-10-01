package com.capgo.plugins.nativemap

import org.json.JSONObject
import kotlin.Exception

enum class NativeMapErrors {
    UNHANDLED_ERROR, INVALID_MAP_ID, MAP_NOT_FOUND, MARKER_NOT_FOUND, INVALID_ARGUMENTS, PERMISSIONS_DENIED_LOCATION, GOOGLE_MAP_NOT_AVAILABLE, BOUNDS_NOT_FOUND, TILE_OVERLAY_NOT_FOUND
}

class NativeMapErrorObject(val code: Int, val message: String, val extra: HashMap<String,Any> = HashMap()) {
    private fun asJSONObject(): JSONObject {
        val returnJSONObject = JSONObject()

        returnJSONObject.put("code", code)
        returnJSONObject.put("message", message)
        returnJSONObject.put("extra", extra)

        return returnJSONObject
    }

    override fun toString(): String {
        return this.asJSONObject().toString()
    }
}

fun getErrorObject(err: NativeMapsError): NativeMapErrorObject {
    return when(err) {
        is InvalidArgumentsError -> {
            NativeMapErrorObject(err.getErrorCode(), "Invalid Arguments Provided: ${err.message}.")
        }
        is InvalidMapIdError -> {
            NativeMapErrorObject(err.getErrorCode(), "Missing or invalid map id.")
        }
        is MapNotFoundError -> {
            NativeMapErrorObject(err.getErrorCode(), "Map not found for provided id.")
        }
        is MarkerNotFoundError -> {
            NativeMapErrorObject(err.getErrorCode(), "Marker not found for provided id.")
        }
        is PermissionDeniedLocation -> {
            NativeMapErrorObject(err.getErrorCode(), "Permissions denied for accessing device location.")
        }
        is NativeMapNotAvailable -> {
            NativeMapErrorObject(err.getErrorCode(), "Google Map is not available.")
        }
        is BoundsNotFoundError -> {
            NativeMapErrorObject(err.getErrorCode(), "Google Map Bounds could not be found.")
        }
        is TileOverlayNotFoundError -> {
            NativeMapErrorObject(err.getErrorCode(), "Tile overlay not found for provided id.")
        }
        else -> {
            NativeMapErrorObject(err.getErrorCode(), "Unhandled Error: ${err.message}.")
        }
    }
}

fun getErrorObject(err: Exception): NativeMapErrorObject {
    return NativeMapErrorObject(0, "Unhandled Error: ${err.message}.")
}

open class NativeMapsError(message: String? = ""): Throwable(message) {
    open fun getErrorCode(): Int {
        return NativeMapErrors.UNHANDLED_ERROR.ordinal
    }
}

class InvalidMapIdError(message: String? = ""): NativeMapsError(message) {
    override fun getErrorCode(): Int {
        return NativeMapErrors.INVALID_MAP_ID.ordinal
    }
}

class MapNotFoundError(message: String? = ""): NativeMapsError(message) {
    override fun getErrorCode(): Int {
        return NativeMapErrors.MAP_NOT_FOUND.ordinal
    }
}

class MarkerNotFoundError(message: String? = ""): NativeMapsError(message) {
    override fun getErrorCode(): Int {
        return NativeMapErrors.MARKER_NOT_FOUND.ordinal
    }
}

class TileOverlayNotFoundError(message: String? = ""): NativeMapsError(message) {
    override fun getErrorCode(): Int {
        return NativeMapErrors.TILE_OVERLAY_NOT_FOUND.ordinal
    }
}

class InvalidArgumentsError(message: String? = ""): NativeMapsError(message) {
    override fun getErrorCode(): Int {
        return NativeMapErrors.INVALID_ARGUMENTS.ordinal
    }
}

class PermissionDeniedLocation(message: String? = ""): NativeMapsError(message) {
    override fun getErrorCode(): Int {
        return NativeMapErrors.PERMISSIONS_DENIED_LOCATION.ordinal
    }
}

class NativeMapNotAvailable(message: String? = ""): NativeMapsError(message) {
    override fun getErrorCode(): Int {
        return NativeMapErrors.GOOGLE_MAP_NOT_AVAILABLE.ordinal
    }
}

class BoundsNotFoundError(message: String? = ""): NativeMapsError(message) {
    override fun getErrorCode(): Int {
        return NativeMapErrors.BOUNDS_NOT_FOUND.ordinal
    }
}
