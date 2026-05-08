'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// ─── Validation schema ────────────────────────────────────────────────────────
// Note: no .default() — keeps input/output types identical for RHF compatibility.
// Defaults are provided in the form's `defaultValues` instead.

export const PropertySchema = z.object({
  category:      z.enum(['rental', 'sale', 'roommates']),
  title:         z.string().min(5, 'כותרת חייבת להכיל לפחות 5 תווים').max(120),
  description:   z.string().max(2000).optional(),
  price:         z.number({ message: 'נדרש מחיר' }).positive('מחיר חייב להיות חיובי'),
  // lat/lng come from Google Maps Autocomplete — converted to PostGIS WKT server-side
  address:       z.string().min(5, 'יש לבחור כתובת מהרשימה'),
  lat:           z.number({ message: 'יש לבחור כתובת מהרשימה' }),
  lng:           z.number({ message: 'יש לבחור כתובת מהרשימה' }),
  arnona:        z.number().min(0),
  vaad:          z.number().min(0),
  entry_date:    z.string().optional(),
  photos:        z.array(z.string()).max(10),
  rooms:         z.number().positive().optional(),
  size_sqm:      z.number().positive().int().optional(),
  floor:         z.number().int().optional(),
  pets_allowed:  z.boolean(),
  parking:       z.boolean(),
  storage:       z.boolean(),
  contact_phone: z.string().optional(),
  contact_hours: z.string().optional(),
})

export type PropertyFormData = z.infer<typeof PropertySchema>

export interface PropertyActionResult {
  error?: string
  propertyId?: string
}

// ─── createPropertyAction ─────────────────────────────────────────────────────

/**
 * Server Action: validate → authenticate → insert property row.
 *
 * PostGIS POINT encoding:
 *   WKT:  'POINT(longitude latitude)'   ← longitude FIRST (ISO 19125 / GeoJSON)
 *   Example Tel Aviv: 'POINT(34.7818 32.0853)'
 *
 *   PostgREST accepts WKT strings directly as values for GEOGRAPHY columns.
 *   The DB column is GEOGRAPHY(POINT, 4326) — SRID 4326 = WGS84 (GPS coords).
 *   Supabase PostgREST automatically casts the string via ST_GeogFromText.
 *
 *   The `lat` and `lng` fields are stripped from the DB payload before insert;
 *   they are only used to construct the locationWKT string.
 */
export async function createPropertyAction(
  data: PropertyFormData,
): Promise<PropertyActionResult> {
  // 1. Re-validate server-side (defence-in-depth — never trust client)
  const parsed = PropertySchema.safeParse(data)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message
    return { error: first ?? 'נתונים לא תקינים' }
  }

  // 2. Verify the caller is authenticated
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'לא מחובר' }

  const { lat, lng, ...fields } = parsed.data

  // 3. Build PostGIS WKT — longitude FIRST per ISO 19125
  const locationWKT = `POINT(${lng} ${lat})`

  // 4. Insert
  const { data: row, error } = await supabase
    .from('properties')
    .insert({
      ...fields,
      owner_id: user.id,
      location: locationWKT as unknown,   // PostgREST casts string → geography
      status:   'active',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createPropertyAction]', error.message)
    return { error: 'שגיאה בשמירת הנכס, נסה שוב' }
  }

  return { propertyId: row.id }
}
