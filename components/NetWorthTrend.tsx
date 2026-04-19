'use client'

import { useState, useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useChartTheme } from '@/lib/use-chart-theme'
import type { NetWorthSnapshot } from '@/lib/types'
import { formatCHF } from '@/lib/format'

interface NetWorthTrendProps {
  snapshots: NetWorthSnapshot[]
}

interface ChartDataPoint {
  label: string
  date: string
  netWorth: number
  totalAssets: number
  totalLiabilities: number
}

export function NetWorthTrend({ snapshots }: NetWorthTrendProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const chartTheme = useChartTheme()

  const chartData = useMemo((): ChartDataPoint[] => {
    if (snapshots.length === 0) return []

    // Aggregate by month — use latest snapshot per month
    const byMonth = new Map<string, NetWorthSnapshot>()
    for (const snap of snapshots) {
      const key = format(snap.date, 'yyyy-MM')
      const existing = byMonth.get(key)
      if (!existing || snap.date > existing.date) {
        byMonth.set(key, snap)
      }
    }

    return Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_key, snap]) => ({
        label: format(snap.date, 'MMM yyyy'),
        date: snap.date.toISOString(),
        netWorth: snap.netWorth,
        totalAssets: snap.totalAssets,
        totalLiabilities: snap.totalLiabilities,
      }))
  }, [snapshots])

  if (snapshots.length === 0) {
    return (
      <Card className="border-2 border-gray-50 shadow-xl dark:border-gray-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-100 p-2 dark:bg-teal-900">
              <TrendingUp className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Net Worth Trend</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center">
            <TrendingUp className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
            <p className="mb-2 font-medium text-gray-600 dark:text-gray-400">No snapshots yet</p>
            <p className="text-sm text-muted-foreground">
              Add accounts and update balances to see your net worth trend over time
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: Array<{
      dataKey: string
      value: number
      color: string
    }>
    label?: string
  }) => {
    if (!active || !payload || !payload.length) return null

    return (
      <div className="rounded-xl border-2 border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <p className="mb-2 font-bold text-gray-900 dark:text-gray-100">{label}</p>
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2 py-1 text-sm">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">
              {entry.dataKey === 'netWorth'
                ? 'Net Worth'
                : entry.dataKey === 'totalAssets'
                  ? 'Assets'
                  : 'Liabilities'}
              :
            </span>
            <span className="font-semibold">{formatCHF(entry.value)}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className="border-2 border-gray-50 shadow-xl dark:border-gray-800">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-teal-100 p-2 dark:bg-teal-900">
            <TrendingUp className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Net Worth Trend</h2>
            <p className="text-sm text-muted-foreground">
              {chartData.length} month
              {chartData.length !== 1 ? 's' : ''} of data
            </p>
          </div>
        </div>
        <Button
          variant={showBreakdown ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className={
            showBreakdown ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' : ''
          }
        >
          {showBreakdown ? 'Hide' : 'Show'} Assets/Liabilities
        </Button>
      </CardHeader>
      <CardContent>
        <div
          className="h-[400px]"
          role="img"
          aria-label={`Area chart showing net worth trend over ${chartData.length} months`}
        >
          <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="assetsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="liabilitiesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartTheme.gridStroke}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{
                  fontSize: 11,
                  fill: chartTheme.axisFill,
                }}
                stroke={chartTheme.axisStroke}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fontSize: 12,
                  fill: chartTheme.axisFill,
                }}
                stroke={chartTheme.axisStroke}
                tickLine={false}
                tickFormatter={(value) => {
                  if (Math.abs(value) >= 1_000_000) {
                    return `${(value / 1_000_000).toFixed(1)}M`
                  }
                  return `${(value / 1000).toFixed(0)}k`
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {showBreakdown && (
                <>
                  <Area
                    type="monotone"
                    dataKey="totalAssets"
                    name="Assets"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#assetsGradient)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalLiabilities"
                    name="Liabilities"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#liabilitiesGradient)"
                    dot={false}
                  />
                </>
              )}
              <Area
                type="monotone"
                dataKey="netWorth"
                name="Net Worth"
                stroke="#14b8a6"
                strokeWidth={3}
                fill="url(#netWorthGradient)"
                dot={{ r: 4, fill: '#14b8a6' }}
                activeDot={{ r: 6, fill: '#14b8a6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
