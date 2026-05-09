import type { Metadata } from 'next'
import { Construction } from 'lucide-react'

export const metadata: Metadata = {
  title: 'NADLAN — תחזוקה',
  description: 'האתר בתחזוקה זמנית',
}

/**
 * MaintenancePage — shown to all users when Kill Switch is active.
 * Admin routes bypass this page so the operator can toggle maintenance off.
 */
export default function MaintenancePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ background: 'var(--color-bg)' }}
    >
      <div
        className="flex items-center justify-center w-20 h-20 rounded-3xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <Construction size={40} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
      </div>

      <div className="flex flex-col gap-2 max-w-xs">
        <h1
          className="text-2xl font-black"
          style={{ color: 'var(--color-dark)' }}
        >
          האתר בתחזוקה
        </h1>
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--color-muted, #8B7355)' }}
        >
          אנחנו עובדים על שיפורים. נחזור בקרוב!
        </p>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-border)' }}>
        NADLAN &copy; {new Date().getFullYear()}
      </p>
    </div>
  )
}
