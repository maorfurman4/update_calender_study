import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'התחברות — נדל״ן',
}

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>
}

/**
 * Login page — Server Component shell.
 * Passes the `next` redirect destination to the Client Component form.
 */
export default async function LoginPage({ searchParams }: Props) {
  const { next = '/swipe' } = await searchParams

  return (
    // Fullscreen centered layout — no Navbar on auth pages
    <main className="min-h-dvh flex items-center justify-center px-4 bg-[var(--color-bg)]">
      <LoginForm next={next} />
    </main>
  )
}
