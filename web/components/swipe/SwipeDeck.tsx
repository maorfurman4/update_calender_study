'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Heart, X } from 'lucide-react'
import { SwipeCard } from './SwipeCard'
import { recordSwipe } from '@/lib/swipe/actions'
import type { Property } from '@/lib/supabase/types'

// How many cards to render in the DOM at once (top card + visual stack behind)
const VISIBLE_STACK_SIZE = 3

interface SwipeDeckProps {
  initialProperties: Property[]
}

/**
 * SwipeDeck — manages the card stack state machine.
 *
 * State:
 *   `deck` — array of Properties, first element is the top (active) card.
 *   Swiping pops the first element; the next card becomes the new top.
 *
 * Swipe right flow:
 *   1. recordSwipe(id, 'right') — upserts swipe row + favorites row.
 *   2. Pop card from deck.
 *   3. router.push('/bot/[id]') — Phase 6 will mount the bot UI there.
 *
 * Swipe left flow:
 *   1. recordSwipe(id, 'left') — upserts swipe row.
 *   2. Pop card from deck.
 *
 * Action buttons (Like / Pass) programmatically trigger the same code paths
 * that the gesture handlers call, so the card still animates off-screen.
 */
export function SwipeDeck({ initialProperties }: SwipeDeckProps) {
  const router = useRouter()
  const [deck, setDeck] = useState<Property[]>(initialProperties)
  const [isPending, startTransition] = useTransition()

  // Track which card is flying off to avoid double-firing
  const [locked, setLocked] = useState(false)

  // ── Pop top card ───────────────────────────────────────────────────────────
  const popCard = useCallback(() => {
    setDeck((prev) => prev.slice(1))
    setLocked(false)
  }, [])

  // ── Swipe handlers ─────────────────────────────────────────────────────────
  const handleSwipeLeft = useCallback(() => {
    if (locked || deck.length === 0) return
    setLocked(true)
    const property = deck[0]

    startTransition(async () => {
      await recordSwipe(property.id, 'left')
    })
    popCard()
  }, [locked, deck, popCard])

  const handleSwipeRight = useCallback(() => {
    if (locked || deck.length === 0) return
    setLocked(true)
    const property = deck[0]

    startTransition(async () => {
      await recordSwipe(property.id, 'right')
    })
    popCard()
    // Navigate to bot screen — Phase 6 will render the actual bot UI
    router.push(`/bot/${property.id}`)
  }, [locked, deck, popCard, router])

  // ── Empty state ────────────────────────────────────────────────────────────
  if (deck.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-8 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--color-surface)] flex items-center justify-center shadow-inner border border-[var(--color-border)]">
          <Heart size={32} className="text-[var(--color-border)]" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-lg font-bold text-[var(--color-dark)]">
            ראית את כל הנכסים!
          </p>
          <p className="text-sm text-[var(--color-muted)] max-w-xs leading-relaxed">
            אין עוד נכסים שתואמים לסננים שלך כרגע.
            חזור מאוחר יותר — נכסים שדחית יחזרו לפיד תוך 10 ימים.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-[var(--color-dark)] transition-colors"
        >
          <RefreshCw size={15} />
          רענן
        </button>
      </div>
    )
  }

  // Slice to at most VISIBLE_STACK_SIZE cards so we don't render the whole array
  const visibleCards = deck.slice(0, VISIBLE_STACK_SIZE)

  return (
    <div className="flex flex-col h-full">
      {/* ── Card stack ───────────────────────────────────────────────────── */}
      <div className="relative flex-1 mx-4 mt-3">
        {/*
          Render in reverse order so index-0 (top) is painted last (on top).
          Each card receives its `stackIndex` (0 = top, 1 = second, …).
        */}
        {[...visibleCards].reverse().map((property, reversedIdx) => {
          const stackIndex = visibleCards.length - 1 - reversedIdx
          const isTop = stackIndex === 0

          return (
            <SwipeCard
              key={property.id}
              property={property}
              stackIndex={stackIndex}
              isTop={isTop}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
            />
          )
        })}
      </div>

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-8 pb-6 pt-4 shrink-0">
        {/* Pass (left) */}
        <button
          type="button"
          disabled={isPending || locked}
          onClick={handleSwipeLeft}
          className="w-14 h-14 rounded-full bg-[var(--color-surface)] border-2 border-red-300 flex items-center justify-center shadow-md hover:border-red-400 hover:scale-105 transition-all disabled:opacity-50"
          aria-label="דחה"
        >
          <X size={26} className="text-red-400" strokeWidth={2.5} />
        </button>

        {/* Like (right) */}
        <button
          type="button"
          disabled={isPending || locked}
          onClick={handleSwipeRight}
          className="w-14 h-14 rounded-full bg-[var(--color-surface)] border-2 border-emerald-400 flex items-center justify-center shadow-md hover:border-emerald-500 hover:scale-105 transition-all disabled:opacity-50"
          aria-label="מעוניין"
        >
          <Heart size={24} className="text-emerald-400" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
