'use server'

import { createClient } from '@/lib/supabase/server'
import type { Property, PropertyCategory } from '@/lib/supabase/types'

export interface PolygonSearchParams {
  /** Valid GeoJSON Polygon geometry string */
  geojson: string
  category?: PropertyCategory
  status?: 'active' | 'paused' | 'sold'
}

export interface SearchResult {
  properties: Property[]
  error?: string
}

/**
 * searchPropertiesInPolygon — calls the PostGIS RPC.
 *
 * The RPC signature (created in Phase 1, 002_schema.sql):
 *   properties_in_polygon(geojson TEXT, p_category TEXT, p_status TEXT)
 *   → SETOF properties
 *   Uses: ST_Within(location::geometry, ST_GeomFromGeoJSON(geojson))
 *
 * GeoJSON format expected:
 *   Only the *geometry* object is passed (type: "Polygon"), NOT the Feature wrapper.
 *   First and last coordinate must be identical (closed ring).
 *   Coordinates are [longitude, latitude] pairs (GeoJSON spec).
 *
 * Example:
 *   {
 *     "type": "Polygon",
 *     "coordinates": [
 *       [[34.77,32.08],[34.79,32.08],[34.79,32.07],[34.77,32.07],[34.77,32.08]]
 *     ]
 *   }
 */
export async function searchPropertiesInPolygon({
  geojson,
  category,
  status = 'active',
}: PolygonSearchParams): Promise<SearchResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('properties_in_polygon', {
    geojson,
    p_category: category ?? null,
    p_status: status,
  })

  if (error) {
    console.error('[searchPropertiesInPolygon]', error.message)
    return { properties: [], error: error.message }
  }

  return { properties: (data as Property[]) ?? [] }
}

/**
 * searchPropertiesFiltered — standard filter query without polygon.
 * Used when no polygon is drawn (shows all matching active properties).
 */
export interface FilterParams {
  category?: PropertyCategory
  minPrice?: number
  maxPrice?: number
  minRooms?: number
}

export async function searchPropertiesFiltered(
  filters: FilterParams,
): Promise<SearchResult> {
  const supabase = await createClient()

  let query = supabase
    .from('properties')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50)

  if (filters.category) query = query.eq('category', filters.category)
  if (filters.minPrice) query = query.gte('price', filters.minPrice)
  if (filters.maxPrice) query = query.lte('price', filters.maxPrice)
  if (filters.minRooms) query = query.gte('rooms', filters.minRooms)

  const { data, error } = await query

  if (error) {
    return { properties: [], error: error.message }
  }

  return { properties: (data as Property[]) ?? [] }
}
