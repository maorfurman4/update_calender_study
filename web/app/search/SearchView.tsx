'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronUp, ChevronDown, Layers } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { MapView } from '@/components/search/MapView'
import { FilterBar, type ActiveFilters } from '@/components/search/FilterBar'
import { ListingCard } from '@/components/search/ListingCard'
import { searchPropertiesInPolygon, searchPropertiesFiltered } from '@/lib/properties/search'
import type { Property } from '@/lib/supabase/types'

// ─── Bottom-sheet open states ─────────────────────────────────────────────────
type SheetState = 'collapsed' | 'peek' | 'expanded'

// Tailwind translate values per sheet state
const SHEET_TRANSLATE: Record<SheetState, string> = {
  collapsed: 'translate-y-[calc(100%-3.5rem)]',  // only handle visible
  peek:      'translate-y-[calc(100%-16rem)]',    // ~256 px visible
  expanded:  'translate-y-0',                     // full height
}

export function SearchView() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ── Filters (URL-synced) ───────────────────────────────────────────────────
  const [filters, setFilters] = useState<ActiveFilters>(() => ({
    category:  (searchParams.get('category') as ActiveFilters['category']) ?? undefined,
    minRooms:  searchParams.get('minRooms') ? Number(searchParams.get('minRooms')) : undefined,
    minPrice:  searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice:  searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
  }))

  // ── Search state ───────────────────────────────────────────────────────────
  const [properties, setProperties] = useState<Property[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [polygonGeoJson, setPolygonGeoJson] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // ── Bottom sheet ───────────────────────────────────────────────────────────
  const [sheetState, setSheetState] = useState<SheetState>('peek')

  // ─── Sync filters → URL params ────────────────────────────────────────────
  const syncFiltersToUrl = useCallback(
    (next: ActiveFilters) => {
      const params = new URLSearchParams()
      if (next.category) params.set('category', next.category)
      if (next.minRooms) params.set('minRooms', String(next.minRooms))
      if (next.minPrice) params.set('minPrice', String(next.minPrice))
      if (next.maxPrice) params.set('maxPrice', String(next.maxPrice))
      router.replace(`/search?${params.toString()}`, { scroll: false })
    },
    [router],
  )

  // ─── Run search ────────────────────────────────────────────────────────────
  const runSearch = useCallback(
    (nextFilters: ActiveFilters, geojson: string | null) => {
      startTransition(async () => {
        let result
        if (geojson) {
          result = await searchPropertiesInPolygon({
            geojson,
            category: nextFilters.category,
          })
        } else {
          result = await searchPropertiesFiltered({
            category:  nextFilters.category,
            minRooms:  nextFilters.minRooms,
            minPrice:  nextFilters.minPrice,
            maxPrice:  nextFilters.maxPrice,
          })
        }
        setProperties(result.properties)
        // Open peek sheet so results are visible
        setSheetState('peek')
      })
    },
    [],
  )

  // ─── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    runSearch(filters, null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Filter change ─────────────────────────────────────────────────────────
  const handleFiltersChange = useCallback(
    (next: ActiveFilters) => {
      setFilters(next)
      syncFiltersToUrl(next)
      runSearch(next, polygonGeoJson)
    },
    [polygonGeoJson, syncFiltersToUrl, runSearch],
  )

  // ─── Polygon complete ──────────────────────────────────────────────────────
  const handlePolygonComplete = useCallback(
    (geojson: string) => {
      setPolygonGeoJson(geojson)
      runSearch(filters, geojson)
    },
    [filters, runSearch],
  )

  // ─── Polygon clear ─────────────────────────────────────────────────────────
  const handlePolygonClear = useCallback(() => {
    setPolygonGeoJson(null)
    runSearch(filters, null)
  }, [filters, runSearch])

  // ─── Marker click → select + scroll into view ─────────────────────────────
  const handleMarkerClick = useCallback((property: Property) => {
    setSelectedId(property.id)
    setSheetState('peek')
  }, [])

  // ─── Sheet toggle button ───────────────────────────────────────────────────
  const cycleSheet = () => {
    setSheetState((s) =>
      s === 'collapsed' ? 'peek' : s === 'peek' ? 'expanded' : 'collapsed',
    )
  }

  const isPolygonActive = polygonGeoJson !== null

  return (
    // Use PageShell in fullscreen mode — map fills viewport, nav still visible
    <PageShell fullscreen>
      <div className="relative w-full h-full overflow-hidden">

        {/* ── Map layer (fills entire content area) ──────────────────────── */}
        <MapView
          properties={properties}
          selectedId={selectedId}
          onMarkerClick={handleMarkerClick}
          onPolygonComplete={handlePolygonComplete}
          onPolygonClear={handlePolygonClear}
          isLoading={isPending}
        />

        {/* ── FilterBar — floating top overlay ───────────────────────────── */}
        <div className="absolute top-0 start-0 end-0 z-10 pointer-events-none px-3 pt-3">
          <FilterBar
            filters={filters}
            onChange={handleFiltersChange}
            resultCount={properties.length}
            isPolygonActive={isPolygonActive}
            onClearPolygon={handlePolygonClear}
          />
        </div>

        {/* ── Bottom sheet — slides up from bottom ────────────────────────── */}
        <div
          className={`
            absolute bottom-0 start-0 end-0 z-20
            flex flex-col
            bg-[var(--color-bg)] rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)]
            transition-transform duration-300 ease-out
            h-[calc(100%-5rem)]
            ${SHEET_TRANSLATE[sheetState]}
          `}
        >
          {/* Handle bar + header row */}
          <div
            className="flex items-center justify-between px-4 pt-3 pb-2 cursor-pointer select-none shrink-0"
            onClick={cycleSheet}
            role="button"
            aria-label="הצג/הסתר רשימת נכסים"
          >
            {/* Drag handle indicator */}
            <div className="absolute start-1/2 top-2 -translate-x-1/2 w-10 h-1 rounded-full bg-[var(--color-border)]" />

            {/* Result count + sheet state icon */}
            <div className="flex items-center gap-2 mt-2">
              <Layers size={15} className="text-[var(--color-primary)]" />
              <span className="text-sm font-semibold text-[var(--color-dark)]">
                {properties.length} נכסים
              </span>
            </div>

            <div className="flex items-center gap-3 mt-2">
              {/* Browse in swipe CTA */}
              <Link
                href={`/swipe?${new URLSearchParams(
                  Object.fromEntries(
                    Object.entries({
                      category: filters.category,
                      minRooms: filters.minRooms?.toString(),
                    }).filter(([, v]) => v !== undefined) as [string, string][]
                  )
                ).toString()}`}
                className="flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-[var(--color-dark)] transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                גלוש בנכסים
              </Link>

              {/* Chevron */}
              {sheetState === 'expanded' ? (
                <ChevronDown size={18} className="text-[var(--color-muted)]" />
              ) : (
                <ChevronUp size={18} className="text-[var(--color-muted)]" />
              )}
            </div>
          </div>

          {/* Scrollable listing cards */}
          <div className="flex-1 overflow-y-auto px-3 pb-4 overscroll-contain">
            {isPending ? (
              /* Skeleton placeholders while loading */
              <div className="flex flex-col gap-2 mt-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-28 rounded-xl bg-[var(--color-border)] animate-pulse"
                  />
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                <p className="text-sm font-medium text-[var(--color-dark)]">
                  לא נמצאו נכסים
                </p>
                <p className="text-xs text-[var(--color-muted)] max-w-[18rem]">
                  נסה לשנות את הסננים או לצייר אזור שונה במפה
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2 mt-1">
                {properties.map((property) => (
                  <ListingCard
                    key={property.id}
                    property={property}
                    isSelected={property.id === selectedId}
                    onClick={() => {
                      setSelectedId(
                        property.id === selectedId ? null : property.id,
                      )
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
