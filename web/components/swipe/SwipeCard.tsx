'use client'

import { useState, useRef } from 'react'
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  type PanInfo,
} from 'framer-motion'
import { Bed, Maximize2, MapPin, PawPrint, Car } from 'lucide-react'
import type { Property } from '@/lib/supabase/types'

// ─── Swipe physics constants ──────────────────────────────────────────────────

/** Horizontal distance (px) beyond which a drag is committed as a swipe */
const SWIPE_THRESHOLD = 90

/** Velocity (px/s) that also commits a swipe even if distance is short */
const VELOCITY_THRESHOLD = 400

/** Final off-screen X position the card animates to */
const FLY_DISTANCE = 600

interface SwipeCardProps {
  property: Property
  /** z-index layer (0 = top card, 1 = second, 2 = third …) */
  stackIndex: number
  /** Called after the card has flown off-screen to the left */
  onSwipeLeft: () => void
  /** Called after the card has flown off-screen to the right */
  onSwipeRight: () => void
  /** Whether this card is the active draggable card */
  isTop: boolean
}

/**
 * SwipeCard — single card with Tinder-style framer-motion physics.
 *
 * Physics:
 *   - `useMotionValue(x)` tracks the real-time drag offset.
 *   - `rotate` is derived via `useTransform` — the card tilts up to ±20 °
 *     proportional to x in the range [-180, 180].
 *   - On `onPanEnd`:
 *       • |offset.x| > SWIPE_THRESHOLD OR |velocity.x| > VELOCITY_THRESHOLD
 *         → animate card to ±FLY_DISTANCE, then call onSwipeLeft/Right
 *       • otherwise → spring snap back to x=0
 *
 * Overlay labels (LIKE / PASS) fade in via `useTransform` as the user drags.
 * Photo tap cycles through the photo array.
 */
export function SwipeCard({
  property,
  stackIndex,
  onSwipeLeft,
  onSwipeRight,
  isTop,
}: SwipeCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0)
  const dragging = useRef(false)

  // ── Motion values ──────────────────────────────────────────────────────────
  const x = useMotionValue(0)

  // ±20° tilt capped at ±180 px horizontal travel
  const rotate = useTransform(x, [-180, 0, 180], [-20, 0, 20])

  // Overlay label opacities
  const likeOpacity  = useTransform(x, [30, 110], [0, 1])
  const passOpacity  = useTransform(x, [-110, -30], [1, 0])

  // ── Drag end handler ────────────────────────────────────────────────────────
  async function handlePanEnd(_: PointerEvent, info: PanInfo) {
    const { offset, velocity } = info
    const goRight =
      offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD
    const goLeft =
      offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD

    if (goRight) {
      await animate(x, FLY_DISTANCE, { type: 'spring', stiffness: 280, damping: 28 })
      onSwipeRight()
    } else if (goLeft) {
      await animate(x, -FLY_DISTANCE, { type: 'spring', stiffness: 280, damping: 28 })
      onSwipeLeft()
    } else {
      // Snap back to centre
      animate(x, 0, { type: 'spring', stiffness: 350, damping: 30 })
    }
  }

  // ── Stacked card visual offset (cards behind the top card) ─────────────────
  const behindScale      = 1 - stackIndex * 0.04
  const behindTranslateY = stackIndex * -10  // px upwards so stack fans visually

  const firstPhoto = property.photos?.[0]
  const totalMonthly =
    property.category === 'rental'
      ? property.price + property.arnona + property.vaad
      : null

  return (
    <motion.div
      // Layout: absolute, full-width card sized to parent
      className="absolute inset-0"
      style={{
        scale:     behindScale,
        translateY: behindTranslateY,
        zIndex:    10 - stackIndex,
        // Top card uses motion values; background cards are static
        x:       isTop ? x : 0,
        rotate:  isTop ? rotate : 0,
      }}
      // Only the top card responds to drag
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragStart={() => { dragging.current = true }}
      onPanEnd={handlePanEnd}
      onDragEnd={() => { dragging.current = false }}
      whileTap={isTop ? { cursor: 'grabbing' } : undefined}
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(44,24,16,0.18)] select-none cursor-grab active:cursor-grabbing">

        {/* ── Photo ───────────────────────────────────────────────────────── */}
        <div
          className="absolute inset-0"
          onClick={() => {
            if (dragging.current) return
            if (!property.photos?.length) return
            setPhotoIndex((i) => (i + 1) % property.photos.length)
          }}
        >
          {firstPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={property.photos[photoIndex] ?? firstPhoto}
              alt={property.title}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[var(--color-border)]">
              <MapPin size={40} className="text-[var(--color-muted)]" />
            </div>
          )}
        </div>

        {/* ── Photo dot indicators ─────────────────────────────────────────── */}
        {property.photos?.length > 1 && (
          <div className="absolute top-3 start-0 end-0 flex justify-center gap-1 pointer-events-none">
            {property.photos.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-200 ${
                  i === photoIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* ── Bottom gradient + content ─────────────────────────────────────── */}
        <div className="absolute bottom-0 start-0 end-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-5 pb-6 pt-16 pointer-events-none">
          {/* Title */}
          <h2 className="text-white text-xl font-bold leading-snug line-clamp-2">
            {property.title}
          </h2>

          {/* Address */}
          <p className="text-white/75 text-sm mt-0.5 line-clamp-1">
            {property.address}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {property.rooms && (
              <span className="flex items-center gap-1 text-white/80 text-sm">
                <Bed size={13} />
                {property.rooms} חד׳
              </span>
            )}
            {property.size_sqm && (
              <span className="flex items-center gap-1 text-white/80 text-sm">
                <Maximize2 size={13} />
                {property.size_sqm} מ״ר
              </span>
            )}
            {property.pets_allowed && (
              <PawPrint size={13} className="text-white/80" />
            )}
            {property.parking && (
              <Car size={13} className="text-white/80" />
            )}
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-white text-2xl font-black">
              ₪{property.price.toLocaleString('he-IL')}
            </span>
            <span className="text-white/60 text-xs">לחודש</span>
            {totalMonthly && totalMonthly > property.price && (
              <span className="text-white/55 text-xs">
                (₪{totalMonthly.toLocaleString('he-IL')} סה״כ)
              </span>
            )}
          </div>
        </div>

        {/* ── LIKE overlay (right swipe) ───────────────────────────────────── */}
        <motion.div
          className="absolute top-10 start-5 border-[3px] border-emerald-400 rounded-xl px-3 py-1 rotate-[-12deg] pointer-events-none"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-emerald-400 font-black text-2xl tracking-wide">
            מעוניין
          </span>
        </motion.div>

        {/* ── PASS overlay (left swipe) ────────────────────────────────────── */}
        <motion.div
          className="absolute top-10 end-5 border-[3px] border-red-400 rounded-xl px-3 py-1 rotate-[12deg] pointer-events-none"
          style={{ opacity: passOpacity }}
        >
          <span className="text-red-400 font-black text-2xl tracking-wide">
            הבא
          </span>
        </motion.div>
      </div>
    </motion.div>
  )
}
