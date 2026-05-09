'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { saveSearchPreferences } from '@/lib/profile/actions'
import type { SearchPreferences } from '@/lib/supabase/types'

interface SearchPrefsFormProps {
  initial: SearchPreferences
}

const ROOMS_OPTIONS = [1, 2, 3, 4] as const

/**
 * SearchPrefsForm — Yad2-style default search preferences.
 *
 * Saves to users.search_preferences (JSONB) via saveSearchPreferences().
 * The search page and swipe feed will read these prefs when no URL params
 * are present (Phase 11 polish; wired here for data persistence).
 */
export function SearchPrefsForm({ initial }: SearchPrefsFormProps) {
  const [prefs, setPrefs] = useState<SearchPreferences>(initial)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof SearchPreferences>(key: K, value: SearchPreferences[K]) {
    setPrefs((p) => ({ ...p, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await saveSearchPreferences(prefs)
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* City / Area */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="city" className="text-sm font-medium text-[var(--color-dark)]">
          עיר / שכונה מועדפת
        </label>
        <input
          id="city"
          type="text"
          value={prefs.city ?? ''}
          onChange={(e) => set('city', e.target.value)}
          placeholder="לדוגמה: תל אביב, רמת גן"
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-primary)] transition-colors"
        />
      </div>

      {/* Price range */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="minPrice" className="text-sm font-medium text-[var(--color-dark)]">
            מחיר מינימלי (₪)
          </label>
          <input
            id="minPrice"
            type="number"
            min={0}
            step={500}
            value={prefs.minPrice ?? ''}
            onChange={(e) => set('minPrice', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="4,000"
            dir="ltr"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="maxPrice" className="text-sm font-medium text-[var(--color-dark)]">
            מחיר מקסימלי (₪)
          </label>
          <input
            id="maxPrice"
            type="number"
            min={0}
            step={500}
            value={prefs.maxPrice ?? ''}
            onChange={(e) => set('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="10,000"
            dir="ltr"
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>
      </div>

      {/* Min rooms */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-[var(--color-dark)]">מספר חדרים מינימלי</span>
        <div className="flex gap-2">
          {ROOMS_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => set('minRooms', prefs.minRooms === r ? undefined : r)}
              className={`
                w-10 h-10 rounded-full border text-sm font-medium transition-colors
                ${prefs.minRooms === r
                  ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white shadow'
                  : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-dark)] hover:border-[var(--color-primary)]'
                }
              `}
            >
              {r === 4 ? '4+' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Boolean amenities */}
      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium text-[var(--color-dark)]">מאפיינים מועדפים</span>

        {([
          ['parking',   'חניה'],
          ['elevator',  'מעלית'],
          ['balcony',   'מרפסת'],
          ['renovated', 'משופץ'],
        ] as const).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between">
            <Label
              htmlFor={key}
              className="text-sm text-[var(--color-dark)] cursor-pointer"
            >
              {label}
            </Label>
            <Switch
              id={key}
              checked={prefs[key] ?? false}
              onCheckedChange={(v) => set(key, v)}
              className="data-[state=checked]:bg-[var(--color-primary)]"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-[var(--color-dark)] transition-colors disabled:opacity-60 self-start"
      >
        {isPending ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : null}
        {saved ? 'נשמר!' : 'שמור העדפות'}
      </button>
    </form>
  )
}
