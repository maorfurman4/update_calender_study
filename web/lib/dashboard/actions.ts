'use server'

import { createClient } from '@/lib/supabase/server'

// ─── Types returned by the RPCs ────────────────────────────────────────────────

export interface PropertyStat {
  property_id:    string
  property_title: string
  total_views:    number
  right_swipes:   number
  conversion_pct: number
  bot_started:    number
  approved_leads: number
}

export interface DailySwipe {
  day:          string   // ISO date string
  right_swipes: number
  left_swipes:  number
}

export interface DropOffPoint {
  property_id:    string
  property_title: string
  last_question:  string
  drop_count:     number
}

export interface LeadRow {
  lead_id:        string
  property_id:    string
  property_title: string
  renter_name:    string
  renter_phone:   string | null
  renter_email:   string | null
  revealed_at:    string
}

export interface DashboardData {
  propertyStats: PropertyStat[]
  dailySwipes:   DailySwipe[]
  dropOffs:      DropOffPoint[]
  leads:         LeadRow[]
  error?:        string
}

/**
 * getDashboardData — fetches all analytics for the owner dashboard in parallel.
 *
 * Calls four PostgreSQL RPCs (defined in 005_dashboard_rpcs.sql):
 *   owner_property_stats   — per-property KPI aggregates
 *   owner_daily_swipes     — 30-day time series for the recharts line chart
 *   owner_drop_off_stats   — JSONB[] analysis of stalled bot conversations
 *   owner_leads            — approved leads with renter contact details
 *
 * All four RPC calls are parallelised with Promise.all for minimal TTFB.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { propertyStats: [], dailySwipes: [], dropOffs: [], leads: [], error: 'Unauthenticated' }
  }

  const ownerId = user.id

  // RPCs are defined in 005_dashboard_rpcs.sql but not in the auto-generated types.
  // Using 'as never' overrides the union restriction while keeping full TS safety on results.
  const [statsRes, dailyRes, dropRes, leadsRes] = await Promise.all([
    supabase.rpc('owner_property_stats' as never,  { p_owner_id: ownerId } as never),
    supabase.rpc('owner_daily_swipes' as never,    { p_owner_id: ownerId, p_days_back: 30 } as never),
    supabase.rpc('owner_drop_off_stats' as never,  { p_owner_id: ownerId } as never),
    supabase.rpc('owner_leads' as never,           { p_owner_id: ownerId } as never),
  ])

  if (statsRes.error) console.error('[dashboard] stats RPC:', statsRes.error.message)
  if (dailyRes.error) console.error('[dashboard] daily RPC:', dailyRes.error.message)
  if (dropRes.error)  console.error('[dashboard] dropoff RPC:', dropRes.error.message)
  if (leadsRes.error) console.error('[dashboard] leads RPC:', leadsRes.error.message)

  return {
    propertyStats: (statsRes.data  ?? []) as unknown as PropertyStat[],
    dailySwipes:   (dailyRes.data  ?? []) as unknown as DailySwipe[],
    dropOffs:      (dropRes.data   ?? []) as unknown as DropOffPoint[],
    leads:         (leadsRes.data  ?? []) as unknown as LeadRow[],
  }
}
