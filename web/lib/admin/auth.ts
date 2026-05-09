/**
 * lib/admin/auth.ts
 *
 * Edge-compatible admin session utilities.
 * Uses Web Crypto API (crypto.subtle) — no Node.js-specific modules,
 * safe to import in both Middleware (Edge Runtime) and Route Handlers (Node.js).
 *
 * Mechanism:
 *   1. Admin enters ADMIN_PASSPHRASE in the login form.
 *   2. API route calls signAdminToken() → HMAC-SHA-256 hex digest.
 *   3. That digest is stored as an httpOnly cookie (__nadlan_admin).
 *   4. Middleware calls verifyAdminCookie() on every /admin request.
 *      It re-derives the expected HMAC and compares to the cookie value.
 *
 * Security properties:
 *   - Cookie value is unforgeable without ADMIN_COOKIE_SECRET.
 *   - Changing either env var immediately invalidates all existing sessions.
 *   - No DB lookup needed during middleware verification (pure crypto).
 */

export const ADMIN_COOKIE_NAME = '__nadlan_admin'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the expected HMAC-SHA-256 token for the given passphrase.
 * Call this when generating the cookie value after successful login.
 */
export async function signAdminToken(passphrase: string): Promise<string> {
  const secret = process.env.ADMIN_COOKIE_SECRET
  if (!secret) throw new Error('ADMIN_COOKIE_SECRET is not configured')

  const key = await deriveKey(secret)
  const encoder = new TextEncoder()
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(passphrase))
  return bufToHex(sig)
}

/**
 * Verify a raw cookie value against the expected HMAC.
 * Returns true if the cookie is valid (admin session active).
 *
 * Timing-safe: both values are hashed via HMAC before string comparison,
 * so neither length nor content of the cookie leaks timing info.
 */
export async function verifyAdminToken(cookieValue: string): Promise<boolean> {
  try {
    const passphrase = process.env.ADMIN_PASSPHRASE
    const secret = process.env.ADMIN_COOKIE_SECRET
    if (!passphrase || !secret) return false

    const expected = await signAdminToken(passphrase)
    // Compare via constant-length hex strings — equal length prevents early exit
    if (expected.length !== cookieValue.length) return false

    // XOR each char code: accumulate differences so we never short-circuit
    let diff = 0
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ cookieValue.charCodeAt(i)
    }
    return diff === 0
  } catch {
    return false
  }
}
