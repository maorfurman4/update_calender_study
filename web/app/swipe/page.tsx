import { PageShell } from '@/components/shared/PageShell'

/**
 * Swipe feed — placeholder until Phase 5 (Swipe UI).
 * Renders full-screen shell so the Navbar and layout can be validated.
 */
export default function SwipePage() {
  return (
    // fullscreen=true: no scroll, viewport-height content area
    // This is the final mode once SwipeStack cards are mounted.
    <PageShell fullscreen>
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
        {/* App wordmark — no letter-spacing on Hebrew */}
        <h1
          className="text-4xl font-bold text-[var(--color-primary)]"
        >
          נדל״ן
        </h1>
        <p className="text-[var(--color-muted)] text-sm text-center">
          כרטיסי הנכסים יופיעו כאן בשלב 5
        </p>

        {/* Visual placeholder for swipe card stack */}
        <div className="relative w-72 h-96 mt-4">
          {[2, 1, 0].map((offset) => (
            <div
              key={offset}
              className="absolute inset-0 rounded-2xl border border-[var(--color-border)]"
              style={{
                backgroundColor: 'var(--color-surface)',
                transform: `scale(${1 - offset * 0.03}) translateY(${offset * -10}px)`,
                zIndex: 3 - offset,
                boxShadow: '0 4px 24px 0 rgba(44,24,16,0.08)',
              }}
            />
          ))}
        </div>
      </div>
    </PageShell>
  )
}
