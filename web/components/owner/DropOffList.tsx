import { AlertTriangle } from 'lucide-react'
import type { DropOffPoint } from '@/lib/dashboard/actions'

interface DropOffListProps {
  dropOffs: DropOffPoint[]
}

/**
 * DropOffList — shows which bot question caused users to abandon.
 *
 * Data source: owner_drop_off_stats() RPC, which unnests messages JSONB[]
 * to find the last assistant message in stalled (in_progress, 24h+ silent)
 * conversations.
 *
 * Renders a ranked list with a heat-bar proportional to drop_count.
 */
export function DropOffList({ dropOffs }: DropOffListProps) {
  if (dropOffs.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-sm text-[var(--color-muted)]">
        <AlertTriangle size={16} />
        אין שיחות שנטשו — מעולה!
      </div>
    )
  }

  const maxCount = Math.max(...dropOffs.map((d) => Number(d.drop_count)))

  return (
    <div className="flex flex-col gap-3">
      {dropOffs.map((d, i) => {
        const count = Number(d.drop_count)
        const pct   = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0

        return (
          <div key={i} className="flex flex-col gap-1.5">
            {/* Property label (if multiple properties) */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[var(--color-muted)] font-medium truncate max-w-[60%]">
                {d.property_title}
              </p>
              <span className="shrink-0 text-xs font-bold text-[var(--color-dark)]">
                {count} {count === 1 ? 'שיחה' : 'שיחות'}
              </span>
            </div>

            {/* Last question text */}
            <p className="text-sm text-[var(--color-dark)] leading-relaxed line-clamp-2">
              &ldquo;{d.last_question}&rdquo;
            </p>

            {/* Heat bar */}
            <div className="h-1.5 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
