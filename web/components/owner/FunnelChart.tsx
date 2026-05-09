'use client'

import {
  FunnelChart as RechartsFunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { PropertyStat } from '@/lib/dashboard/actions'

interface FunnelChartProps {
  stats: PropertyStat
}

const COLORS = ['#6B4F3A', '#8B6347', '#A87D62', '#C4A882']

/**
 * FunnelChart — conversion funnel for a single property.
 * Shows: Views → Right Swipes → Bot Started → Approved Leads
 */
export function FunnelChart({ stats }: FunnelChartProps) {
  const data = [
    { name: 'חשיפות',       value: Number(stats.total_views)    },
    { name: 'מעוניינים',    value: Number(stats.right_swipes)   },
    { name: 'שיחות בוט',   value: Number(stats.bot_started)    },
    { name: 'פניות מאושרות', value: Number(stats.approved_leads) },
  ]

  if (data[0].value === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-[var(--color-muted)]">
        אין נתונים עדיין לנכס זה
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <RechartsFunnelChart margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #E8DDD4',
            fontSize: 12,
            color: '#2C1810',
            background: '#FDFAF7',
          }}
        />
        <Funnel
          dataKey="value"
          data={data}
          isAnimationActive
          lastShapeType="rectangle"
        >
          <LabelList
            position="center"
            fill="#FDFAF7"
            stroke="none"
            fontSize={11}
            fontWeight={600}
            dataKey="value"
          />
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Funnel>
      </RechartsFunnelChart>
    </ResponsiveContainer>
  )
}
