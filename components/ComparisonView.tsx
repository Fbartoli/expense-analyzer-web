'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { GitCompare, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useChartTheme } from '@/lib/use-chart-theme'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getWeek } from 'date-fns'
import { getAllAnalyses, type SavedAnalysis } from '@/lib/db'
import { categorizeTransaction } from '@/lib/analyzer'
import type { Transaction, ExpenseReport } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

interface ComparisonViewProps {
  isOpen: boolean
  onClose: () => void
  currentTransactions?: Transaction[]
  resolveCategory?: (raw: string) => string
}

type PeriodType = 'monthly' | 'weekly'

interface Period {
  key: string
  label: string
  start: Date
  end: Date
}

interface CategoryComparison {
  category: string
  period1: number
  period2: number
  difference: number
  percentChange: number
}

export function ComparisonView({
  isOpen,
  onClose,
  currentTransactions,
  resolveCategory,
}: ComparisonViewProps) {
  const chartTheme = useChartTheme()
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null)
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const [selectedPeriod1, setSelectedPeriod1] = useState<string>('')
  const [selectedPeriod2, setSelectedPeriod2] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const loadAnalyses = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllAnalyses()
      setAnalyses(data)

      if (currentTransactions && currentTransactions.length > 0) {
        setSelectedAnalysis({
          id: -1,
          name: 'Current Analysis',
          fileName: 'current',
          uploadDate: new Date(),
          transactions: currentTransactions,
          report: null as unknown as ExpenseReport,
        })
      } else if (data.length > 0) {
        setSelectedAnalysis(data[0])
      }
    } catch (err) {
      console.error('Failed to load analyses:', err)
    } finally {
      setLoading(false)
    }
  }, [currentTransactions])

  useEffect(() => {
    if (isOpen) {
      loadAnalyses()
    }
  }, [isOpen, loadAnalyses])

  const availablePeriods = useMemo((): Period[] => {
    if (!selectedAnalysis) return []

    const transactions = selectedAnalysis.transactions
    const periods: Period[] = []
    const seenKeys = new Set<string>()

    transactions.forEach((t) => {
      const date = new Date(t.purchaseDate)
      if (isNaN(date.getTime())) return

      if (periodType === 'monthly') {
        const key = format(date, 'yyyy-MM')
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          periods.push({
            key,
            label: format(date, 'MMMM yyyy'),
            start: startOfMonth(date),
            end: endOfMonth(date),
          })
        }
      } else {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 })
        const key = format(weekStart, 'yyyy-MM-dd')
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          const weekEnd = endOfWeek(date, { weekStartsOn: 1 })
          periods.push({
            key,
            label: `Week ${getWeek(date)} (${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')})`,
            start: weekStart,
            end: weekEnd,
          })
        }
      }
    })

    return periods.sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [selectedAnalysis, periodType])

  useEffect(() => {
    if (availablePeriods.length >= 2) {
      setSelectedPeriod1(availablePeriods[0].key)
      setSelectedPeriod2(availablePeriods[1].key)
    } else if (availablePeriods.length === 1) {
      setSelectedPeriod1(availablePeriods[0].key)
      setSelectedPeriod2('')
    } else {
      setSelectedPeriod1('')
      setSelectedPeriod2('')
    }
  }, [availablePeriods])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const formatPercentChange = (percent: number) => {
    const sign = percent > 0 ? '+' : ''
    return `${sign}${percent.toFixed(1)}%`
  }

  const getTransactionsForPeriod = useCallback(
    (periodKey: string): Transaction[] => {
      if (!selectedAnalysis) return []

      const period = availablePeriods.find((p) => p.key === periodKey)
      if (!period) return []

      return selectedAnalysis.transactions.filter((t) => {
        const date = new Date(t.purchaseDate)
        if (isNaN(date.getTime())) return false
        return date >= period.start && date <= period.end
      })
    },
    [selectedAnalysis, availablePeriods]
  )

  const comparisonData = useMemo(() => {
    if (!selectedPeriod1 || !selectedPeriod2) return null

    const transactions1 = getTransactionsForPeriod(selectedPeriod1)
    const transactions2 = getTransactionsForPeriod(selectedPeriod2)

    const period1Info = availablePeriods.find((p) => p.key === selectedPeriod1)
    const period2Info = availablePeriods.find((p) => p.key === selectedPeriod2)

    const total1 = transactions1.reduce((sum, t) => sum + (t.debit || 0), 0)
    const total2 = transactions2.reduce((sum, t) => sum + (t.debit || 0), 0)
    const totalDiff = total2 - total1
    const totalPercentChange = total1 > 0 ? ((total2 - total1) / total1) * 100 : 0

    const categoryMap1 = new Map<string, number>()
    const categoryMap2 = new Map<string, number>()

    transactions1.forEach((t) => {
      const rawCat = t.category || categorizeTransaction(t)
      const cat = resolveCategory?.(rawCat) ?? rawCat
      categoryMap1.set(cat, (categoryMap1.get(cat) || 0) + (t.debit || 0))
    })

    transactions2.forEach((t) => {
      const rawCat = t.category || categorizeTransaction(t)
      const cat = resolveCategory?.(rawCat) ?? rawCat
      categoryMap2.set(cat, (categoryMap2.get(cat) || 0) + (t.debit || 0))
    })

    const allCategories = new Set([...categoryMap1.keys(), ...categoryMap2.keys()])

    const categoryComparisons: CategoryComparison[] = Array.from(allCategories)
      .map((category) => {
        const amount1 = categoryMap1.get(category) || 0
        const amount2 = categoryMap2.get(category) || 0
        const diff = amount2 - amount1
        const percentChange =
          amount1 > 0 ? ((amount2 - amount1) / amount1) * 100 : amount2 > 0 ? 100 : 0

        return {
          category,
          period1: amount1,
          period2: amount2,
          difference: diff,
          percentChange,
        }
      })
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))

    return {
      period1Label: period1Info?.label || '',
      period2Label: period2Info?.label || '',
      totalSpent1: total1,
      totalSpent2: total2,
      totalDiff,
      totalPercentChange,
      transactionCount1: transactions1.length,
      transactionCount2: transactions2.length,
      categoryComparisons,
    }
  }, [
    selectedPeriod1,
    selectedPeriod2,
    availablePeriods,
    getTransactionsForPeriod,
    resolveCategory,
  ])

  const chartData = useMemo(() => {
    if (!comparisonData) return []
    return comparisonData.categoryComparisons.slice(0, 8).map((c) => ({
      name: c.category.length > 10 ? c.category.slice(0, 10) + '...' : c.category,
      fullName: c.category,
      period1: c.period1,
      period2: c.period2,
    }))
  }, [comparisonData])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="border-b bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <GitCompare className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">Compare Periods</DialogTitle>
              <DialogDescription className="text-sm text-blue-100">
                Compare spending between time periods
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Analysis & Period Type Selection */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label
                    htmlFor="comparison-data-source"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Data Source
                  </Label>
                  <div className="relative">
                    <select
                      id="comparison-data-source"
                      value={selectedAnalysis?.id || ''}
                      onChange={(e) => {
                        const id = Number(e.target.value)
                        if (id === -1 && currentTransactions) {
                          setSelectedAnalysis({
                            id: -1,
                            name: 'Current Analysis',
                            fileName: 'current',
                            uploadDate: new Date(),
                            transactions: currentTransactions,
                            report: null as unknown as ExpenseReport,
                          })
                        } else {
                          const selected = analyses.find((a) => a.id === id)
                          setSelectedAnalysis(selected || null)
                        }
                      }}
                      className="w-full cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white p-3 pr-10 transition-colors hover:border-blue-300 focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
                    >
                      {currentTransactions && currentTransactions.length > 0 && (
                        <option value={-1}>Current Analysis</option>
                      )}
                      {analyses.map((analysis) => (
                        <option key={analysis.id} value={analysis.id}>
                          {analysis.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block text-sm font-semibold">Compare By</Label>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setPeriodType('monthly')}
                      variant={periodType === 'monthly' ? 'default' : 'secondary'}
                      className="flex-1"
                    >
                      Monthly
                    </Button>
                    <Button
                      onClick={() => setPeriodType('weekly')}
                      variant={periodType === 'weekly' ? 'default' : 'secondary'}
                      className="flex-1"
                    >
                      Weekly
                    </Button>
                  </div>
                </div>
              </div>

              {/* Period Selectors */}
              {availablePeriods.length < 2 ? (
                <div className="rounded-xl bg-gray-50 py-8 text-center dark:bg-gray-900">
                  <GitCompare className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                  <p className="font-medium text-gray-600 dark:text-gray-400">Not enough data</p>
                  <p className="text-sm text-muted-foreground">
                    Need at least 2 {periodType === 'monthly' ? 'months' : 'weeks'} of data to
                    compare
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label
                        htmlFor="comparison-period-1"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Period 1
                      </Label>
                      <div className="relative">
                        <select
                          id="comparison-period-1"
                          value={selectedPeriod1}
                          onChange={(e) => setSelectedPeriod1(e.target.value)}
                          className="w-full cursor-pointer appearance-none rounded-xl border-2 border-blue-200 bg-blue-50 p-3 pr-10 transition-colors hover:border-blue-300 focus:border-blue-500 focus:outline-none dark:border-blue-800 dark:bg-blue-950"
                        >
                          {availablePeriods.map((period) => (
                            <option key={period.key} value={period.key}>
                              {period.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-blue-400" />
                      </div>
                    </div>

                    <div>
                      <Label
                        htmlFor="comparison-period-2"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Period 2
                      </Label>
                      <div className="relative">
                        <select
                          id="comparison-period-2"
                          value={selectedPeriod2}
                          onChange={(e) => setSelectedPeriod2(e.target.value)}
                          className="w-full cursor-pointer appearance-none rounded-xl border-2 border-purple-200 bg-purple-50 p-3 pr-10 transition-colors hover:border-purple-300 focus:border-purple-500 focus:outline-none dark:border-purple-800 dark:bg-purple-950"
                        >
                          {availablePeriods.map((period) => (
                            <option key={period.key} value={period.key}>
                              {period.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-400" />
                      </div>
                    </div>
                  </div>

                  {comparisonData && (
                    <>
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 text-white">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-100">
                            {comparisonData.period1Label}
                          </p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(comparisonData.totalSpent1)}
                          </p>
                          <p className="mt-1 text-sm text-blue-200">
                            {comparisonData.transactionCount1} transactions
                          </p>
                        </div>

                        <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-5 text-white">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-purple-100">
                            {comparisonData.period2Label}
                          </p>
                          <p className="text-2xl font-bold">
                            {formatCurrency(comparisonData.totalSpent2)}
                          </p>
                          <p className="mt-1 text-sm text-purple-200">
                            {comparisonData.transactionCount2} transactions
                          </p>
                        </div>

                        <div
                          className={`rounded-2xl p-5 text-white ${
                            comparisonData.totalDiff > 0
                              ? 'bg-gradient-to-br from-red-500 to-red-600'
                              : comparisonData.totalDiff < 0
                                ? 'bg-gradient-to-br from-green-500 to-green-600'
                                : 'bg-gradient-to-br from-gray-500 to-gray-600'
                          }`}
                        >
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/80">
                            Difference
                          </p>
                          <div className="flex items-center gap-2">
                            {comparisonData.totalDiff > 0 ? (
                              <TrendingUp className="h-5 w-5" />
                            ) : comparisonData.totalDiff < 0 ? (
                              <TrendingDown className="h-5 w-5" />
                            ) : (
                              <Minus className="h-5 w-5" />
                            )}
                            <p className="text-2xl font-bold">
                              {formatCurrency(Math.abs(comparisonData.totalDiff))}
                            </p>
                          </div>
                          <p className="mt-1 text-sm text-white/80">
                            {formatPercentChange(comparisonData.totalPercentChange)}{' '}
                            {comparisonData.totalDiff > 0
                              ? 'more'
                              : comparisonData.totalDiff < 0
                                ? 'less'
                                : ''}
                          </p>
                        </div>
                      </div>

                      {/* Category Comparison Chart */}
                      {chartData.length > 0 && (
                        <Card className="bg-gray-50 dark:bg-gray-900">
                          <CardContent className="p-5">
                            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                              Category Comparison
                            </h3>
                            <div
                              className="h-[280px]"
                              role="img"
                              aria-label="Bar chart comparing spending between two periods by category."
                            >
                              <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
                                <BarChart
                                  data={chartData}
                                  layout="vertical"
                                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={chartTheme.gridStroke}
                                    horizontal={true}
                                    vertical={false}
                                  />
                                  <XAxis
                                    type="number"
                                    tick={{ fontSize: 12, fill: chartTheme.axisFill }}
                                    stroke={chartTheme.axisStroke}
                                    tickFormatter={(value) =>
                                      value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                                    }
                                  />
                                  <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{ fontSize: 12, fill: chartTheme.axisFill }}
                                    stroke={chartTheme.axisStroke}
                                    width={80}
                                  />
                                  <Tooltip
                                    formatter={(value: number, name: string) => [
                                      formatCurrency(value),
                                      name === 'period1'
                                        ? comparisonData.period1Label
                                        : comparisonData.period2Label,
                                    ]}
                                    labelFormatter={(label) => {
                                      const item = chartData.find((d) => d.name === label)
                                      return item?.fullName || label
                                    }}
                                    contentStyle={{
                                      backgroundColor: chartTheme.tooltipBg,
                                      border: `2px solid ${chartTheme.tooltipBorder}`,
                                      borderRadius: '12px',
                                      padding: '12px',
                                      color: chartTheme.tooltipText,
                                    }}
                                  />
                                  <Bar
                                    dataKey="period1"
                                    name="period1"
                                    fill="#3b82f6"
                                    radius={[0, 4, 4, 0]}
                                  />
                                  <Bar
                                    dataKey="period2"
                                    name="period2"
                                    fill="#8b5cf6"
                                    radius={[0, 4, 4, 0]}
                                  />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                            <div className="mt-3 flex items-center justify-center gap-6">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded bg-blue-500"></div>
                                <span className="text-sm text-muted-foreground">
                                  {comparisonData.period1Label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded bg-purple-500"></div>
                                <span className="text-sm text-muted-foreground">
                                  {comparisonData.period2Label}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Detailed Category Changes */}
                      <Card className="bg-gray-50 dark:bg-gray-900">
                        <CardContent className="p-5">
                          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Category Changes
                          </h3>
                          <div className="space-y-2">
                            {comparisonData.categoryComparisons.map((cat) => (
                              <div
                                key={cat.category}
                                className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-950"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {cat.category}
                                  </p>
                                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="font-medium text-blue-600">
                                      {formatCurrency(cat.period1)}
                                    </span>
                                    <span>→</span>
                                    <span className="font-medium text-purple-600">
                                      {formatCurrency(cat.period2)}
                                    </span>
                                  </div>
                                </div>
                                <Badge
                                  variant="secondary"
                                  className={`flex items-center gap-1.5 ${
                                    cat.difference > 0
                                      ? 'bg-red-100 text-red-700'
                                      : cat.difference < 0
                                        ? 'bg-green-100 text-green-700 dark:text-green-300'
                                        : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                  }`}
                                >
                                  {cat.difference > 0 ? (
                                    <TrendingUp className="h-3.5 w-3.5" />
                                  ) : cat.difference < 0 ? (
                                    <TrendingDown className="h-3.5 w-3.5" />
                                  ) : (
                                    <Minus className="h-3.5 w-3.5" />
                                  )}
                                  <span className="font-semibold">
                                    {formatPercentChange(cat.percentChange)}
                                  </span>
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
