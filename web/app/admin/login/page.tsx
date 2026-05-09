'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react'

/**
 * AdminLoginPage — isolated God Mode entry point.
 *
 * Completely decoupled from Supabase Auth.
 * Submits passphrase to /api/admin/auth which verifies against ADMIN_PASSPHRASE
 * env var and sets a signed httpOnly cookie on success.
 */
export default function AdminLoginPage() {
  const router = useRouter()
  const [passphrase, setPassphrase] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passphrase }),
        })

        if (res.ok) {
          router.push('/admin')
          router.refresh()
        } else {
          const body = await res.json().catch(() => ({}))
          setError((body as { error?: string }).error ?? 'סיסמה שגויה')
        }
      } catch {
        setError('שגיאת רשת — נסה שוב')
      }
    })
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: 'var(--color-bg)' }}
    >
      <div
        className="w-full max-w-xs flex flex-col gap-6 rounded-3xl p-8"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        {/* Icon + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-2xl"
            style={{ background: 'var(--color-primary)' }}
          >
            <ShieldCheck size={28} color="#FDFAF7" strokeWidth={1.5} />
          </div>
          <div>
            <h1
              className="text-xl font-black"
              style={{ color: 'var(--color-dark)' }}
            >
              God Mode
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted, #8B7355)' }}>
              גישה מוגבלת — מנהל בלבד
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="passphrase"
              className="text-xs font-semibold"
              style={{ color: 'var(--color-dark)' }}
            >
              סיסמת כניסה
            </label>
            <div className="relative">
              <input
                id="passphrase"
                type={showPass ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="הזן סיסמת מנהל"
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors pe-10"
                style={{
                  background: 'var(--color-bg)',
                  border: error ? '1px solid #EF4444' : '1px solid var(--color-border)',
                  color: 'var(--color-dark)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute inset-y-0 end-3 flex items-center"
                tabIndex={-1}
              >
                {showPass
                  ? <EyeOff size={14} style={{ color: 'var(--color-muted, #8B7355)' }} />
                  : <Eye size={14} style={{ color: 'var(--color-muted, #8B7355)' }} />
                }
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || !passphrase}
            className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50"
            style={{ background: 'var(--color-primary)', color: '#FDFAF7' }}
          >
            {isPending && <Loader2 size={14} className="animate-spin" />}
            {isPending ? 'מאמת...' : 'כניסה'}
          </button>
        </form>
      </div>
    </div>
  )
}
