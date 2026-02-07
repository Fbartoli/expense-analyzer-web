'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react'
import { useChartTheme } from '@/lib/use-chart-theme'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { generateForecast } from '@/lib/forecast'
import type { ForecastResult } from '@/lib/forecast'
import type { Transaction, ExpenseReport } from '@/lib/types'

interface SpendingForecastProps {
  transactions: Transaction[]
  report: ExpenseReport
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-CH', {
    style: 'currency',
    currency: 'CHF',
  }).format(amount)

const CONFIDENCE_CONFIG = {
  high: { label: 'High Confidence', className: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium Confidence', className: 'bg-yellow-100 text-yellow-800' },
  low: { label: 'Low Confidence', className: 'bg-red-100 text-red-800' },
} as const

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-red-500" />
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-green-500" />
  return <Minus className="h-4 w-4 text-gray-400" />
}

function DiagonalHatchPattern() {
  return (
    <defs>
      <pattern
        id="forecast-hatch"
        patternUnits="userSpaceOnUse"
        width="6"
        height="6"
        patternTransform="rotate(45)"
      >
        <rect width="6" height="6" fill="#c084fc" />
        <line x1="0" y1="0" x2="0" y2="6" stroke="#a855f7" strokeWidth="2" />
      </pattern>
    </defs>
  )
}

interface ChartDataPoint {
  label: string
  actual?: number
  forecast?: number
  monthKey: string
}

function ForecastChart({ forecast }: { forecast: ForecastResult }) {
  const chartTheme = useChartTheme()
  const chartData: ChartDataPoint[] = useMemo(() => {
    // Show last 6 historical + all forecast months
    const histSlice = forecast.historicalMonths.slice(-6)
    const data: ChartDataPoint[] = histSlice.map((m) => ({
      label: m.monthLabel,
      actual: m.totalSpent,
      monthKey: m.monthKey,
    }))
    for (const mf of forecast.monthForecasts) {
      data.push({
        label: mf.monthLabel,
        forecast: mf.totalSpent,
        monthKey: mf.monthKey,
      })
    }
    return data
  }, [forecast])

  // Index where forecast starts (for reference line)
  const lastHistIdx = forecast.historicalMonths.slice(-6).length - 1
  const refLabel = chartData[lastHistIdx]?.label

  return (
    <div
      className="h-[350px]"
      role="img"
      aria-label="Bar chart showing spending forecast for the next 3 months."
    >
      <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <DiagonalHatchPattern />
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: chartTheme.axisFill }}
            stroke={chartTheme.axisStroke}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: chartTheme.axisFill }}
            stroke={chartTheme.axisStroke}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrency(value),
              name === 'actual' ? 'Actual' : 'Forecast',
            ]}
            contentStyle={{
              borderRadius: '12px',
              border: `2px solid ${chartTheme.tooltipBorder}`,
              backgroundColor: chartTheme.tooltipBg,
              color: chartTheme.tooltipText,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          {refLabel && (
            <ReferenceLine
              x={refLabel}
              stroke="#a855f7"
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: 'Forecast',
                position: 'top',
                fill: '#a855f7',
                fontSize: 11,
              }}
            />
          )}
          <Bar dataKey="actual" fill="#7c3aed" radius={[4, 4, 0, 0]} name="actual" />
          <Bar
            dataKey="forecast"
            fill="url(#forecast-hatch)"
            radius={[4, 4, 0, 0]}
            name="forecast"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SpendingForecast({ transactions, report }: SpendingForecastProps) {
  const forecast = useMemo(
    () => generateForecast(transactions, report.monthlyAnalysis),
    [transactions, report.monthlyAnalysis]
  )

  if (!forecast.dataQuality.hasEnoughData) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Spending Forecast</h2>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not enough data</AlertTitle>
          <AlertDescription>
            Need at least 3 months of transaction history to generate a forecast. Currently have{' '}
            {forecast.dataQuality.totalMonths} month
            {forecast.dataQuality.totalMonths !== 1 ? 's' : ''}.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const confidence = forecast.monthForecasts[0]?.confidence ?? 'low'
  const confConfig = CONFIDENCE_CONFIG[confidence]

  const nextMonthEstimate = forecast.monthForecasts[0]?.totalSpent ?? 0
  const threeMonthTotal = forecast.monthForecasts.reduce((sum, m) => sum + m.totalSpent, 0)

  // Trend percentage: compare next month to last historical month
  const lastHistorical =
    forecast.historicalMonths[forecast.historicalMonths.length - 1]?.totalSpent ?? 0
  const trendPct =
    lastHistorical > 0 ? ((nextMonthEstimate - lastHistorical) / lastHistorical) * 100 : 0
  const trendLabel =
    Math.abs(trendPct) < 2 ? 'Stable' : `${trendPct > 0 ? '+' : ''}${trendPct.toFixed(1)}%/month`

  const topCategories = forecast.categoryForecasts.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Spending Forecast</h2>
        <Badge className={confConfig.className}>{confConfig.label}</Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="border-2 border-gray-50 shadow-lg dark:border-gray-800">
          <CardContent className="p-5">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Next Month Estimate
            </h3>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(nextMonthEstimate)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-50 shadow-lg dark:border-gray-800">
          <CardContent className="p-5">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              3-Month Total
            </h3>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(threeMonthTotal)}</p>
          </CardContent>
        </Card>
        <Card className="border-2 border-gray-50 shadow-lg dark:border-gray-800">
          <CardContent className="p-5">
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Trend
            </h3>
            <p
              className={`text-2xl font-bold ${
                Math.abs(trendPct) < 2
                  ? 'text-gray-600'
                  : trendPct > 0
                    ? 'text-red-500'
                    : 'text-green-500'
              }`}
            >
              {trendLabel}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <ForecastChart forecast={forecast} />

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-purple-600" />
          <span className="text-muted-foreground">Actual</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-sm bg-purple-300"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(168,85,247,0.4) 2px, rgba(168,85,247,0.4) 4px)',
            }}
          />
          <span className="text-muted-foreground">Forecast</span>
        </div>
      </div>

      {/* Category Forecasts */}
      {topCategories.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Top Category Forecasts
          </h3>
          <div className="space-y-2">
            {topCategories.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-900"
              >
                <div className="flex items-center gap-3">
                  <TrendIcon trend={cat.trend} />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {cat.category}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{cat.percentOfTotal.toFixed(1)}%</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(cat.projectedSpent)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
