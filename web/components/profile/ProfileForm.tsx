'use client'

import { useState, useTransition } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { updateProfile } from '@/lib/profile/actions'
import type { AppUser } from '@/lib/supabase/types'

interface ProfileFormProps {
  user: AppUser
}

/**
 * ProfileForm — inline edit for name and phone.
 * Calls updateProfile server action. Shows green check on success.
 */
export function ProfileForm({ user }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name  = (fd.get('name') as string).trim()
    const phone = (fd.get('phone') as string).trim() || null

    if (!name) { setError('שם הוא שדה חובה'); return }
    setError(null)

    startTransition(async () => {
      const result = await updateProfile({ name, phone })
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="name"
          className="text-sm font-medium text-[var(--color-dark)]"
        >
          שם מלא
        </label>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={user.name}
          required
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-primary)] transition-colors"
          placeholder="ישראל ישראלי"
        />
      </div>

      {/* Phone */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="phone"
          className="text-sm font-medium text-[var(--color-dark)]"
        >
          מספר טלפון
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={user.phone ?? ''}
          dir="ltr"
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-primary)] transition-colors"
          placeholder="050-000-0000"
        />
      </div>

      {/* Email (read-only — managed by Supabase Auth) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--color-muted)]">
          אימייל (לא ניתן לשינוי)
        </label>
        <input
          type="email"
          value={user.email ?? ''}
          readOnly
          disabled
          dir="ltr"
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-border)]/40 px-4 py-2.5 text-sm text-[var(--color-muted)] cursor-not-allowed"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-[var(--color-dark)] transition-colors disabled:opacity-60 self-start"
      >
        {isPending ? (
          <Loader2 size={15} className="animate-spin" />
        ) : saved ? (
          <Check size={15} />
        ) : null}
        {saved ? 'נשמר!' : 'שמור שינויים'}
      </button>
    </form>
  )
}
