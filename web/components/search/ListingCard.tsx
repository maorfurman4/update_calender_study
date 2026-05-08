'use client'

import { useTranslations } from 'next-intl'
import { Bed, Maximize2, MapPin, PawPrint, Car } from 'lucide-react'
import type { Property } from '@/lib/supabase/types'

interface ListingCardProps {
  property: Property
  onClick?: () => void
  isSelected?: boolean
}

/**
 * ListingCard — compact horizontal card for search results.
 * Brown & White palette, RTL logical properties, no letter-spacing.
 */
export function ListingCard({ property, onClick, isSelected }: ListingCardProps) {
  const t = useTranslations('property')

  const firstPhoto = property.photos?.[0]
  const totalMonthly =
    property.category === 'rental'
      ? property.price + property.arnona + property.vaad
      : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        w-full flex gap-3 rounded-xl border p-3 text-start transition-all duration-150
        bg-[var(--color-surface)] hover:border-[var(--color-primary)]
        focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]
        ${isSelected
          ? 'border-[var(--color-primary)] shadow-md'
          : 'border-[var(--color-border)] shadow-sm'
        }
      `}
      aria-pressed={isSelected}
    >
      {/* Thumbnail */}
      <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-[var(--color-border)]">
        {firstPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={firstPhoto}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin size={20} className="text-[var(--color-muted)]" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
        {/* Title */}
        <p className="text-sm font-semibold text-[var(--color-dark)] line-clamp-1">
          {property.title}
        </p>

        {/* Address */}
        <p className="text-xs text-[var(--color-muted)] line-clamp-1">
          {property.address}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-2 flex-wrap">
          {property.rooms && (
            <span className="flex items-center gap-0.5 text-xs text-[var(--color-muted)]">
              <Bed size={11} />
              {property.rooms}
            </span>
          )}
          {property.size_sqm && (
            <span className="flex items-center gap-0.5 text-xs text-[var(--color-muted)]">
              <Maximize2 size={11} />
              {property.size_sqm}מ״ר
            </span>
          )}
          {property.pets_allowed && (
            <PawPrint size={11} className="text-[var(--color-muted)]" />
          )}
          {property.parking && (
            <Car size={11} className="text-[var(--color-muted)]" />
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1">
          <span className="text-base font-bold text-[var(--color-primary)]">
            ₪{property.price.toLocaleString('he-IL')}
          </span>
          {totalMonthly && totalMonthly > property.price && (
            <span className="text-[10px] text-[var(--color-muted)]">
              (₪{totalMonthly.toLocaleString('he-IL')} {t('total_monthly')})
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
