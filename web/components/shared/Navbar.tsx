'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, LayoutGrid, Heart, User, PlusSquare } from 'lucide-react'

// Each tab in the bottom navigation bar.
// `href` uses logical routes — no locale prefix (single-language app).
const NAV_ITEMS = [
  { key: 'search',    href: '/search',    icon: Search      },
  { key: 'swipe',     href: '/swipe',     icon: LayoutGrid  },
  { key: 'favorites', href: '/favorites', icon: Heart       },
  { key: 'publish',   href: '/owner/new', icon: PlusSquare  },
  { key: 'profile',   href: '/profile',   icon: User        },
] as const

export function Navbar() {
  const t = useTranslations('nav')
  const pathname = usePathname()

  return (
    // Fixed bottom bar — sits above content on mobile.
    // Uses CSS Logical Properties via Tailwind: ps-, pe-, border-t (block direction).
    // Physical directions (ml-, pr-, etc.) are FORBIDDEN in this codebase.
    <nav
      aria-label="ניווט ראשי"
      className="
        fixed bottom-0 inset-x-0 z-50
        bg-[var(--color-surface)]
        border-t border-[var(--color-border)]
        safe-area-inset-bottom
      "
    >
      <ul
        role="list"
        className="flex items-stretch h-16"
      >
        {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`)

          return (
            <li key={key} className="flex flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className="
                  flex flex-1 flex-col items-center justify-center gap-0.5
                  ps-1 pe-1
                  transition-colors duration-150
                  focus-visible:outline-2 focus-visible:outline-offset-2
                  focus-visible:outline-[var(--color-primary)]
                "
              >
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={
                    isActive
                      ? 'text-[var(--color-primary)]'
                      : 'text-[var(--color-muted)]'
                  }
                  aria-hidden="true"
                />
                <span
                  className={`
                    text-[10px] leading-none
                    ${isActive
                      ? 'text-[var(--color-primary)] font-semibold'
                      : 'text-[var(--color-muted)] font-normal'
                    }
                  `}
                  // No letter-spacing — Hebrew text renders poorly with it.
                >
                  {t(key)}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
