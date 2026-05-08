import { redirect } from 'next/navigation'

/**
 * Root route ("/") redirects to the swipe feed.
 * The swipe feed is the primary entry point of the app.
 * Auth protection is handled by proxy.ts (Next.js 16 convention).
 */
export default function RootPage() {
  redirect('/swipe')
}
