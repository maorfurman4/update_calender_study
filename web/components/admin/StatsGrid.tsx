import { Users, Building2, Zap, CheckCircle2, Ban, LayoutList } from 'lucide-react'
import type { AdminStats } from '@/lib/admin/actions'

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  icon: React.ElementType
  accent?: boolean
  warn?: boolean
}

function StatCard({ label, value, sub, icon: Icon, accent, warn }: StatCardProps) {
  const bg   = accent ? 'var(--color-primary)' : warn ? '#FEF2F2' : 'var(--color-surface)'
  const text = accent ? '#FDFAF7' : warn ? '#EF4444' : 'var(--color-dark)'
  const sub_ = accent ? 'rgba(253,250,247,0.7)' : warn ? '#F87171' : 'var(--color-muted, #8B7355)'

  return (
    <div
      className="rounded-2xl p-4 flex flex-col gap-2"
      style={{ background: bg, border: '1px solid var(--color-border)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold" style={{ color: sub_ }}>
          {label}
        </span>
        <Icon size={16} style={{ color: sub_ }} strokeWidth={1.5} />
      </div>
      <p className="text-2xl font-black" style={{ color: text }}>
        {typeof value === 'number' ? value.toLocaleString('he-IL') : value}
      </p>
      {sub && <p className="text-[11px]" style={{ color: sub_ }}>{sub}</p>}
    </div>
  )
}

interface StatsGridProps {
  stats: AdminStats
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        label="משתמשים"
        value={stats.totalUsers}
        sub="סה״כ רשומים"
        icon={Users}
      />
      <StatCard
        label="נכסים"
        value={stats.totalProperties}
        sub={`${stats.activeProperties} פעילים`}
        icon={Building2}
      />
      <StatCard
        label="החלקות היום"
        value={stats.totalSwipesToday}
        sub="מכלל המשתמשים"
        icon={Zap}
      />
      <StatCard
        label="פניות היום"
        value={stats.totalLeadsToday}
        sub="אושרו על-ידי הבוט"
        icon={CheckCircle2}
        accent
      />
      <StatCard
        label="מודרים"
        value={stats.bannedUsers}
        sub={stats.bannedUsers > 0 ? 'חשבונות מושעים' : 'אין חשבונות מושעים'}
        icon={Ban}
        warn={stats.bannedUsers > 0}
      />
      <StatCard
        label="כלל נכסים"
        value={stats.totalProperties}
        sub="כולל מושהים ונמכרו"
        icon={LayoutList}
      />
    </div>
  )
}
