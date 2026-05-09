import { Suspense } from 'react'
import { PageShell } from '@/components/shared/PageShell'

export const dynamic = 'force-dynamic'
import { SwipeDeck } from '@/components/swipe/SwipeDeck'
import { fetchSwipeFeed } from '@/lib/swipe/actions'
import type { PropertyCategory } from '@/lib/supabase/types'

interface SwipePageProps {
  searchParams: Promise<{
    category?: string
    minRooms?: string
  }>
}

/**
 * SwipePage — full-viewport swipe feed.
 *
 * This is a Server Component that pre-fetches the initial deck server-side
 * (no loading flash on first paint) and passes the array to the client-side
 * SwipeDeck for gesture handling.
 *
 * URL params:
 *   ?category=rental|sale|roommates  — filter by category
 *   ?minRooms=1|2|3|4               — minimum room count
 *
 * These are set by the "גלוש בנכסים" CTA in the Search page.
 */
export default async function SwipePage({ searchParams }: SwipePageProps) {
  const params = await searchParams
  const category = params.category as PropertyCategory | undefined
  const minRooms = params.minRooms ? Number(params.minRooms) : undefined

  const { properties } = await fetchSwipeFeed({ category, minRooms, limit: 30 })

  return (
    <PageShell fullscreen>
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <h1 className="text-xl font-bold text-[var(--color-primary)]">
          נדל״ן
        </h1>
        {/* Category badge (if filtered) */}
        {category && (
          <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-1 text-xs font-medium text-[var(--color-dark)]">
            {category === 'rental'
              ? 'השכרה'
              : category === 'sale'
              ? 'מכירה'
              : 'שותפים'}
          </span>
        )}
      </div>

      {/* Deck — fills remaining viewport height */}
      <div className="flex-1 relative overflow-hidden">
        <Suspense fallback={<DeckSkeleton />}>
          <SwipeDeck initialProperties={properties} />
        </Suspense>
      </div>
    </PageShell>
  )
}

// ─── Loading skeleton (shown by Suspense while feed resolves) ─────────────────

function DeckSkeleton() {
  return (
    <div className="relative mx-4 mt-3 h-[calc(100%-7rem)]">
      {[2, 1, 0].map((offset) => (
        <div
          key={offset}
          className="absolute inset-0 rounded-2xl bg-[var(--color-surface)] animate-pulse border border-[var(--color-border)]"
          style={{
            transform: `scale(${1 - offset * 0.04}) translateY(${offset * -10}px)`,
            zIndex: 3 - offset,
          }}
        />
      ))}
    </div>
  )
}
