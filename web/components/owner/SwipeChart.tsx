'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { DailySwipe } from '@/lib/dashboard/actions'

interface SwipeChartProps {
  data: DailySwipe[]
}

function formatDay(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

/**
 * SwipeChart — recharts LineChart of daily right vs left swipes (30 days).
 * Must be a Client Component because recharts uses browser APIs (ResizeObserver).
 */
export function SwipeChart({ data }: SwipeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-[var(--color-muted)]">
        אין נתוני החלקות עדיין
      </div>
    )
  }

  const chartData = data.map((d) => ({
    day:    formatDay(d.day),
    right:  Number(d.right_swipes),
    left:   Number(d.left_swipes),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E8DDD4" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: '#8B6347' }}
          tickLine={false}
          axisLine={{ stroke: '#E8DDD4' }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#8B6347' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #E8DDD4',
            fontSize: 12,
            color: '#2C1810',
            background: '#FDFAF7',
          }}
          labelStyle={{ fontWeight: 700 }}
        />
        <Legend
          formatter={(value) => (value === 'right' ? 'מעוניין' : 'דחה')}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Line
          type="monotone"
          dataKey="right"
          stroke="#6B4F3A"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="left"
          stroke="#E8DDD4"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
