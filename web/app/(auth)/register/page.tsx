import type { Metadata } from 'next'
import { RegisterForm } from './register-form'

export const metadata: Metadata = {
  title: 'הרשמה — נדל״ן',
}

export default function RegisterPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 bg-[var(--color-bg)]">
      <RegisterForm />
    </main>
  )
}
