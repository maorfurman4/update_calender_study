import { redirect } from 'next/navigation'
import { Eye, ThumbsUp, MessageCircle, CheckCircle2, TrendingUp } from 'lucide-react'

export const dynamic = 'force-dynamic'
import { PageShell } from '@/components/shared/PageShell'
import { KpiCard } from '@/components/owner/KpiCard'
import { SwipeChart } from '@/components/owner/SwipeChart'
import { FunnelChart } from '@/components/owner/FunnelChart'
import { DropOffList } from '@/components/owner/DropOffList'
import { LeadsTable } from '@/components/owner/LeadsTable'
import { getDashboardData } from '@/lib/dashboard/actions'
import { createClient } from '@/lib/supabase/server'

/**
 * DashboardPage — Owner analytics hub.
 *
 * Server Component: all four RPCs are called in parallel inside
 * getDashboardData() with Promise.all for minimal TTFB.
 *
 * Layout (single property case):
 *   1. KPI grid (4 cards): Views | Right Swipes | Bot Started | Approved Leads
 *   2. 30-day Swipe Activity LineChart
 *   3. Conversion Funnel (recharts FunnelChart)
 *   4. Bot Drop-off Analysis (DropOffList)
 *   5. Approved Leads table (LeadsTable)
 *
 * Multi-property: aggregates summed for KPIs; charts/funnel show first property.
 */
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/owner/dashboard')

  const { propertyStats, dailySwipes, dropOffs, leads, error } =
    await getDashboardData()

  // Aggregate KPIs across all properties
  const totals = propertyStats.reduce(
    (acc, p) => ({
      views:   acc.views   + Number(p.total_views),
      rights:  acc.rights  + Number(p.right_swipes),
      bots:    acc.bots    + Number(p.bot_started),
      approved: acc.approved + Number(p.approved_leads),
    }),
    { views: 0, rights: 0, bots: 0, approved: 0 },
  )

  const overallConversion = totals.views > 0
    ? `${Math.round((totals.rights / totals.views) * 100)}%`
    : '0%'

  // Primary property for per-property charts (highest views)
  const primaryStat = propertyStats[0]

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-dark)]">לוח הבקרה שלי</h1>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            {propertyStats.length === 0
              ? 'עדיין אין נכסים פעילים'
              : `${propertyStats.length} ${propertyStats.length === 1 ? 'נכס' : 'נכסים'} פעילים`}
          </p>
          {error && (
            <p className="text-xs text-red-500 mt-1">שגיאה בטעינת הנתונים: {error}</p>
          )}
        </div>

        {propertyStats.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <TrendingUp size={40} className="text-[var(--color-border)]" strokeWidth={1.5} />
            <p className="text-sm text-[var(--color-muted)]">
              פרסם נכס ראשון כדי לראות אנליטיקס
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">

            {/* ── KPI Grid ──────────────────────────────────────────────── */}
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-muted)] uppercase mb-3">
                סיכום כללי
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <KpiCard
                  label="חשיפות"
                  value={totals.views.toLocaleString('he-IL')}
                  sub="סה״כ צפיות בנכסים"
                  icon={Eye}
                />
                <KpiCard
                  label="מעוניינים"
                  value={totals.rights.toLocaleString('he-IL')}
                  sub={`${overallConversion} מכלל הצפיות`}
                  icon={ThumbsUp}
                />
                <KpiCard
                  label="שיחות בוט"
                  value={totals.bots.toLocaleString('he-IL')}
                  sub="ראיונות שהתחילו"
                  icon={MessageCircle}
                />
                <KpiCard
                  label="פניות מאושרות"
                  value={totals.approved.toLocaleString('he-IL')}
                  sub="מועמדים עברו סינון"
                  icon={CheckCircle2}
                  accent
                />
              </div>
            </section>

            {/* ── Per-property stats strip (multi-property) ─────────────── */}
            {propertyStats.length > 1 && (
              <section>
                <h2 className="text-sm font-semibold text-[var(--color-muted)] uppercase mb-3">
                  לפי נכס
                </h2>
                <div className="flex flex-col gap-2">
                  {propertyStats.map((p) => (
                    <div
                      key={p.property_id}
                      className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3"
                    >
                      <p className="text-sm font-medium text-[var(--color-dark)] truncate max-w-[55%]">
                        {p.property_title}
                      </p>
                      <div className="flex gap-4 text-xs text-[var(--color-muted)]">
                        <span>{Number(p.total_views)} צפיות</span>
                        <span>{Number(p.right_swipes)} מעוניינים</span>
                        <span className="font-semibold text-[var(--color-primary)]">
                          {Number(p.approved_leads)} אושרו
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── 30-day Swipe Activity ─────────────────────────────────── */}
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-muted)] uppercase mb-3">
                פעילות החלקות — 30 יום אחרונים
              </h2>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <SwipeChart data={dailySwipes} />
              </div>
            </section>

            {/* ── Conversion Funnel ─────────────────────────────────────── */}
            {primaryStat && (
              <section>
                <h2 className="text-sm font-semibold text-[var(--color-muted)] uppercase mb-1">
                  משפך המרה
                </h2>
                <p className="text-xs text-[var(--color-muted)] mb-3">
                  {primaryStat.property_title}
                </p>
                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div className="flex justify-around text-center mb-4 text-xs text-[var(--color-muted)]">
                    {[
                      ['חשיפות',        primaryStat.total_views],
                      ['מעוניינים',     primaryStat.right_swipes],
                      ['שיחות בוט',    primaryStat.bot_started],
                      ['פניות מאושרות', primaryStat.approved_leads],
                    ].map(([label, val]) => (
                      <div key={label as string} className="flex flex-col gap-0.5">
                        <span className="text-xl font-black text-[var(--color-dark)]">{Number(val)}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                  <FunnelChart stats={primaryStat} />
                </div>
              </section>
            )}

            {/* ── Bot Drop-off Analysis ─────────────────────────────────── */}
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-muted)] uppercase mb-1">
                ניתוח נקודות נטישה
              </h2>
              <p className="text-xs text-[var(--color-muted)] mb-3">
                שיחות שנטשו לאחר 24 שעות ללא מענה — מציג את השאלה האחרונה שנשלחה
              </p>
              <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <DropOffList dropOffs={dropOffs} />
              </div>
            </section>

            {/* ── Approved Leads ────────────────────────────────────────── */}
            <section>
              <h2 className="text-sm font-semibold text-[var(--color-muted)] uppercase mb-3">
                פניות מאושרות
              </h2>
              <LeadsTable leads={leads} />
            </section>

          </div>
        )}
      </div>
    </PageShell>
  )
}
