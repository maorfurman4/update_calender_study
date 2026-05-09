'use client'

import { useState, useTransition } from 'react'
import { Power, Loader2 } from 'lucide-react'
import { toggleMaintenance } from '@/lib/admin/actions'

interface KillSwitchProps {
  initialEnabled: boolean
}

/**
 * KillSwitch — toggles global maintenance mode.
 * When ON: all non-admin routes show the maintenance screen.
 * When OFF: normal operation resumes (middleware cache clears within 30 s).
 */
export function KillSwitch({ initialEnabled }: KillSwitchProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const next = !enabled
      try {
        await toggleMaintenance(next)
        setEnabled(next)
      } catch (err) {
        console.error('[KillSwitch] Toggle failed:', err)
        alert('שגיאה בשינוי מצב תחזוקה')
      }
    })
  }

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4"
      style={{
        background: enabled ? '#FEF2F2' : 'var(--color-surface)',
        border: `1px solid ${enabled ? '#FECACA' : 'var(--color-border)'}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl"
          style={{
            background: enabled ? '#EF4444' : 'var(--color-primary)',
          }}
        >
          <Power size={18} color="#FDFAF7" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: 'var(--color-dark)' }}>
            Kill Switch — מצב תחזוקה
          </p>
          <p className="text-xs" style={{ color: 'var(--color-muted, #8B7355)' }}>
            {enabled
              ? '⚠️ האתר כעת בתחזוקה — משתמשים רואים מסך חסימה'
              : 'האתר פעיל לכל המשתמשים'}
          </p>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: enabled ? '#EF4444' : 'var(--color-dark)' }}>
          {enabled ? 'תחזוקה פעילה' : 'פעיל רגיל'}
        </span>
        <button
          onClick={handleToggle}
          disabled={isPending}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60"
          style={{
            background: enabled ? '#EF4444' : 'var(--color-primary)',
            color: '#FDFAF7',
          }}
        >
          {isPending && <Loader2 size={13} className="animate-spin" />}
          {enabled ? 'כבה תחזוקה' : 'הפעל תחזוקה'}
        </button>
      </div>

      {enabled && (
        <p className="text-[11px] rounded-lg px-3 py-2 bg-red-50 text-red-600 border border-red-100">
          המטמון של ה-middleware מתנקה כל 30 שניות — ייתכן שיעבור רגע עד שהשינוי יכנס לתוקף.
        </p>
      )}
    </div>
  )
}
