import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * Browser-side Supabase client.
 * Safe to call in Client Components and browser event handlers.
 * Creates a new instance each call — React's module cache de-dupes it in practice.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
