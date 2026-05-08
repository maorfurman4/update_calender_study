import type { Metadata } from 'next'
import { ForgotForm } from './forgot-form'

export const metadata: Metadata = {
  title: 'שחזור סיסמה — נדל״ן',
}

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 bg-[var(--color-bg)]">
      <ForgotForm />
    </main>
  )
}
