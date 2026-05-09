import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * OAuth + Magic Link + Email Confirmation callback handler.
 *
 * Supabase redirects here after:
 *  - Google / Facebook / Apple OAuth  → sends `code` (PKCE flow)
 *  - Email confirmation / magic link  → sends `token_hash` + `type`
 *  - Password reset                   → sends `code`
 *
 * We handle both flows and redirect to the intended destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code       = searchParams.get('code')
  const tokenHash  = searchParams.get('token_hash')
  const type       = searchParams.get('type') as EmailOtpType | null
  // `next` is set by our middleware when it redirects to /login
  const next       = searchParams.get('next') ?? '/swipe'
  const redirectTo = new URL(next.startsWith('/') ? next : '/swipe', origin)

  // ── PKCE OAuth / password-reset flow ────────────────────────────────────
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(redirectTo)
  }

  // ── Email confirmation / magic-link flow (token_hash) ────────────────────
  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (!error) return NextResponse.redirect(redirectTo)
  }

  // Exchange failed — redirect to login with error flag
  const errorUrl = new URL('/login', origin)
  errorUrl.searchParams.set('error', 'auth_callback_failed')
  return NextResponse.redirect(errorUrl)
}
