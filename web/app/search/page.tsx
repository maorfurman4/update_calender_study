import { Suspense } from 'react'
import { SearchView } from './SearchView'

/**
 * /search — full-viewport map + bottom sheet results.
 *
 * force-dynamic: this page queries Supabase at runtime and reads URL params
 * via useSearchParams(), so it must never be statically pre-rendered.
 *
 * The Suspense boundary is required by Next.js because SearchView uses
 * useSearchParams() — without it the build fails at the SSR static pass.
 */
export const dynamic = 'force-dynamic'

export default function SearchPage() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  )
}
