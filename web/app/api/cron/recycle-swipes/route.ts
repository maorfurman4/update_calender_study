import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

/**
 * POST /api/cron/recycle-swipes
 *
 * Vercel Cron job — runs daily at 00:00 UTC (see vercel.json).
 * Deletes left-swipe rows older than 10 days so those properties are
 * returned to the feed automatically (the NOT IN exclusion list shrinks).
 *
 * Protected by CRON_SECRET to prevent unauthorised triggering.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Service-role client — bypasses RLS for the delete
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const tenDaysAgo = new Date(
    Date.now() - 10 * 24 * 60 * 60 * 1000,
  ).toISOString()

  const { count, error } = await supabase
    .from('swipes')
    .delete({ count: 'exact' })
    .eq('direction', 'left')
    .lt('swiped_at', tenDaysAgo)

  if (error) {
    console.error('[cron/recycle-swipes]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[cron/recycle-swipes] deleted ${count} stale left-swipe rows`)
  return NextResponse.json({ deleted: count })
}
