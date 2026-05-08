'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { Pencil, X, Loader2 } from 'lucide-react'
import { initMapsLoader } from '@/lib/maps/loader'
import type { Property } from '@/lib/supabase/types'

// ─── Israel centre + default zoom ─────────────────────────────────────────────
const ISRAEL_CENTER = { lat: 31.7683, lng: 35.2137 }
const DEFAULT_ZOOM = 8

// ─── Turf helpers (dynamic import — Maps-only pages; ~100 KB) ─────────────────

async function polygonToGeoJson(
  path: google.maps.LatLng[],
): Promise<string | null> {
  try {
    const turf = await import('@turf/turf')

    // Build coordinate pairs [lng, lat] — GeoJSON order
    const coords: [number, number][] = path.map((pt) => [pt.lng(), pt.lat()])

    // Close the ring: first === last
    if (
      coords[0][0] !== coords[coords.length - 1][0] ||
      coords[0][1] !== coords[coords.length - 1][1]
    ) {
      coords.push(coords[0])
    }

    if (coords.length < 4) return null // need ≥3 unique + closing vertex

    // turfjs polygon() returns a Feature<Polygon>
    // We extract only the geometry so PostGIS ST_GeomFromGeoJSON receives it directly
    const feature = turf.polygon([coords])

    // Ensure right-hand rule winding (PostGIS expects exterior ring counter-clockwise)
    const rewindFeature = turf.rewind(feature, { reverse: true })

    return JSON.stringify(rewindFeature.geometry)
  } catch (err) {
    console.error('[polygonToGeoJson]', err)
    return null
  }
}

// ─── MapView props ────────────────────────────────────────────────────────────

interface MapViewProps {
  properties: Property[]
  selectedId: string | null
  onMarkerClick: (property: Property) => void
  onPolygonComplete: (geojson: string) => void
  onPolygonClear: () => void
  isLoading: boolean
}

/**
 * MapView — full-viewport Google Map.
 *
 * Drawing mode:
 *   Uses Google Maps Drawing Library (DrawingManager) in POLYGON mode.
 *   On polygon_complete → converts OverlayType.POLYGON path to GeoJSON geometry
 *   via turf.polygon() + turf.rewind() (right-hand rule) → calls onPolygonComplete.
 *
 * Markers:
 *   AdvancedMarkerElement for each property; click calls onMarkerClick.
 *   Selected marker gets a highlighted pin colour.
 */
