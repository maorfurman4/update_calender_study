import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'
import type { Database } from './types'

/**
 * Creates a Supabase client scoped to a middleware request/response pair.
 * Must implement both getAll AND setAll so token refreshes are written
 * back to the response (critical to avoid session desync).
 */
export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write refreshed tokens to both the mutated request and the response
          // so the new cookies are available to the next Server Component render.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )
}
