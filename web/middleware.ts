import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'

/**
 * Routes that require the user to be authenticated.
 * Unauthenticated requests are redirected to /login.
 */
const PROTECTED_PREFIXES = [
  '/swipe',
  '/favorites',
  '/profile',
  '/owner',
  '/admin',
]

/**
 * Routes only accessible to guests (redirect authenticated users away).
 */
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password']

export async function middleware(request: NextRequest) {
  // Start with a passthrough response; middleware-client may attach refreshed
  // auth cookies to it before we return it.
  const response = NextResponse.next({ request })

  // Refresh the Supabase session and propagate cookies.
  // This is required so Server Components receive an up-to-date session.
  const supabase = createMiddlewareClient(request, response)

  // getUser() validates the JWT on the server — safer than getSession() which
  // only reads from the cookie and can be spoofed.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // --- Guard: protected routes → redirect to /login when unauthenticated ---
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    // Preserve destination so we can redirect back after login
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // --- Guard: auth routes → redirect authenticated users to /swipe ---
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
  if (isAuthRoute && user) {
    const swipeUrl = request.nextUrl.clone()
    swipeUrl.pathname = '/swipe'
    swipeUrl.search = ''
    return NextResponse.redirect(swipeUrl)
  }

  // --- Guard: /admin routes → require admin role ---
  if (pathname.startsWith('/admin')) {
    if (!user) {
      // Already handled above, but kept for clarity
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      return NextResponse.redirect(loginUrl)
    }
    // Role is embedded in user metadata (set via DB trigger on signup)
    const role = user.user_metadata?.role as string | undefined
    if (role !== 'admin') {
      const homeUrl = request.nextUrl.clone()
      homeUrl.pathname = '/swipe'
      homeUrl.search = ''
      return NextResponse.redirect(homeUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico, manifest.json, robots.txt
     * - /auth/callback  (OAuth redirect — must not be intercepted)
     * - public assets with extensions
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|robots\\.txt|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