export function MapView({
  properties,
  selectedId,
  onMarkerClick,
  onPolygonComplete,
  onPolygonClear,
  isLoading,
}: MapViewProps) {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const drawingRef = useRef<google.maps.drawing.DrawingManager | null>(null)
  const activePolygonRef = useRef<google.maps.Polygon | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [mapsReady, setMapsReady] = useState(false)
  const [initError, setInitError] = useState(false)

  // ── Initialise map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current || !mapDivRef.current) return
    let cancelled = false

    async function init() {
      try {
        initMapsLoader()
        const { importLibrary } = await import('@googlemaps/js-api-loader')
        const { Map } = (await importLibrary('maps')) as google.maps.MapsLibrary

        if (cancelled || !mapDivRef.current) return

        mapRef.current = new Map(mapDivRef.current, {
          center: ISRAEL_CENTER,
          zoom: DEFAULT_ZOOM,
          mapId: 'nadlan-search-map',     // required for AdvancedMarkerElement
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.LEFT_BOTTOM,
          },
          gestureHandling: 'greedy',       // single-finger pan on mobile
          clickableIcons: false,
        })

        setMapsReady(true)
      } catch (err) {
        console.error('[MapView] init error:', err)
        if (!cancelled) setInitError(true)
      }
    }

    init()
    return () => { cancelled = true }
  }, [])

  // ── Update markers when properties change ──────────────────────────────────
  useEffect(() => {
    if (!mapsReady || !mapRef.current) return

    async function renderMarkers() {
      const { importLibrary } = await import('@googlemaps/js-api-loader')
      const { AdvancedMarkerElement, PinElement } =
        (await importLibrary('marker')) as google.maps.MarkerLibrary

      // Clear old markers
      markersRef.current.forEach((m) => { m.map = null })
      markersRef.current = []

      properties.forEach((prop) => {
        // Skip properties without a location
        // (location column is GEOGRAPHY — not directly available as lat/lng)
        // We use a fallback: if the property has no parseable location, skip.
        // In production the properties_in_polygon RPC returns only located props.
        if (!prop.address) return

        // We don't have parsed lat/lng in the Row type (location is `unknown`).
        // The swipe/search view creates markers from address string geocoding.
        // For Phase 4, we place markers using a basic heuristic: all results
        // cluster near the centre. Real geocoding is done in Phase 5 (bot).
        // TODO Phase 5: store lat/lng as separate columns for easy JS access.
        // For now, markers are placed at map centre + small offset per index.
        const idx = properties.indexOf(prop)
        const offset = idx * 0.002
        const position = {
          lat: ISRAEL_CENTER.lat + offset,
          lng: ISRAEL_CENTER.lng + offset,
        }

        const isSelected = prop.id === selectedId

        const pin = new PinElement({
          background: isSelected ? '#2C1810' : '#6B4F3A',
          borderColor: isSelected ? '#6B4F3A' : '#2C1810',
          glyphColor: '#FDFAF7',
          scale: isSelected ? 1.3 : 1,
        })

        const marker = new AdvancedMarkerElement({
          map: mapRef.current!,
          position,
          content: pin.element,
          title: prop.title,
        })

        marker.addEventListener('click', () => onMarkerClick(prop))
        markersRef.current.push(marker)
      })
    }

    renderMarkers()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties, selectedId, mapsReady])

  // ── Drawing manager setup ──────────────────────────────────────────────────
  const startDrawing = useCallback(async () => {
    if (!mapRef.current) return

    // Clear any existing polygon first
    handleClear()
    setIsDrawing(true)

    const { importLibrary } = await import('@googlemaps/js-api-loader')
    const drawingLib =
      (await importLibrary('drawing')) as google.maps.DrawingLibrary

    drawingRef.current = new drawingLib.DrawingManager({
      drawingMode: google.maps.drawing.OverlayType.POLYGON,
      drawingControl: false,        // we supply our own UI button
      polygonOptions: {
        fillColor: '#6B4F3A',
        fillOpacity: 0.15,
        strokeColor: '#6B4F3A',
        strokeWeight: 2,
        editable: false,
        zIndex: 1,
      },
    })

    drawingRef.current.setMap(mapRef.current)

    google.maps.event.addListenerOnce(
      drawingRef.current,
      'polygoncomplete',
      async (polygon: google.maps.Polygon) => {
        // Stop drawing mode immediately
        drawingRef.current?.setDrawingMode(null)
        drawingRef.current?.setMap(null)
        setIsDrawing(false)

        activePolygonRef.current = polygon

        // Extract path and convert to GeoJSON geometry
        const path = polygon.getPath().getArray()
        const geojson = await polygonToGeoJson(path)

        if (geojson) {
          onPolygonComplete(geojson)
        }
      },
    )
  }, [onPolygonComplete])

  const handleClear = useCallback(() => {
    // Remove drawing manager
    if (drawingRef.current) {
      drawingRef.current.setDrawingMode(null)
      drawingRef.current.setMap(null)
      drawingRef.current = null
    }
    // Remove polygon overlay
    if (activePolygonRef.current) {
      activePolygonRef.current.setMap(null)
      activePolygonRef.current = null
    }
    setIsDrawing(false)
    onPolygonClear()
  }, [onPolygonClear])

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
      {/* Map canvas */}
      <div ref={mapDivRef} className="w-full h-full" />

      {/* Error state */}
      {initError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg)]/80">
          <p className="text-sm text-[var(--color-muted)] text-center px-4">
            לא ניתן לטעון את המפה.<br />בדוק את מפתח Google Maps ב-.env.local
          </p>
        </div>
      )}

      {/* Loading spinner overlay (while RPC runs) */}
      {isLoading && (
        <div className="absolute top-4 start-1/2 -translate-x-1/2 flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-lg">
          <Loader2 size={16} className="animate-spin text-[var(--color-primary)]" />
          <span className="text-xs font-medium text-[var(--color-dark)]">מחפש...</span>
        </div>
      )}

      {/* Draw / Clear polygon control */}
      {mapsReady && !initError && (
        <div className="absolute bottom-32 end-4 flex flex-col gap-2">
          {!isDrawing && !activePolygonRef.current && (
            <button
              type="button"
              onClick={startDrawing}
              className="flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-[var(--color-dark)] transition-colors"
              aria-label="צייר אזור חיפוש"
            >
              <Pencil size={15} />
              <span>צייר אזור</span>
            </button>
          )}

          {isDrawing && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-red-700 transition-colors"
            >
              <X size={15} />
              <span>בטל ציור</span>
            </button>
          )}

          {!isDrawing && activePolygonRef.current && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-dark)] shadow-lg hover:border-[var(--color-primary)] transition-colors"
            >
              <X size={15} />
              <span>נקה אזור</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
