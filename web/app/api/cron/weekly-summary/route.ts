import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import type { Database } from '@/lib/supabase/types'
import {
  buildWeeklySummaryHtml,
  buildWeeklySummarySubject,
  type PropertyEmailData,
} from '@/lib/email/weekly-summary-html'

/**
 * GET /api/cron/weekly-summary
 *
 * Vercel Cron — runs every Sunday at 07:00 UTC.
 * Schedule defined in vercel.json: "0 7 * * 0"
 *
 * Authorization: Bearer <CRON_SECRET>
 *   Vercel automatically sends this header for cron invocations.
 *   Manual triggers (curl) must include it explicitly.
 *
 * Data pipeline:
 *   1. Fetch all active properties + owner details (single query).
 *   2. Group properties by owner.
 *   3. For each owner (has email):
 *      a. Call owner_daily_swipes RPC (last 7 days) → weekly views & right-swipes.
 *      b. Call owner_drop_off_stats RPC → top stall question per property.
 *      c. Read all-time approved_leads from owner_property_stats RPC.
 *      d. Merge into PropertyEmailData[].
 *   4. Build HTML via buildWeeklySummaryHtml().
 *   5. Send via Resend.
 *   6. Return JSON summary { sent, skipped, errors }.
 *
 * All DB access uses the service-role key (bypasses RLS) — this endpoint
 * must NEVER be publicly accessible without the CRON_SECRET check.
 */

// ---------------------------------------------------------------------------
// Types for RPC results (service-role client returns untyped data)
// ---------------------------------------------------------------------------

interface DailySwipeRow {
  day: string
  right_swipes: number | string
  left_swipes:  number | string
}

interface PropertyStatRow {
  property_id:    string
  property_title: string
  total_views:    number | string
  right_swipes:   number | string
  conversion_pct: number | string
  bot_started:    number | string
  approved_leads: number | string
}

interface DropOffRow {
  property_id:    string
  property_title: string
  last_question:  string
  drop_count:     number | string
}

// ---------------------------------------------------------------------------
// Initialise clients (once, at module scope)
// ---------------------------------------------------------------------------

function serviceDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'NADLAN <noreply@nadlan.co.il>'
  const db = serviceDb()

  const weekEnding = new Date().toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  let sent    = 0
  let skipped = 0
  const errors: string[] = []

  try {
    // ── Step 1: Get all active properties with owner info ─────────────────
    const { data: properties, error: propErr } = await db
      .from('properties')
      .select('id, title, address, owner_id')
      .eq('status', 'active')

    if (propErr) throw new Error(`properties query: ${propErr.message}`)
    if (!properties || properties.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 0, message: 'No active properties' })
    }

    // ── Step 2: Group by owner ────────────────────────────────────────────
    const ownerPropertyMap = new Map<string, Array<{ id: string; title: string; address: string }>>()
    for (const p of properties) {
      if (!ownerPropertyMap.has(p.owner_id)) ownerPropertyMap.set(p.owner_id, [])
      ownerPropertyMap.get(p.owner_id)!.push({ id: p.id, title: p.title, address: p.address })
    }

    // ── Step 3: Get owner contact details ─────────────────────────────────
    const ownerIds = [...ownerPropertyMap.keys()]
    const { data: users, error: userErr } = await db
      .from('users')
      .select('id, name, email')
      .in('id', ownerIds)
      .not('email', 'is', null)

    if (userErr) throw new Error(`users query: ${userErr.message}`)

    // ── Step 4: For each owner, gather stats → build email → send ─────────
    for (const user of users ?? []) {
      if (!user.email) { skipped++; continue }

      const ownerProperties = ownerPropertyMap.get(user.id) ?? []
      if (ownerProperties.length === 0) { skipped++; continue }

      try {
        // Run the three stat RPCs in parallel
        const [dailySwipesResult, propStatsResult, dropOffResult] = await Promise.all([
          db.rpc('owner_daily_swipes' as never, {
            p_owner_id: user.id,
            p_days_back: 7,
          } as never),
          db.rpc('owner_property_stats' as never, { p_owner_id: user.id } as never),
          db.rpc('owner_drop_off_stats' as never, { p_owner_id: user.id } as never),
        ])

        const dailyRows  = (dailySwipesResult.data  as DailySwipeRow[]  | null) ?? []
        const statRows   = (propStatsResult.data   as PropertyStatRow[] | null) ?? []
        const dropRows   = (dropOffResult.data     as DropOffRow[]      | null) ?? []

        // Aggregate this-week's swipes (owner_daily_swipes sums across all properties)
        const weekViews = dailyRows.reduce((s, r) => s + Number(r.right_swipes) + Number(r.left_swipes), 0)
        const weekRightSwipes = dailyRows.reduce((s, r) => s + Number(r.right_swipes), 0)

        // Build a lookup: property_id → stat row, drop-off row
        const statByProp   = new Map(statRows.map((r) => [r.property_id, r]))
        const dropByProp   = new Map(
          dropRows.map((r) => [r.property_id, r] as [string, DropOffRow]),
        )

        // Map over this owner's active properties
        const propertyEmailData: PropertyEmailData[] = ownerProperties.map((p) => {
          const stat = statByProp.get(p.id)
          const drop = dropByProp.get(p.id) ?? null

          // Weekly split: proportional by right-swipe count per property
          // (owner_daily_swipes is owner-level; per-property daily data would
          // need a custom RPC — we approximate by distributing proportionally)
          const propRightSwipes = stat ? Number(stat.right_swipes) : 0
          const totalOwnerRightAll = statRows.reduce((s, r) => s + Number(r.right_swipes), 0)
          const propShare = totalOwnerRightAll > 0 ? propRightSwipes / totalOwnerRightAll : 1 / ownerProperties.length

          return {
            property_id:           p.id,
            title:                 p.title,
            address:               p.address,
            total_approved:        stat ? Number(stat.approved_leads) : 0,
            views_this_week:       Math.round(weekViews * propShare),
            right_swipes_this_week: Math.round(weekRightSwipes * propShare),
            top_drop_off:          drop?.last_question ?? null,
            drop_off_count:        drop ? Number(drop.drop_count) : 0,
          }
        })

        // Build email content
        const html    = buildWeeklySummaryHtml({
          owner_name:  user.name ?? 'בעל הנכס',
          properties:  propertyEmailData,
          week_ending: weekEnding,
        })
        const subject = buildWeeklySummarySubject(
          user.name ?? 'בעל הנכס',
          propertyEmailData.reduce((s, p) => s + p.views_this_week, 0),
        )

        // Send via Resend
        const { error: sendErr } = await resend.emails.send({
          from:    fromEmail,
          to:      user.email,
          subject,
          html,
        })

        if (sendErr) {
          errors.push(`${user.email}: ${sendErr.message}`)
        } else {
          sent++
        }
      } catch (ownerErr) {
        const msg = ownerErr instanceof Error ? ownerErr.message : String(ownerErr)
        errors.push(`owner ${user.id}: ${msg}`)
      }
    }
  } catch (fatalErr) {
    const msg = fatalErr instanceof Error ? fatalErr.message : String(fatalErr)
    console.error('[weekly-summary] Fatal error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  console.log(`[weekly-summary] Done — sent:${sent} skipped:${skipped} errors:${errors.length}`)

  return NextResponse.json({
    sent,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
  })
}
