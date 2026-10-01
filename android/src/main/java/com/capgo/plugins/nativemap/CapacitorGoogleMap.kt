package com.capgo.plugins.nativemap

import android.annotation.SuppressLint
import android.graphics.*
import android.location.Location
import android.util.Log
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import com.getcapacitor.Bridge
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.google.android.gms.maps.*
import com.google.android.gms.maps.GoogleMap.*
import com.google.android.gms.maps.model.*
import com.google.maps.android.clustering.Cluster
import com.google.maps.android.clustering.ClusterManager
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.Channel
import java.io.InputStream
import java.net.URL

class CapacitorNativeMapView(
        val id: String,
        val config: NativeMapConfig,
        val delegate: CapacitorNativeMapPlugin
) :
        OnCameraIdleListener,
        OnCameraMoveStartedListener,
        OnCameraMoveListener,
        OnMyLocationButtonClickListener,
        OnMyLocationClickListener,
        OnMapReadyCallback,
        OnMapClickListener,
        OnMarkerClickListener,
        OnMarkerDragListener,
        OnInfoWindowClickListener,
        OnCircleClickListener,
        OnPolylineClickListener,
        OnPolygonClickListener {
    private var mapView: MapView
    private var googleMap: GoogleMap? = null
    private val markers = HashMap<String, CapacitorNativeMapViewMarker>()
    private val tileOverlays = HashMap<String, CapacitorNativeMapViewTileOverlay>()
    private val polygons = HashMap<String, CapacitorNativeMapPolygon>()
    private val circles = HashMap<String, CapacitorNativeMapCircle>()
    private val polylines = HashMap<String, CapacitorNativeMapViewPolyline>()        
    private val markerIcons = HashMap<String, Bitmap>()
    private var clusterManager: ClusterManager<CapacitorNativeMapViewMarker>? = null

    private val isReadyChannel = Channel<Boolean>()
    private var debounceJob: Job? = null
    private var mapViewParent: FrameLayout? = null
    var toBack: Boolean = false
    var isMapVisible: Boolean = true
    private var originalWebViewAlpha: Float? = null

    init {
        val bridge = delegate.bridge

        mapView = MapView(bridge.context, config.googleMapOptions)
        initMap()
    }

    private fun initMap() {
        CoroutineScope(Dispatchers.Main).launch {
            mapView.onCreate(null)
            mapView.onStart()
            mapView.getMapAsync(this@CapacitorNativeMapView)
            mapView.setWillNotDraw(false)
            isReadyChannel.receive()
            render()
        }
    }

    private fun render() {
        CoroutineScope(Dispatchers.Main).launch {
                val bridge = delegate.bridge
                val parent = FrameLayout(bridge.context)
                parent.minimumHeight = bridge.webView.height
                parent.minimumWidth = bridge.webView.width

                val parentLayoutParams =
                        FrameLayout.LayoutParams(
                                getScaledPixels(bridge, config.width),
                                getScaledPixels(bridge, config.height),
                        )
                parentLayoutParams.leftMargin = getScaledPixels(bridge, config.x)
                parentLayoutParams.topMargin = getScaledPixels(bridge, config.y)

                parent.tag = id
                parent.layoutParams = parentLayoutParams

                val mapChildParams =
                        FrameLayout.LayoutParams(
                                FrameLayout.LayoutParams.MATCH_PARENT,
                                FrameLayout.LayoutParams.MATCH_PARENT,
                        )
                mapView.layoutParams = mapChildParams
                parent.addView(mapView)

                val webParent = (bridge.webView.parent) as ViewGroup
                if (toBack) {
                    webParent.addView(parent, 0)
                    applyToBackVisualState(bridge)
                } else {
                    webParent.addView(parent)
                    bridge.webView.bringToFront()
                    bridge.webView.setBackgroundColor(Color.TRANSPARENT)
                }

                mapViewParent = parent
                parent.visibility = if (isMapVisible) View.VISIBLE else View.GONE
                if (config.styles != null) {
                    googleMap?.setMapStyle(MapStyleOptions(config.styles!!))
                }

                if (config.maxZoom != null) {
                    googleMap?.setMaxZoomPreference(config.maxZoom!!.toFloat())
                }

                if (config.minZoom != null) {
                    googleMap?.setMinZoomPreference((config.minZoom!!.toFloat()))
                }

                if (config.mapTypeId != null) {
                    when (config.mapTypeId!!) {
                        "hybrid" -> googleMap?.mapType = GoogleMap.MAP_TYPE_HYBRID
                        "roadmap" -> googleMap?.mapType = GoogleMap.MAP_TYPE_NORMAL
                        "satellite" -> googleMap?.mapType = GoogleMap.MAP_TYPE_SATELLITE
                        "terrain" -> googleMap?.mapType = GoogleMap.MAP_TYPE_TERRAIN
                    }
                }

                if (config.restriction != null) {
                    googleMap?.setLatLngBoundsForCameraTarget(config.restriction!!.latLngBounds)
                }

                if (config.heading != null) {
                    googleMap?.cameraPosition?.let { cameraPosition ->
                        googleMap?.animateCamera(
                            CameraUpdateFactory.newCameraPosition(
                                CameraPosition.Builder(cameraPosition)
                                    .bearing(config.heading!!.toFloat())
                                    .build()
                            )
                        )
                    }
                }
        }
    }

    fun updateRender(updatedBounds: RectF) {
        this.config.x = updatedBounds.left.toInt()
        this.config.y = updatedBounds.top.toInt()
        this.config.width = updatedBounds.width().toInt()
        this.config.height = updatedBounds.height().toInt()

        runBlocking {
            CoroutineScope(Dispatchers.Main).launch {
                applyLayoutFromConfig()
            }
        }
    }

    fun updateLayout(x: Int, y: Int, width: Int, height: Int) {
        config.x = x
        config.y = y
        config.width = width
        config.height = height
        CoroutineScope(Dispatchers.Main).launch {
            applyLayoutFromConfig()
        }
    }

    fun applyMapVisibility(isVisible: Boolean) {
        isMapVisible = isVisible
        CoroutineScope(Dispatchers.Main).launch {
            mapViewParent?.visibility = if (isVisible) View.VISIBLE else View.GONE
        }
    }

    private fun applyLayoutFromConfig() {
        val bridge = delegate.bridge
        val parent = mapViewParent ?: return
        val layoutParams = parent.layoutParams as? FrameLayout.LayoutParams
            ?: FrameLayout.LayoutParams(
                getScaledPixels(bridge, config.width),
                getScaledPixels(bridge, config.height),
            )
        layoutParams.width = getScaledPixels(bridge, config.width)
        layoutParams.height = getScaledPixels(bridge, config.height)
        layoutParams.leftMargin = getScaledPixels(bridge, config.x)
        layoutParams.topMargin = getScaledPixels(bridge, config.y)
        parent.layoutParams = layoutParams
        val childParams =
                (mapView.layoutParams as? FrameLayout.LayoutParams)
                        ?: FrameLayout.LayoutParams(
                                FrameLayout.LayoutParams.MATCH_PARENT,
                                FrameLayout.LayoutParams.MATCH_PARENT,
                        )
        childParams.width = FrameLayout.LayoutParams.MATCH_PARENT
        childParams.height = FrameLayout.LayoutParams.MATCH_PARENT
        childParams.leftMargin = 0
        childParams.topMargin = 0
        mapView.layoutParams = childParams
        parent.requestLayout()
    }

    private fun applyToBackVisualState(bridge: Bridge) {
        val webView = bridge.webView
        if (originalWebViewAlpha == null) {
            originalWebViewAlpha = webView.alpha
        }
        if (ToBackCompositorHelper.shouldTransparentizeWebViewParent()) {
            (webView.parent as? View)?.setBackgroundColor(ToBackCompositorHelper.resolveWebViewBackgroundColor())
        }
        webView.setBackgroundColor(ToBackCompositorHelper.resolveWebViewBackgroundColor())
        webView.setLayerType(ToBackCompositorHelper.resolveWebViewLayerType(), null)
        val alpha = ToBackCompositorHelper.resolveWebViewAlpha(originalWebViewAlpha ?: 1f)
        webView.alpha = alpha
        if (!ToBackCompositorHelper.shouldUseHardwareLayerOnPreviewContainer(true)) {
            mapViewParent?.setLayerType(View.LAYER_TYPE_NONE, null)
        }
        bridge.webView.bringToFront()
    }

    fun dispatchTouchEvent(event: MotionEvent) {
        CoroutineScope(Dispatchers.Main).launch {
            val offsetViewBounds = getMapBounds()

            val relativeTop = offsetViewBounds.top
            val relativeLeft = offsetViewBounds.left

            event.setLocation(event.x - relativeLeft, event.y - relativeTop)
            mapView.dispatchTouchEvent(event)
        }
    }

    fun bringToFront() {
        CoroutineScope(Dispatchers.Main).launch {
            val mapViewParent =
                    ((delegate.bridge.webView.parent) as ViewGroup).findViewWithTag<ViewGroup>(
                            this@CapacitorNativeMapView.id
                    )
            mapViewParent.bringToFront()
        }
    }

    fun destroy() {
        runBlocking {
            val job =
                    CoroutineScope(Dispatchers.Main).launch {
                        val bridge = delegate.bridge

                        val viewToRemove: View? =
                                ((bridge.webView.parent) as ViewGroup).findViewWithTag(id)
                        if (null != viewToRemove) {
                            ((bridge.webView.parent) as ViewGroup).removeView(viewToRemove)
                        }
                        mapView.onDestroy()
                        googleMap = null
                        clusterManager = null
                    }

            job.join()
        }
    }

    fun addTileOverlay(
        tileOverlay: CapacitorNativeMapViewTileOverlay,
        callback: (Result<String>) -> Unit
    ) {
        try {
            googleMap ?: throw NativeMapNotAvailable()

            CoroutineScope(Dispatchers.Main).launch {
                val tileProvider = object : UrlTileProvider(256, 256) {
                    override fun getTileUrl(x: Int, y: Int, zoom: Int): URL? {
                        return URL(tileOverlay.url
                            .replace("{x}", "$x")
                            .replace("{y}", "$y")
                            .replace("{z}", "$zoom")
                        )
                    }
                }
                var tileOverlayOptions = TileOverlayOptions().tileProvider(tileProvider)
                if (tileOverlay.zIndex != null) {
                    tileOverlayOptions.zIndex(tileOverlay.zIndex!!)
                }
                if (tileOverlay.visible != null) {
                    tileOverlayOptions.visible(tileOverlay.visible!!)
                }
                if (tileOverlay.opacity != null) {
                    tileOverlayOptions.transparency(1f - tileOverlay.opacity!!)
                }

                val googleMapTileOverlay = googleMap?.addTileOverlay(tileOverlayOptions)

                tileOverlay.googleMapTileOverlay = googleMapTileOverlay
                tileOverlays[googleMapTileOverlay!!.id] = tileOverlay

                callback(Result.success(googleMapTileOverlay.id))
            }
        } catch (e: NativeMapsError) {
            callback(Result.failure(e))
        }
    }

    fun removeTileOverlay(id: String, callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()

            val tileOverlay = tileOverlays[id]
            tileOverlay ?: throw TileOverlayNotFoundError()

            CoroutineScope(Dispatchers.Main).launch {
                tileOverlay.googleMapTileOverlay?.remove()
                tileOverlays.remove(id)

                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    fun addMarkers(
            newMarkers: List<CapacitorNativeMapViewMarker>,
            callback: (ids: Result<List<String>>) -> Unit
    ) {
        try {
            googleMap ?: throw NativeMapNotAvailable()
            val markerIds: MutableList<String> = mutableListOf()

            CoroutineScope(Dispatchers.Main).launch {
                newMarkers.forEach {
                    val markerOptions: Deferred<MarkerOptions> =
                            CoroutineScope(Dispatchers.IO).async {
                                this@CapacitorNativeMapView.buildMarker(it)
                            }
                    val googleMapMarker = googleMap?.addMarker(markerOptions.await())
                    it.googleMapMarker = googleMapMarker

                    if (googleMapMarker != null) {
                        if (clusterManager != null) {
                            googleMapMarker.remove()
                        }

                        markers[googleMapMarker.id] = it
                        markerIds.add(googleMapMarker.id)
                    }
                }

                if (clusterManager != null) {
                    clusterManager?.addItems(newMarkers)
                    clusterManager?.cluster()
                }

                callback(Result.success(markerIds))
            }
        } catch (e: NativeMapsError) {
            callback(Result.failure(e))
        }
    }

    fun addMarker(marker: CapacitorNativeMapViewMarker, callback: (result: Result<String>) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()

            var markerId: String

            CoroutineScope(Dispatchers.Main).launch {
                val markerOptions: Deferred<MarkerOptions> =
                        CoroutineScope(Dispatchers.IO).async {
                            this@CapacitorNativeMapView.buildMarker(marker)
                        }
                val googleMapMarker = googleMap?.addMarker(markerOptions.await())

                marker.googleMapMarker = googleMapMarker

                if (clusterManager != null) {
                    googleMapMarker?.remove()
                    clusterManager?.addItem(marker)
                    clusterManager?.cluster()
                }

                markers[googleMapMarker!!.id] = marker

                markerId = googleMapMarker.id

                callback(Result.success(markerId))
            }
        } catch (e: NativeMapsError) {
            callback(Result.failure(e))
        }
    }

    fun addPolygons(newPolygons: List<CapacitorNativeMapPolygon>, callback: (ids: Result<List<String>>) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()
            val shapeIds: MutableList<String> = mutableListOf()

            CoroutineScope(Dispatchers.Main).launch {
                newPolygons.forEach {
                    val polygonOptions: Deferred<PolygonOptions> = CoroutineScope(Dispatchers.IO).async {
                        this@CapacitorNativeMapView.buildPolygon(it)
                    }

                    val googleMapsPolygon = googleMap?.addPolygon(polygonOptions.await())
                    googleMapsPolygon?.tag = it.tag

                    it.googleMapsPolygon = googleMapsPolygon

                    polygons[googleMapsPolygon!!.id] = it
                    shapeIds.add(googleMapsPolygon.id)
                }

                callback(Result.success(shapeIds))
            }
        } catch (e: NativeMapsError) {
            callback(Result.failure(e))
        }
    }

    fun addCircles(newCircles: List<CapacitorNativeMapCircle>,callback: (ids: Result<List<String>>) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()
            val circleIds: MutableList<String> = mutableListOf()

            CoroutineScope(Dispatchers.Main).launch {
                newCircles.forEach {
                    var circleOptions: Deferred<CircleOptions> = CoroutineScope(Dispatchers.IO).async {
                        this@CapacitorNativeMapView.buildCircle(it)
                    }

                    val googleMapsCircle = googleMap?.addCircle(circleOptions.await())
                    googleMapsCircle?.tag = it.tag

                    it.googleMapsCircle = googleMapsCircle

                    circles[googleMapsCircle!!.id] = it
                    circleIds.add(googleMapsCircle.id)
                }

                callback(Result.success(circleIds))
            }
        } catch (e: NativeMapsError) {
            callback(Result.failure(e))
        }
    }

    fun addPolylines(newLines: List<CapacitorNativeMapViewPolyline>, callback: (ids: Result<List<String>>) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()
            val lineIds: MutableList<String> = mutableListOf()

            CoroutineScope(Dispatchers.Main).launch {
                newLines.forEach {
                    val polylineOptions: Deferred<PolylineOptions> = CoroutineScope(Dispatchers.IO).async {
                        this@CapacitorNativeMapView.buildPolyline(it)
                    }
                    val googleMapPolyline = googleMap?.addPolyline(polylineOptions.await())
                    googleMapPolyline?.tag = it.tag
                    
                    it.googleMapsPolyline = googleMapPolyline

                    polylines[googleMapPolyline!!.id] = it
                    lineIds.add(googleMapPolyline.id)
                }

                callback(Result.success(lineIds))
            }
        } catch (e: NativeMapsError) {
            callback(Result.failure(e))
        }
    }

    private fun setClusterManagerRenderer(minClusterSize: Int?) {
        clusterManager?.renderer = CapacitorClusterManagerRenderer(
            delegate.bridge.context,
            googleMap,
            clusterManager,
            minClusterSize
        )
    }

    @SuppressLint("PotentialBehaviorOverride")
    fun enableClustering(minClusterSize: Int?, callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()

            CoroutineScope(Dispatchers.Main).launch {
                if (clusterManager != null) {
                    setClusterManagerRenderer(minClusterSize)
                    callback(null)
                    return@launch
                }

                val bridge = delegate.bridge
                clusterManager = ClusterManager(bridge.context, googleMap)

                setClusterManagerRenderer(minClusterSize)
                setClusterListeners()

                // add existing markers to the cluster
                if (markers.isNotEmpty()) {
                    for ((_, marker) in markers) {
                        marker.googleMapMarker?.remove()
                        // marker.googleMapMarker = null
                    }
                    clusterManager?.addItems(markers.values)
                    clusterManager?.cluster()
                }

                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    @SuppressLint("PotentialBehaviorOverride")
    fun disableClustering(callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()

            CoroutineScope(Dispatchers.Main).launch {
                clusterManager?.clearItems()
                clusterManager?.cluster()
                clusterManager = null

                googleMap?.setOnMarkerClickListener(this@CapacitorNativeMapView)

                // add existing markers back to the map
                if (markers.isNotEmpty()) {
                    for ((_, marker) in markers) {
                        val markerOptions: Deferred<MarkerOptions> =
                                CoroutineScope(Dispatchers.IO).async {
                                    this@CapacitorNativeMapView.buildMarker(marker)
                                }
                        val googleMapMarker = googleMap?.addMarker(markerOptions.await())
                        marker.googleMapMarker = googleMapMarker
                    }
                }

                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    fun removePolygons(ids: List<String>, callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()

            CoroutineScope(Dispatchers.Main).launch {
                ids.forEach {
                    val polygon = polygons[it]
                    if (polygon != null) {
                        polygon.googleMapsPolygon?.remove()
                        polygons.remove(it)
                    }
                }

                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    fun removeMarker(id: String, callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()

            val marker = markers[id]
            marker ?: throw MarkerNotFoundError()

            CoroutineScope(Dispatchers.Main).launch {
                if (clusterManager != null) {
                    clusterManager?.removeItem(marker)
                    clusterManager?.cluster()
                }

                marker.googleMapMarker?.remove()
                markers.remove(id)

                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    fun removeMarkers(ids: List<String>, callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()

            CoroutineScope(Dispatchers.Main).launch {
                val deletedMarkers: MutableList<CapacitorNativeMapViewMarker> = mutableListOf()

                ids.forEach {
                    val marker = markers[it]
                    if (marker != null) {
                        marker.googleMapMarker?.remove()
                        markers.remove(it)

                        deletedMarkers.add(marker)
                    }
                }

                if (clusterManager != null) {
                    clusterManager?.removeItems(deletedMarkers)
                    clusterManager?.cluster()
                }

                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    fun removeCircles(ids: List<String>, callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()

            CoroutineScope(Dispatchers.Main).launch {
                ids.forEach {
                    val circle = circles[it]
                    if (circle != null) {
                        circle.googleMapsCircle?.remove()
                        circles.remove(it)
                    }
                }

                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    fun removePolylines(ids: List<String>, callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()

            CoroutineScope(Dispatchers.Main).launch {
                ids.forEach {
                    val polyline = polylines[it]
                    if (polyline != null) {
                        polyline.googleMapsPolyline?.remove()
                        polylines.remove(it)
                    }
                }

                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    fun setCamera(config: NativeMapCameraConfig, callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()
            CoroutineScope(Dispatchers.Main).launch {
                val currentPosition = googleMap!!.cameraPosition

                var updatedTarget = config.coordinate
                if (updatedTarget == null) {
                    updatedTarget = currentPosition.target
                }

                var zoom = config.zoom
                if (zoom == null) {
                    zoom = currentPosition.zoom.toDouble()
                }

                var bearing = config.bearing
                if (bearing == null) {
                    bearing = currentPosition.bearing.toDouble()
                }

                var angle = config.angle
                if (angle == null) {
                    angle = currentPosition.tilt.toDouble()
                }

                var animate = config.animate
                if (animate == null) {
                    animate = false
                }

                val updatedPosition =
                        CameraPosition.Builder()
                                .target(updatedTarget)
                                .zoom(zoom.toFloat())
                                .bearing(bearing.toFloat())
                                .tilt(angle.toFloat())
                                .build()

                if (animate) {
                    googleMap?.animateCamera(CameraUpdateFactory.newCameraPosition(updatedPosition))
                } else {
                    googleMap?.moveCamera(CameraUpdateFactory.newCameraPosition(updatedPosition))
                }
                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    fun getMapType(callback: (type: String, error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()
            CoroutineScope(Dispatchers.Main).launch {
                val mapType: String = when (googleMap?.mapType) {
                    MAP_TYPE_NORMAL -> "Normal"
                    MAP_TYPE_HYBRID -> "Hybrid"
                    MAP_TYPE_SATELLITE -> "Satellite"
                    MAP_TYPE_TERRAIN -> "Terrain"
                    MAP_TYPE_NONE -> "None"
                    else -> {
                        "Normal"
                    }
                }
                callback(mapType, null);
            }
        }  catch (e: NativeMapsError) {
            callback("", e)
        }
    }

    fun setMapType(mapType: String, callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()
            CoroutineScope(Dispatchers.Main).launch {
                val mapTypeInt: Int =
                        when (mapType) {
                            "Normal" -> MAP_TYPE_NORMAL
                            "Hybrid" -> MAP_TYPE_HYBRID
                            "Satellite" -> MAP_TYPE_SATELLITE
                            "Terrain" -> MAP_TYPE_TERRAIN
                            "None" -> MAP_TYPE_NONE
                            else -> {
                                Log.w(
                                        "CapacitorNativeMap",
                                        "unknown mapView type '$mapType'  Defaulting to normal."
                                )
                                MAP_TYPE_NORMAL
                            }
                        }

                googleMap?.mapType = mapTypeInt
                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    fun enableIndoorMaps(enabled: Boolean, callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()
            CoroutineScope(Dispatchers.Main).launch {
                googleMap?.isIndoorEnabled = enabled
                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    fun enableTrafficLayer(enabled: Boolean, callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()
            CoroutineScope(Dispatchers.Main).launch {
                googleMap?.isTrafficEnabled = enabled
                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    @SuppressLint("MissingPermission")
    fun enableCurrentLocation(enabled: Boolean, callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()
            CoroutineScope(Dispatchers.Main).launch {
                googleMap?.isMyLocationEnabled = enabled
                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    fun setPadding(padding: NativeMapPadding, callback: (error: NativeMapsError?) -> Unit) {
        try {
            googleMap ?: throw NativeMapNotAvailable()
            CoroutineScope(Dispatchers.Main).launch {
                googleMap?.setPadding(padding.left, padding.top, padding.right, padding.bottom)
                callback(null)
            }
        } catch (e: NativeMapsError) {
            callback(e)
        }
    }

    fun getMapBounds(): Rect {
        return Rect(
                getScaledPixels(delegate.bridge, config.x),
                getScaledPixels(delegate.bridge, config.y),
                getScaledPixels(delegate.bridge, config.x + config.width),
                getScaledPixels(delegate.bridge, config.y + config.height)
        )
    }

    fun getLatLngBounds(): LatLngBounds {
        return googleMap?.projection?.visibleRegion?.latLngBounds ?: throw BoundsNotFoundError()
    }

    fun fitBounds(bounds: LatLngBounds, padding: Int) {
        val cameraUpdate = CameraUpdateFactory.newLatLngBounds(bounds, padding)
        googleMap?.animateCamera(cameraUpdate)
    }

    private fun getScaledPixels(bridge: Bridge, pixels: Int): Int {
        // Get the screen's density scale
        val scale = bridge.activity.resources.displayMetrics.density
        // Convert the dps to pixels, based on density scale
        return (pixels * scale + 0.5f).toInt()
    }

    private fun getScaledPixelsF(bridge: Bridge, pixels: Float): Float {
        // Get the screen's density scale
        val scale = bridge.activity.resources.displayMetrics.density
        // Convert the dps to pixels, based on density scale
        return (pixels * scale + 0.5f)
    }

    private fun getScaledRect(bridge: Bridge, rectF: RectF): RectF {
        return RectF(
                getScaledPixelsF(bridge, rectF.left),
                getScaledPixelsF(bridge, rectF.top),
                getScaledPixelsF(bridge, rectF.right),
                getScaledPixelsF(bridge, rectF.bottom)
        )
    }

    private fun buildCircle(circle: CapacitorNativeMapCircle): CircleOptions {
        val circleOptions = CircleOptions()
        circleOptions.fillColor(circle.fillColor)
        circleOptions.strokeColor(circle.strokeColor)
        circleOptions.strokeWidth(circle.strokeWidth)
        circleOptions.zIndex(circle.zIndex)
        circleOptions.clickable(circle.clickable)
        circleOptions.radius(circle.radius.toDouble())
        circleOptions.center(circle.center)

        return circleOptions
    }

    private fun buildPolygon(polygon: CapacitorNativeMapPolygon): PolygonOptions {
        val polygonOptions = PolygonOptions()
        polygonOptions.fillColor(polygon.fillColor)
        polygonOptions.strokeColor(polygon.strokeColor)
        polygonOptions.strokeWidth(polygon.strokeWidth)
        polygonOptions.zIndex(polygon.zIndex)
        polygonOptions.geodesic(polygon.geodesic)
        polygonOptions.clickable(polygon.clickable)

        var shapeCounter = 0
        polygon.shapes.forEach {
            if (shapeCounter == 0) {
                // outer shape
                it.forEach {
                    polygonOptions.add(it)
                }
            } else {
                polygonOptions.addHole(it)
            }

            shapeCounter += 1
        }

        return polygonOptions
    }
    
    private fun buildPolyline(line: CapacitorNativeMapViewPolyline): PolylineOptions {
        val polylineOptions = PolylineOptions()
        polylineOptions.width(line.strokeWidth * this.config.devicePixelRatio)
        polylineOptions.color(line.strokeColor)
        polylineOptions.clickable(line.clickable)
        polylineOptions.zIndex(line.zIndex)
        polylineOptions.geodesic(line.geodesic)

        line.path.forEach {
            polylineOptions.add(it)
        }

        line.styleSpans.forEach {
            if (it.segments != null) {
                polylineOptions.addSpan(StyleSpan(it.color, it.segments))
            } else {
                polylineOptions.addSpan(StyleSpan(it.color))
            }
        }

        return polylineOptions
    }

    private fun buildMarker(marker: CapacitorNativeMapViewMarker): MarkerOptions {
        val markerOptions = MarkerOptions()
        markerOptions.position(marker.coordinate)
        markerOptions.title(marker.title)
        markerOptions.snippet(marker.snippet)
        markerOptions.alpha(marker.opacity)
        markerOptions.flat(marker.isFlat)
        markerOptions.draggable(marker.draggable)
        markerOptions.zIndex(marker.zIndex)
        if (marker.iconAnchor != null) {
            markerOptions.anchor(marker.iconAnchor!!.x, marker.iconAnchor!!.y)
        }


        if (!marker.iconUrl.isNullOrEmpty()) {
            if (this.markerIcons.contains(marker.iconUrl)) {
                val cachedBitmap = this.markerIcons[marker.iconUrl]
                markerOptions.icon(getResizedIcon(cachedBitmap!!, marker))
            } else {
                try {
                    var stream: InputStream? = null
                    if (marker.iconUrl!!.startsWith("https:")) {
                        stream = URL(marker.iconUrl).openConnection().getInputStream()
                    } else {
                        stream = this.delegate.context.assets.open("public/${marker.iconUrl}")
                    }
                    var bitmap = BitmapFactory.decodeStream(stream)
                    this.markerIcons[marker.iconUrl!!] = bitmap
                    markerOptions.icon(getResizedIcon(bitmap, marker))
                } catch (e: Exception) {
                    var detailedMessage = "${e.javaClass} - ${e.localizedMessage}"
                    if (marker.iconUrl!!.endsWith(".svg")) {
                        detailedMessage = "SVG not supported"
                    }

                    Log.w(
                            "CapacitorNativeMap",
                            "Could not load image '${marker.iconUrl}': ${detailedMessage}. Using default marker icon."
                    )
                }
            }
        } else {
            if (marker.colorHue != null) {
                markerOptions.icon(BitmapDescriptorFactory.defaultMarker(marker.colorHue!!))
            }
        }

        marker.markerOptions = markerOptions

        return markerOptions
    }

    private fun getResizedIcon(
            _bitmap: Bitmap,
            marker: CapacitorNativeMapViewMarker
    ): BitmapDescriptor {
        var bitmap = _bitmap
        if (marker.iconSize != null) {
            bitmap =
                    Bitmap.createScaledBitmap(
                            bitmap,
                            (marker.iconSize!!.width * this.config.devicePixelRatio).toInt(),
                            (marker.iconSize!!.height * this.config.devicePixelRatio).toInt(),
                            false
                    )
        }
        return BitmapDescriptorFactory.fromBitmap(bitmap)
    }

    fun onStart() {
        mapView.onStart()
    }

    fun onResume() {
        mapView.onResume()
    }

    fun onStop() {
        mapView.onStop()
    }

    fun onPause() {
        mapView.onPause()
    }

    fun onDestroy() {
        mapView.onDestroy()
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        setListeners()

        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        delegate.notify("onMapReady", data)

        CoroutineScope(Dispatchers.Main).launch {
            isReadyChannel.send(true)
            isReadyChannel.close()
        }
    }

    @SuppressLint("PotentialBehaviorOverride")
    fun setListeners() {
        CoroutineScope(Dispatchers.Main).launch {
            this@CapacitorNativeMapView.googleMap?.setOnCameraIdleListener(this@CapacitorNativeMapView)
            this@CapacitorNativeMapView.googleMap?.setOnCameraMoveStartedListener(
                    this@CapacitorNativeMapView
            )
            this@CapacitorNativeMapView.googleMap?.setOnCameraMoveListener(this@CapacitorNativeMapView)
            this@CapacitorNativeMapView.googleMap?.setOnMarkerClickListener(this@CapacitorNativeMapView)
            this@CapacitorNativeMapView.googleMap?.setOnPolygonClickListener(this@CapacitorNativeMapView)
            this@CapacitorNativeMapView.googleMap?.setOnCircleClickListener(this@CapacitorNativeMapView)
            this@CapacitorNativeMapView.googleMap?.setOnMarkerDragListener(this@CapacitorNativeMapView)
            this@CapacitorNativeMapView.googleMap?.setOnMapClickListener(this@CapacitorNativeMapView)
            this@CapacitorNativeMapView.googleMap?.setOnMyLocationButtonClickListener(
                    this@CapacitorNativeMapView
            )
            this@CapacitorNativeMapView.googleMap?.setOnMyLocationClickListener(this@CapacitorNativeMapView)
            this@CapacitorNativeMapView.googleMap?.setOnInfoWindowClickListener(this@CapacitorNativeMapView)
            this@CapacitorNativeMapView.googleMap?.setOnPolylineClickListener(this@CapacitorNativeMapView)
        }
    }

    fun setClusterListeners() {
        CoroutineScope(Dispatchers.Main).launch {
            clusterManager?.setOnClusterItemClickListener {
                if (null == it.googleMapMarker) false
                else this@CapacitorNativeMapView.onMarkerClick(it.googleMapMarker!!)
            }

            clusterManager?.setOnClusterItemInfoWindowClickListener {
                if (null != it.googleMapMarker) {
                    this@CapacitorNativeMapView.onInfoWindowClick(it.googleMapMarker!!)
                }
            }

            clusterManager?.setOnClusterInfoWindowClickListener {
                val data = this@CapacitorNativeMapView.getClusterData(it)
                delegate.notify("onClusterInfoWindowClick", data)
            }

            clusterManager?.setOnClusterClickListener {
                val data = this@CapacitorNativeMapView.getClusterData(it)
                delegate.notify("onClusterClick", data)
                false
            }
        }
    }

    private fun getClusterData(it: Cluster<CapacitorNativeMapViewMarker>): JSObject {
        val data = JSObject()
        data.put("mapId", this.id)
        data.put("latitude", it.position.latitude)
        data.put("longitude", it.position.longitude)
        data.put("size", it.size)

        val items = JSArray()
        for (item in it.items) {
            val marker = item.googleMapMarker

            if (marker != null) {
                val jsItem = JSObject()
                jsItem.put("markerId", marker.id)
                jsItem.put("latitude", marker.position.latitude)
                jsItem.put("longitude", marker.position.longitude)
                jsItem.put("title", marker.title)
                jsItem.put("snippet", marker.snippet)

                items.put(jsItem)
            }
        }

        data.put("items", items)

        return data
    }

    override fun onMapClick(point: LatLng) {
        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        data.put("latitude", point.latitude)
        data.put("longitude", point.longitude)
        delegate.notify("onMapClick", data)
    }

    override fun onMarkerClick(marker: Marker): Boolean {
        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        data.put("markerId", marker.id)
        data.put("latitude", marker.position.latitude)
        data.put("longitude", marker.position.longitude)
        data.put("title", marker.title)
        data.put("snippet", marker.snippet)
        delegate.notify("onMarkerClick", data)
        return false
    }

    override fun onPolylineClick(polyline: Polyline) {
        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        data.put("polylineId", polyline.id)
        data.put("tag", polyline.tag)
        delegate.notify("onPolylineClick", data)
    }

    override fun onMarkerDrag(marker: Marker) {
        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        data.put("markerId", marker.id)
        data.put("latitude", marker.position.latitude)
        data.put("longitude", marker.position.longitude)
        data.put("title", marker.title)
        data.put("snippet", marker.snippet)
        delegate.notify("onMarkerDrag", data)
    }

    override fun onMarkerDragStart(marker: Marker) {
        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        data.put("markerId", marker.id)
        data.put("latitude", marker.position.latitude)
        data.put("longitude", marker.position.longitude)
        data.put("title", marker.title)
        data.put("snippet", marker.snippet)
        delegate.notify("onMarkerDragStart", data)
    }

    override fun onMarkerDragEnd(marker: Marker) {
        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        data.put("markerId", marker.id)
        data.put("latitude", marker.position.latitude)
        data.put("longitude", marker.position.longitude)
        data.put("title", marker.title)
        data.put("snippet", marker.snippet)
        delegate.notify("onMarkerDragEnd", data)
    }

    override fun onMyLocationButtonClick(): Boolean {
        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        delegate.notify("onMyLocationButtonClick", data)
        return false
    }

    override fun onMyLocationClick(location: Location) {
        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        data.put("latitude", location.latitude)
        data.put("longitude", location.longitude)
        delegate.notify("onMyLocationClick", data)
    }

    override fun onCameraIdle() {
        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        data.put("bounds", getLatLngBoundsJSObject(getLatLngBounds()))
        data.put("bearing", this@CapacitorNativeMapView.googleMap?.cameraPosition?.bearing)
        data.put("latitude", this@CapacitorNativeMapView.googleMap?.cameraPosition?.target?.latitude)
        data.put("longitude", this@CapacitorNativeMapView.googleMap?.cameraPosition?.target?.longitude)
        data.put("tilt", this@CapacitorNativeMapView.googleMap?.cameraPosition?.tilt)
        data.put("zoom", this@CapacitorNativeMapView.googleMap?.cameraPosition?.zoom)
        delegate.notify("onCameraIdle", data)
        delegate.notify("onBoundsChanged", data)
    }

    override fun onCameraMoveStarted(reason: Int) {
        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        data.put("isGesture", reason == 1)
        delegate.notify("onCameraMoveStarted", data)
    }

    override fun onInfoWindowClick(marker: Marker) {
        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        data.put("markerId", marker.id)
        data.put("latitude", marker.position.latitude)
        data.put("longitude", marker.position.longitude)
        data.put("title", marker.title)
        data.put("snippet", marker.snippet)
        delegate.notify("onInfoWindowClick", data)
    }

    override fun onCameraMove() {
        debounceJob?.cancel()
        debounceJob = CoroutineScope(Dispatchers.Main).launch {
            delay(100)
            clusterManager?.cluster()
        }
    }

    override fun onPolygonClick(polygon: Polygon) {
        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        data.put("polygonId", polygon.id)
        data.put("tag", polygon.tag)
        delegate.notify("onPolygonClick", data)
    }

    override fun onCircleClick(circle: Circle) {
        val data = JSObject()
        data.put("mapId", this@CapacitorNativeMapView.id)
        data.put("circleId", circle.id)
        data.put("tag", circle.tag)
        data.put("latitude", circle.center.latitude)
        data.put("longitude", circle.center.longitude)
        data.put("radius", circle.radius)

        delegate.notify("onCircleClick", data)
    }
}

fun getLatLngBoundsJSObject(bounds: LatLngBounds): JSObject {
    val data = JSObject()

    val southwestJS = JSObject()
    val centerJS = JSObject()
    val northeastJS = JSObject()

    southwestJS.put("lat", bounds.southwest.latitude)
    southwestJS.put("lng", bounds.southwest.longitude)
    centerJS.put("lat", bounds.center.latitude)
    centerJS.put("lng", bounds.center.longitude)
    northeastJS.put("lat", bounds.northeast.latitude)
    northeastJS.put("lng", bounds.northeast.longitude)

    data.put("southwest", southwestJS)
    data.put("center", centerJS)
    data.put("northeast", northeastJS)

    return data
}
