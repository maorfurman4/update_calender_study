import { NextRequest, NextResponse } from 'next/server'
import { signAdminToken, ADMIN_COOKIE_NAME } from '@/lib/admin/auth'

/**
 * POST /api/admin/auth
 *
 * Verifies the submitted passphrase against ADMIN_PASSPHRASE env var.
 * On success: sets a signed httpOnly admin session cookie.
 * On failure: returns 401.
 *
 * This route is accessible even when maintenance mode is on (exempted in middleware).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { passphrase?: unknown }
    const submitted = typeof body.passphrase === 'string' ? body.passphrase : ''

    const expected = process.env.ADMIN_PASSPHRASE
    if (!expected) {
      console.error('[admin/auth] ADMIN_PASSPHRASE env var is not set')
      return NextResponse.json({ error: 'שגיאת הגדרה' }, { status: 500 })
    }

    if (!submitted || submitted !== expected) {
      // Small fixed delay to slow down brute-force
      await new Promise((r) => setTimeout(r, 400))
      return NextResponse.json({ error: 'סיסמה שגויה' }, { status: 401 })
    }

    // Generate the signed token (HMAC-SHA-256 of passphrase keyed with ADMIN_COOKIE_SECRET)
    const token = await signAdminToken(submitted)

    const response = NextResponse.json({ ok: true })
    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      // No explicit maxAge → session cookie (cleared when browser closes)
    })

    return response
  } catch (err) {
    console.error('[admin/auth] Unexpected error:', err)
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 })
  }
}
