import type { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  label:    string
  value:    string | number
  sub?:     string
  icon:     LucideIcon
  accent?:  boolean  // true → brown background (highlight card)
}

/**
 * KpiCard — single metric display card.
 * Brown & White palette; no letter-spacing.
 */
export function KpiCard({ label, value, sub, icon: Icon, accent }: KpiCardProps) {
  return (
    <div
      className={`
        flex flex-col gap-3 rounded-2xl p-4 border shadow-sm
        ${accent
          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white'
          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-dark)]'
        }
      `}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? 'bg-white/20' : 'bg-[var(--color-primary)]/10'}`}>
        <Icon size={18} className={accent ? 'text-white' : 'text-[var(--color-primary)]'} />
      </div>

      <div>
        <p className={`text-2xl font-black leading-none ${accent ? 'text-white' : 'text-[var(--color-dark)]'}`}>
          {value}
        </p>
        <p className={`text-xs font-medium mt-1 ${accent ? 'text-white/80' : 'text-[var(--color-muted)]'}`}>
          {label}
        </p>
        {sub && (
          <p className={`text-[10px] mt-0.5 ${accent ? 'text-white/60' : 'text-[var(--color-muted)]/70'}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}
