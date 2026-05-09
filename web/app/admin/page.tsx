import Link from 'next/link'
import { ShieldCheck, Users, Building2, LogOut } from 'lucide-react'
import { PageShell } from '@/components/shared/PageShell'
import { StatsGrid } from '@/components/admin/StatsGrid'
import { KillSwitch } from '@/components/admin/KillSwitch'
import { getAdminStats, getMaintenanceMode, getAuditLogs } from '@/lib/admin/actions'

export const dynamic = 'force-dynamic'

/**
 * AdminDashboard — God Mode overview.
 *
 * Renders:
 *   1. Platform-wide KPI grid
 *   2. Kill Switch toggle
 *   3. Navigation to sub-pages (Users, Properties)
 *   4. Recent audit log
 */
export default async function AdminPage() {
  const [stats, inMaintenance, auditLogs] = await Promise.all([
    getAdminStats(),
    getMaintenanceMode(),
    getAuditLogs(),
  ])

  const ACTION_LABEL: Record<string, string> = {
    ban_user:            'השעיית משתמש',
    unban_user:          'ביטול השעיה',
    delete_property:     'מחיקת נכס',
    toggle_maintenance:  'שינוי מצב תחזוקה',
  }

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-10 h-10 rounded-xl"
              style={{ background: 'var(--color-primary)' }}
            >
              <ShieldCheck size={20} color="#FDFAF7" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-lg font-black" style={{ color: 'var(--color-dark)' }}>
                God Mode
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-muted, #8B7355)' }}>
                פאנל ניהול מנהל
              </p>
            </div>
          </div>

          {/* Logout */}
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-dark)' }}
            >
              <LogOut size={12} />
              יציאה
            </button>
          </form>
        </div>

        {/* Kill Switch */}
        <section>
          <h2 className="text-sm font-semibold uppercase mb-3" style={{ color: 'var(--color-muted, #8B7355)' }}>
            שליטה כללית
          </h2>
          <KillSwitch initialEnabled={inMaintenance} />
        </section>

        {/* Platform KPIs */}
        <section>
          <h2 className="text-sm font-semibold uppercase mb-3" style={{ color: 'var(--color-muted, #8B7355)' }}>
            סטטיסטיקות פלטפורמה
          </h2>
          <StatsGrid stats={stats} />
        </section>

        {/* Navigation tiles */}
        <section>
          <h2 className="text-sm font-semibold uppercase mb-3" style={{ color: 'var(--color-muted, #8B7355)' }}>
            ניהול
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/admin/users"
              className="flex flex-col items-center justify-center gap-3 rounded-2xl py-7 text-center transition-all active:scale-95"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <Users size={26} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-dark)' }}>משתמשים</p>
                <p className="text-xs" style={{ color: 'var(--color-muted, #8B7355)' }}>
                  {stats.totalUsers} רשומים
                </p>
              </div>
            </Link>

            <Link
              href="/admin/properties"
              className="flex flex-col items-center justify-center gap-3 rounded-2xl py-7 text-center transition-all active:scale-95"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            >
              <Building2 size={26} strokeWidth={1.5} style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-dark)' }}>נכסים</p>
                <p className="text-xs" style={{ color: 'var(--color-muted, #8B7355)' }}>
                  {stats.totalProperties} נכסים
                </p>
              </div>
            </Link>
          </div>
        </section>

        {/* Audit log */}
        <section>
          <h2 className="text-sm font-semibold uppercase mb-3" style={{ color: 'var(--color-muted, #8B7355)' }}>
            לוג פעולות אחרון
          </h2>

          {auditLogs.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: 'var(--color-muted, #8B7355)' }}>
              אין פעולות עדיין
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {auditLogs.slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 rounded-xl px-4 py-3"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-dark)' }}>
                      {ACTION_LABEL[entry.action_type] ?? entry.action_type}
                    </p>
                    {entry.target_id && (
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--color-muted, #8B7355)' }}>
                        {entry.target_id.slice(0, 16)}…
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] shrink-0" style={{ color: 'var(--color-muted, #8B7355)' }}>
                    {new Date(entry.created_at).toLocaleString('he-IL', {
                      day: '2-digit', month: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </PageShell>
  )
}
