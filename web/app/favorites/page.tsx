import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Heart, Bed, Maximize2, MapPin } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { getFavorites } from '@/lib/profile/actions'

export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'

/**
 * FavoritesPage — shows all properties the user has swiped right on.
 * Auto-favorited in Phase 5 via recordSwipe('right') → favorites upsert.
 *
 * Renders a 2-column responsive grid of property cards.
 * Each card links to the bot screen (/bot/[id]) so the user can
 * resume or start the interview directly from their saved items.
 */
export default async function FavoritesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/favorites')

  const favorites = await getFavorites()

  return (
    <PageShell>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Heart size={20} className="text-[var(--color-primary)]" strokeWidth={2} />
          <h1 className="text-2xl font-bold text-[var(--color-dark)]">המועדפים שלי</h1>
        </div>

        {favorites.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-20 h-20 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center">
              <Heart size={32} className="text-[var(--color-border)]" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-base font-semibold text-[var(--color-dark)]">
                עדיין לא שמרת נכסים
              </p>
              <p className="text-sm text-[var(--color-muted)] max-w-xs leading-relaxed">
                החלק ימינה על נכס שאהבת בגלישה כדי לשמור אותו כאן
              </p>
            </div>
            <Link
              href="/swipe"
              className="rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-medium text-white shadow hover:bg-[var(--color-dark)] transition-colors"
            >
              התחל לגלוש
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--color-muted)] mb-4">
              {favorites.length} נכסים שמורים
            </p>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-3">
              {favorites.map(({ id: favId, property }) => {
                const thumb = property.photos?.[0]
                const totalMonthly =
                  property.category === 'rental'
                    ? property.price + property.arnona + property.vaad
                    : null

                return (
                  <Link
                    key={favId}
                    href={`/bot/${property.id}`}
                    className="flex flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden shadow-sm hover:border-[var(--color-primary)] hover:shadow-md transition-all"
                  >
                    {/* Photo */}
                    <div className="relative w-full aspect-[4/3] bg-[var(--color-border)]">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <MapPin size={24} className="text-[var(--color-muted)]" />
                        </div>
                      )}

                      {/* Category chip */}
                      <span className="absolute top-2 start-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
                        {property.category === 'rental'
                          ? 'השכרה'
                          : property.category === 'sale'
                          ? 'מכירה'
                          : 'שותפים'}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="p-2.5 flex flex-col gap-1">
                      <p className="text-xs font-semibold text-[var(--color-dark)] line-clamp-1">
                        {property.title}
                      </p>
                      <p className="text-[10px] text-[var(--color-muted)] line-clamp-1">
                        {property.address}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-2 mt-0.5">
                        {property.rooms && (
                          <span className="flex items-center gap-0.5 text-[10px] text-[var(--color-muted)]">
                            <Bed size={10} />
                            {property.rooms}
                          </span>
                        )}
                        {property.size_sqm && (
                          <span className="flex items-center gap-0.5 text-[10px] text-[var(--color-muted)]">
                            <Maximize2 size={10} />
                            {property.size_sqm}מ״ר
                          </span>
                        )}
                      </div>

                      {/* Price */}
                      <p className="text-sm font-bold text-[var(--color-primary)] mt-0.5">
                        ₪{property.price.toLocaleString('he-IL')}
                        {totalMonthly && totalMonthly > property.price && (
                          <span className="text-[10px] font-normal text-[var(--color-muted)] ms-1">
                            / {totalMonthly.toLocaleString('he-IL')} סה״כ
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </PageShell>
  )
}
