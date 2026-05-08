import type { Metadata } from 'next'
import { ResetForm } from './reset-form'

export const metadata: Metadata = {
  title: 'איפוס סיסמה — נדל״ן',
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 bg-[var(--color-bg)]">
      <ResetForm />
    </main>
  )
}
