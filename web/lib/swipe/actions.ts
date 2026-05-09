'use server'

import { createClient } from '@/lib/supabase/server'
import type { Property, PropertyCategory, SwipeDirection } from '@/lib/supabase/types'

// ─── Feed ──────────────────────────────────────────────────────────────────────

export interface FeedParams {
  category?: PropertyCategory
  minRooms?: number
  limit?: number
}

export interface FeedResult {
  properties: Property[]
  error?: string
}

/**
 * fetchSwipeFeed — returns properties the user hasn't permanently seen yet.
 *
 * Exclusion logic:
 *   - Properties owned by the current user — never shown.
 *   - Right-swiped properties — permanently excluded (user already approved).
 *   - Left-swiped properties whose `swiped_at` is within the last 10 days
 *     — temporarily excluded (10-day recycle rule).
 *   - Left-swiped properties older than 10 days — RE-INCLUDED (recycled back).
 *
 * The second and third bullet are achieved by fetching the set of
 * "currently excluded" property IDs and using NOT IN on the properties query.
 *
 * Supabase OR filter syntax:
 *   direction.eq.right             → permanent exclusion
 *   direction.eq.left,swiped_at.gt.<10dAgo> → still within hold-off window
 */
export async function fetchSwipeFeed({
  category,
  minRooms,
  limit = 20,
}: FeedParams = {}): Promise<FeedResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { properties: [], error: 'Unauthenticated' }
  }

  // ISO timestamp 10 days ago — properties left-swiped AFTER this must be excluded
  const tenDaysAgo = new Date(
    Date.now() - 10 * 24 * 60 * 60 * 1000,
  ).toISOString()

  // Step 1: fetch all property IDs to exclude for this user
  //   • Right swipes are permanent
  //   • Left swipes within the last 10 days are on hold-off
  const { data: excluded, error: swipeError } = await supabase
    .from('swipes')
    .select('property_id')
    .eq('user_id', user.id)
    .or(`direction.eq.right,and(direction.eq.left,swiped_at.gt.${tenDaysAgo})`)

  if (swipeError) {
    console.error('[fetchSwipeFeed] swipe lookup error:', swipeError.message)
    return { properties: [], error: swipeError.message }
  }

  const excludedIds: string[] = (excluded ?? []).map((s) => s.property_id)

  // Step 2: query active properties, excluding owner's own listings
  let query = supabase
    .from('properties')
    .select('*')
    .eq('status', 'active')
    .neq('owner_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  // Apply optional filters
  if (category) query = query.eq('category', category)
  if (minRooms) query = query.gte('rooms', minRooms)

  // Exclude already-swiped properties (PostgREST NOT IN syntax)
  if (excludedIds.length > 0) {
    query = query.not('id', 'in', `(${excludedIds.join(',')})`)
  }

  const { data, error } = await query

  if (error) {
    console.error('[fetchSwipeFeed] query error:', error.message)
    return { properties: [], error: error.message }
  }

  return { properties: (data as Property[]) ?? [] }
}

// ─── Record swipe ──────────────────────────────────────────────────────────────

export interface RecordSwipeResult {
  error?: string
}

/**
 * recordSwipe — upserts a swipe row for the current user.
 *
 * Uses upsert (ON CONFLICT user_id, property_id) so that if the property
 * was previously left-swiped and recycled back after 10 days, the row
 * is updated with the new direction and a fresh `swiped_at` timestamp.
 *
 * On direction='right', also inserts a favorites row (idempotent via upsert).
 */
export async function recordSwipe(
  propertyId: string,
  direction: SwipeDirection,
): Promise<RecordSwipeResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Unauthenticated' }

  const { error: swipeError } = await supabase.from('swipes').upsert(
    {
      user_id:    user.id,
      property_id: propertyId,
      direction,
      swiped_at:  new Date().toISOString(),
    },
    { onConflict: 'user_id,property_id' },
  )

  if (swipeError) {
    console.error('[recordSwipe]', swipeError.message)
    return { error: swipeError.message }
  }

  // Auto-favorite on right swipe (Phase 7 UI reads this table)
  if (direction === 'right') {
    await supabase.from('favorites').upsert(
      { user_id: user.id, property_id: propertyId },
      { onConflict: 'user_id,property_id' },
    )
  }

  return {}
}
