import { NextResponse } from 'next/server'
import { ADMIN_COOKIE_NAME } from '@/lib/admin/auth'

/**
 * POST /api/admin/logout
 *
 * Clears the admin session cookie and redirects to /admin/login.
 */
export async function POST() {
  const response = NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : 'http://localhost:3000'}/admin/login`,
    { status: 303 },
  )

  // Expire the cookie immediately
  response.cookies.set(ADMIN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}
