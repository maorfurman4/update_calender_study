'use client'

import { useTranslations } from 'next-intl'
import type { PropertyCategory } from '@/lib/supabase/types'

export interface ActiveFilters {
  category?: PropertyCategory
  minRooms?: number
  minPrice?: number
  maxPrice?: number
}

interface FilterBarProps {
  filters: ActiveFilters
  onChange: (filters: ActiveFilters) => void
  resultCount: number
  isPolygonActive: boolean
  onClearPolygon: () => void
}

const CATEGORY_OPTIONS: { value: PropertyCategory; label: string }[] = [
  { value: 'rental', label: 'השכרה' },
  { value: 'sale', label: 'מכירה' },
  { value: 'roommates', label: 'שותפים' },
]

const ROOMS_OPTIONS = [1, 2, 3, 4]

/**
 * FilterBar — floating pill row above the map.
 * Brown & White, RTL logical properties, no letter-spacing.
 */
export function FilterBar({
  filters,
  onChange,
  resultCount,
  isPolygonActive,
  onClearPolygon,
}: FilterBarProps) {
  const t = useTranslations('search')

  const setCategory = (cat: PropertyCategory | undefined) =>
    onChange({ ...filters, category: cat })

  const setRooms = (r: number | undefined) =>
    onChange({ ...filters, minRooms: r })

  return (
    <div className="flex flex-col gap-2 pointer-events-auto">
      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        <PillButton
          active={!filters.category}
          onClick={() => setCategory(undefined)}
          label="הכל"
        />
        {CATEGORY_OPTIONS.map(({ value, label }) => (
          <PillButton
            key={value}
            active={filters.category === value}
            onClick={() => setCategory(filters.category === value ? undefined : value)}
            label={label}
          />
        ))}
      </div>

      {/* Rooms + meta row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-[var(--color-muted)] font-medium">חדרים:</span>
        {ROOMS_OPTIONS.map((r) => (
          <PillButton
            key={r}
            active={filters.minRooms === r}
            onClick={() => setRooms(filters.minRooms === r ? undefined : r)}
            label={r === 4 ? '4+' : String(r)}
            small
          />
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Polygon indicator */}
        {isPolygonActive && (
          <button
            type="button"
            onClick={onClearPolygon}
            className="flex items-center gap-1 rounded-full bg-[var(--color-primary)] px-2.5 py-1 text-xs text-white font-medium shadow"
          >
            {t('clear_area')} ✕
          </button>
        )}

        {/* Result count badge */}
        <span className="rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] px-2.5 py-1 text-xs text-[var(--color-dark)] shadow">
          {t('results', { count: resultCount })}
        </span>
      </div>
    </div>
  )
}

// ─── Shared pill button ───────────────────────────────────────────────────────

function PillButton({
  active,
  onClick,
  label,
  small,
}: {
  active: boolean
  onClick: () => void
  label: string
  small?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        shrink-0 rounded-full border font-medium transition-colors duration-150
        ${small ? 'px-2.5 py-0.5 text-xs' : 'px-3.5 py-1.5 text-sm'}
        ${active
          ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow'
          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-dark)] hover:border-[var(--color-primary)]'
        }
      `}
    >
      {label}
    </button>
  )
}
