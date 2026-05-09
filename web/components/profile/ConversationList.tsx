import Link from 'next/link'
import { MessageCircle, CheckCircle2, XCircle, Clock, ArrowLeft } from 'lucide-react'
import type { ConversationWithProperty } from '@/lib/profile/actions'

interface ConversationListProps {
  conversations: ConversationWithProperty[]
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckCircle2; color: string }
> = {
  approved:    { label: 'מאושר',   icon: CheckCircle2, color: 'text-emerald-500' },
  rejected:    { label: 'לא מתאים', icon: XCircle,     color: 'text-red-400' },
  in_progress: { label: 'בתהליך',  icon: Clock,        color: 'text-amber-500' },
}

const TRACK_LABELS: Record<string, string> = {
  rental:    'השכרה',
  sale:      'מכירה',
  roommates: 'שותפים',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })
}

/**
 * ConversationList — server-renderable list of past AI bot interviews.
 * Each row shows: property thumbnail, title, track, status badge, date,
 * and a "המשך שיחה" link back to /bot/[propertyId].
 */
export function ConversationList({ conversations }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <MessageCircle size={36} className="text-[var(--color-border)]" strokeWidth={1.5} />
        <p className="text-sm font-medium text-[var(--color-dark)]">אין שיחות עדיין</p>
        <p className="text-xs text-[var(--color-muted)] max-w-xs">
          החלק ימינה על נכס כדי להתחיל שיחה עם הבוט
        </p>
        <Link
          href="/swipe"
          className="mt-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-dark)] transition-colors"
        >
          חזור לגלישה
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {conversations.map((conv) => {
        const cfg = STATUS_CONFIG[conv.status] ?? STATUS_CONFIG.in_progress
        const StatusIcon = cfg.icon
        const thumb = conv.property?.photos?.[0]
        const canResume = conv.status === 'in_progress'

        return (
          <div
            key={conv.id}
            className="flex gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm"
          >
            {/* Thumbnail */}
            <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-[var(--color-border)]">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumb}
                  alt={conv.property?.title ?? ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MessageCircle size={20} className="text-[var(--color-muted)]" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--color-dark)] line-clamp-1">
                  {conv.property?.title ?? 'נכס לא ידוע'}
                </p>
                {/* Track pill */}
                <span className="shrink-0 text-[10px] rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] px-2 py-0.5 font-medium">
                  {TRACK_LABELS[conv.track] ?? conv.track}
                </span>
              </div>

              <p className="text-xs text-[var(--color-muted)] line-clamp-1">
                {conv.property?.address ?? ''}
              </p>

              {/* Status + date row */}
              <div className="flex items-center justify-between gap-2">
                <div className={`flex items-center gap-1 ${cfg.color}`}>
                  <StatusIcon size={12} />
                  <span className="text-xs font-medium">{cfg.label}</span>
                </div>
                <span className="text-[10px] text-[var(--color-muted)]">
                  {formatDate(conv.updated_at)}
                </span>
              </div>
            </div>

            {/* Resume / view link */}
            {conv.property_id && (
              <div className="shrink-0 flex items-center">
                <Link
                  href={`/bot/${conv.property_id}`}
                  className={`
                    flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors
                    ${canResume
                      ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-dark)]'
                      : 'border border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-primary)]'
                    }
                  `}
                >
                  {canResume ? 'המשך' : 'צפה'}
                  <ArrowLeft size={11} />
                </Link>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
