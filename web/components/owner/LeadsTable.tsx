import Link from 'next/link'
import { Phone, Mail, MessageCircle } from 'lucide-react'
import type { LeadRow } from '@/lib/dashboard/actions'

interface LeadsTableProps {
  leads: LeadRow[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
    hour:  '2-digit',
    minute: '2-digit',
  })
}

/**
 * LeadsTable — approved leads with renter contact details.
 * Renders as a scrollable card list (mobile-first) rather than a desktop table.
 */
export function LeadsTable({ leads }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-center text-sm text-[var(--color-muted)]">
        <MessageCircle size={28} className="text-[var(--color-border)]" strokeWidth={1.5} />
        אין פניות מאושרות עדיין.
        <br />
        פניות יופיעו כאן כשהבוט יאשר מועמדים.
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {leads.map((lead) => {
        const waText = encodeURIComponent(
          `שלום ${lead.renter_name}, ראיתי את פנייתך לנכס "${lead.property_title}" בנדלן. אשמח ליצור קשר!`,
        )
        const waUrl = lead.renter_phone
          ? `https://wa.me/${lead.renter_phone.replace(/\D/g, '')}?text=${waText}`
          : null

        return (
          <div
            key={lead.lead_id}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 flex flex-col gap-2 shadow-sm"
          >
            {/* Name + date */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--color-dark)]">
                  {lead.renter_name}
                </p>
                <p className="text-xs text-[var(--color-muted)] line-clamp-1 mt-0.5">
                  {lead.property_title}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-[var(--color-muted)]">
                {formatDate(lead.revealed_at)}
              </span>
            </div>

            {/* Contact buttons */}
            <div className="flex gap-2 flex-wrap">
              {lead.renter_phone && (
                <a
                  href={`tel:${lead.renter_phone}`}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-dark)] hover:border-[var(--color-primary)] transition-colors"
                >
                  <Phone size={11} />
                  {lead.renter_phone}
                </a>
              )}
              {lead.renter_email && (
                <a
                  href={`mailto:${lead.renter_email}`}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-dark)] hover:border-[var(--color-primary)] transition-colors"
                  dir="ltr"
                >
                  <Mail size={11} />
                  {lead.renter_email}
                </a>
              )}
              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1 text-xs font-medium text-white hover:bg-[#1ebe5d] transition-colors"
                >
                  {/* WhatsApp icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  וואטסאפ
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
