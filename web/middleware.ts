import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware-client'
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin/auth'

/**
 * Routes that require the user to be authenticated via Supabase Auth.
 * /admin is intentionally excluded — it has its own isolated cookie auth.
 */
const PROTECTED_PREFIXES = [
  '/swipe',
  '/favorites',
  '/profile',
  '/owner',
]

/**
 * Routes only accessible to guests (redirect authenticated users away).
 */
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password']

// ---------------------------------------------------------------------------
// Kill-switch cache — avoid a DB round-trip on every single request.
// Module-level variable persists within a Fluid Compute instance (~30 s TTL).
// ---------------------------------------------------------------------------
let maintenanceCache: { value: boolean; expiresAt: number } | null = null

async function checkMaintenanceMode(supabase: ReturnType<typeof createMiddlewareClient>): Promise<boolean> {
  const now = Date.now()
  if (maintenanceCache && maintenanceCache.expiresAt > now) {
    return maintenanceCache.value
  }
  try {
    const { data } = await supabase
      .from('system_settings')
      .select('maintenance_mode')
      .single()
    const value = (data as { maintenance_mode: boolean } | null)?.maintenance_mode ?? false
    maintenanceCache = { value, expiresAt: now + 30_000 } // 30-second TTL
    return value
  } catch {
    // If DB is unreachable, default to not blocking traffic
    return false
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  // Supabase client — refreshes session cookies on every request
  const supabase = createMiddlewareClient(request, response)

  // ── 1. Kill Switch ──────────────────────────────────────────────────────────
  // Maintenance mode bypasses all other checks.
  // Admin routes + /maintenance are always accessible so the operator can
  // toggle maintenance mode off from the panel.
  const isAdminPath = pathname.startsWith('/admin')
  const isMaintenancePage = pathname === '/maintenance'
  const isApiAdminPath = pathname.startsWith('/api/admin')

  if (!isAdminPath && !isMaintenancePage && !isApiAdminPath) {
    const inMaintenance = await checkMaintenanceMode(supabase)
    if (inMaintenance) {
      const maintenanceUrl = request.nextUrl.clone()
      maintenanceUrl.pathname = '/maintenance'
      maintenanceUrl.search = ''
      return NextResponse.redirect(maintenanceUrl)
    }
  }

  // ── 2. Admin routes — isolated cookie-based auth ────────────────────────────
  // /admin/login and /api/admin/* are exempted so the login form itself works.
  if (isAdminPath && pathname !== '/admin/login') {
    const adminCookie = request.cookies.get(ADMIN_COOKIE_NAME)?.value ?? ''
    const isValidAdmin = await verifyAdminToken(adminCookie)

    if (!isValidAdmin) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/admin/login'
      loginUrl.search = ''
      return NextResponse.redirect(loginUrl)
    }
  }

  // ── 3. Supabase auth — protected user routes ────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── 4. Auth routes — redirect authenticated users away ──────────────────────
  const isAuthRoute = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
  if (isAuthRoute && user) {
    const swipeUrl = request.nextUrl.clone()
    swipeUrl.pathname = '/swipe'
    swipeUrl.search = ''
    return NextResponse.redirect(swipeUrl)
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
