import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * OAuth + Magic Link callback handler.
 *
 * Supabase redirects here after Google / Apple / Facebook OAuth and after
 * clicking a magic-link / email confirmation.  We exchange the code for a
 * session (PKCE flow) and redirect the user to their intended destination.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)

  const code = searchParams.get('code')
  // `next` is set by our middleware when it redirects to /login
  const next = searchParams.get('next') ?? '/swipe'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Ensure we only redirect to the same origin (security)
      const redirectUrl = new URL(next.startsWith('/') ? next : '/swipe', origin)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Exchange failed or no code — redirect to login with error flag
  const errorUrl = new URL('/login', origin)
  errorUrl.searchParams.set('error', 'auth_callback_failed')
  return NextResponse.redirect(errorUrl)
}
