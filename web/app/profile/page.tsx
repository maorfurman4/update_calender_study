import { redirect } from 'next/navigation'
import { PageShell } from '@/components/shared/PageShell'

export const dynamic = 'force-dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { SearchPrefsForm } from '@/components/profile/SearchPrefsForm'
import { ConversationList } from '@/components/profile/ConversationList'
import {
  getProfile,
  getConversationHistory,
} from '@/lib/profile/actions'
import type { SearchPreferences } from '@/lib/supabase/types'

/**
 * ProfilePage — Server Component.
 *
 * Renders two tabs:
 *   1. "פרופיל" — name / phone edit + Yad2-style default search preferences
 *   2. "שיחות"  — full conversation history with bot interview status
 *
 * Fetches are parallelised with Promise.all for minimal TTFB.
 */
export default async function ProfilePage() {
  const [profile, conversations] = await Promise.all([
    getProfile(),
    getConversationHistory(),
  ])

  if (!profile) redirect('/login?next=/profile')

  // Parse saved preferences from JSONB — default to empty object
  const savedPrefs = (profile.search_preferences ?? {}) as SearchPreferences

  return (
    <PageShell>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-dark)]">הפרופיל שלי</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            נהל את הפרטים שלך והעדפות החיפוש
          </p>
        </div>

        <Tabs defaultValue="profile" dir="rtl">
          <TabsList className="w-full mb-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-1">
            <TabsTrigger
              value="profile"
              className="flex-1 rounded-lg text-sm data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow"
            >
              פרופיל
            </TabsTrigger>
            <TabsTrigger
              value="conversations"
              className="flex-1 rounded-lg text-sm data-[state=active]:bg-[var(--color-primary)] data-[state=active]:text-white data-[state=active]:shadow"
            >
              שיחות
              {conversations.length > 0 && (
                <span className="ms-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/30 text-[10px] font-bold">
                  {conversations.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Profile tab ──────────────────────────────────────────────── */}
          <TabsContent value="profile" className="flex flex-col gap-8 outline-none">
            {/* Basic details */}
            <section>
              <h2 className="text-base font-semibold text-[var(--color-dark)] mb-4">
                פרטים אישיים
              </h2>
              <ProfileForm user={profile} />
            </section>

            <div className="h-px bg-[var(--color-border)]" />

            {/* Search preferences */}
            <section>
              <h2 className="text-base font-semibold text-[var(--color-dark)] mb-1">
                העדפות חיפוש
              </h2>
              <p className="text-xs text-[var(--color-muted)] mb-4">
                הגדר פילטרים ברירת מחדל בסגנון יד2 — ישמשו כנקודת התחלה בחיפוש ובגלישה
              </p>
              <SearchPrefsForm initial={savedPrefs} />
            </section>
          </TabsContent>

          {/* ── Conversations tab ─────────────────────────────────────────── */}
          <TabsContent value="conversations" className="outline-none">
            <h2 className="text-base font-semibold text-[var(--color-dark)] mb-4">
              היסטוריית שיחות
            </h2>
            <ConversationList conversations={conversations} />
          </TabsContent>
        </Tabs>
      </div>
    </PageShell>
  )
}
