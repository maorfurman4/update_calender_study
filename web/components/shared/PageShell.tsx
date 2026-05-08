import { Navbar } from './Navbar'

interface PageShellProps {
  children: React.ReactNode
  /**
   * When true, the content area fills the full viewport height with no
   * scroll — used for the Swipe feed screen where cards must be full-screen.
   * When false (default), the content scrolls normally within the shell.
   */
  fullscreen?: boolean
  /**
   * Optionally hide the bottom Navbar (e.g., during the bot interview sheet).
   */
  hideNav?: boolean
}

/**
 * PageShell — The root layout wrapper for all app screens.
 *
 * Structure:
 *   <html dir="rtl">          ← set in app/layout.tsx
 *     <body>
 *       <PageShell>
 *         <main>              ← fills viewport, sits above bottom nav
 *           {children}
 *         </main>
 *         <Navbar />          ← fixed bottom bar (h-16)
 *       </PageShell>
 *     </body>
 *   </html>
 *
 * The bottom Navbar is `position: fixed` (h-16 = 64px).
 * `pb-16` on <main> prevents content from hiding behind it.
 *
 * CSS Logical Properties are used throughout:
 *   - `min-block-size` (= min-height, direction-agnostic)
 *   - No physical `ml-`, `pr-`, `text-left`, etc.
 */
export function PageShell({
  children,
  fullscreen = false,
  hideNav = false,
}: PageShellProps) {
  return (
    <div className="flex flex-col min-h-dvh bg-[var(--color-bg)]">
      <main
        className={[
          'flex-1',
          'w-full',
          // Reserve space for fixed bottom nav (h-16 = 4rem)
          hideNav ? '' : 'pb-16',
          // Fullscreen mode: prevent any scrolling — used for swipe feed
          fullscreen
            ? 'overflow-hidden h-[calc(100dvh-4rem)]'
            : 'overflow-y-auto',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </main>

      {!hideNav && <Navbar />}
    </div>
  )
}
