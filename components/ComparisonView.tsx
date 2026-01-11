'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, GitCompare, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getWeek } from 'date-fns'
import { getAllAnalyses, type SavedAnalysis } from '@/lib/db'
import { categorizeTransaction } from '@/lib/analyzer'
import type { Transaction } from '@/lib/types'

interface ComparisonViewProps {
  isOpen: boolean
  onClose: () => void
  currentTransactions?: Transaction[]
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

export function ComparisonView({ isOpen, onClose, currentTransactions }: ComparisonViewProps) {
  const [analyses, setAnalyses] = useState<SavedAnalysis[]>([])
  const [selectedAnalysis, setSelectedAnalysis] = useState<SavedAnalysis | null>(null)
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const [selectedPeriod1, setSelectedPeriod1] = useState<string>('')
  const [selectedPeriod2, setSelectedPeriod2] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      loadAnalyses()
    }
  }, [isOpen])

  const loadAnalyses = async () => {
    setLoading(true)
    try {
      const data = await getAllAnalyses()
      setAnalyses(data)

      // If we have current transactions, create a virtual "current" analysis
      if (currentTransactions && currentTransactions.length > 0) {
        setSelectedAnalysis({
          id: -1,
          name: 'Current Analysis',
          fileName: 'current',
          uploadDate: new Date(),
          transactions: currentTransactions,
          report: null as any, // Not needed for comparison
        })
      } else if (data.length > 0) {
        setSelectedAnalysis(data[0])
      }
    } catch (err) {
      console.error('Failed to load analyses:', err)
    } finally {
      setLoading(false)
    }
  }

  // Generate available periods from transactions
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

    // Sort by date
    return periods.sort((a, b) => a.start.getTime() - b.start.getTime())
  }, [selectedAnalysis, periodType])

  // Auto-select periods when available
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

  // Get transactions for a period
  const getTransactionsForPeriod = (periodKey: string): Transaction[] => {
    if (!selectedAnalysis) return []

    const period = availablePeriods.find((p) => p.key === periodKey)
    if (!period) return []

    return selectedAnalysis.transactions.filter((t) => {
      const date = new Date(t.purchaseDate)
      if (isNaN(date.getTime())) return false
      return date >= period.start && date <= period.end
    })
  }

  // Calculate comparison data
  const comparisonData = useMemo(() => {
    if (!selectedPeriod1 || !selectedPeriod2) return null

    const transactions1 = getTransactionsForPeriod(selectedPeriod1)
    const transactions2 = getTransactionsForPeriod(selectedPeriod2)

    const period1Info = availablePeriods.find((p) => p.key === selectedPeriod1)
    const period2Info = availablePeriods.find((p) => p.key === selectedPeriod2)

    // Calculate totals
    const total1 = transactions1.reduce((sum, t) => sum + (t.debit || 0), 0)
    const total2 = transactions2.reduce((sum, t) => sum + (t.debit || 0), 0)
    const totalDiff = total2 - total1
    const totalPercentChange = total1 > 0 ? ((total2 - total1) / total1) * 100 : 0

    // Category breakdown
    const categoryMap1 = new Map<string, number>()
    const categoryMap2 = new Map<string, number>()

    transactions1.forEach((t) => {
      const cat = categorizeTransaction(t)
      categoryMap1.set(cat, (categoryMap1.get(cat) || 0) + (t.debit || 0))
    })

    transactions2.forEach((t) => {
      const cat = categorizeTransaction(t)
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
  }, [selectedPeriod1, selectedPeriod2, selectedAnalysis, availablePeriods])

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!comparisonData) return []
    return comparisonData.categoryComparisons.slice(0, 8).map((c) => ({
      name: c.category.length > 10 ? c.category.slice(0, 10) + '...' : c.category,
      fullName: c.category,
      period1: c.period1,
      period2: c.period2,
    }))
  }, [comparisonData])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <GitCompare className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Compare Periods</h2>
              <p className="text-sm text-blue-100">Compare spending between time periods</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-white/20">
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Analysis & Period Type Selection */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Analysis Selector */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Data Source
                  </label>
                  <div className="relative">
                    <select
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
                            report: null as any,
                          })
                        } else {
                          const selected = analyses.find((a) => a.id === id)
                          setSelectedAnalysis(selected || null)
                        }
                      }}
                      className="w-full cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white p-3 pr-10 transition-colors hover:border-blue-300 focus:border-blue-500 focus:outline-none"
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
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                {/* Period Type */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Compare By
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPeriodType('monthly')}
                      className={`flex-1 rounded-xl px-4 py-3 font-semibold transition-all ${
                        periodType === 'monthly'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setPeriodType('weekly')}
                      className={`flex-1 rounded-xl px-4 py-3 font-semibold transition-all ${
                        periodType === 'weekly'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Weekly
                    </button>
                  </div>
                </div>
              </div>

              {/* Period Selectors */}
              {availablePeriods.length < 2 ? (
                <div className="rounded-xl bg-gray-50 py-8 text-center">
                  <GitCompare className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="font-medium text-gray-600">Not enough data</p>
                  <p className="text-sm text-gray-500">
                    Need at least 2 {periodType === 'monthly' ? 'months' : 'weeks'} of data to
                    compare
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Period 1
                      </label>
                      <div className="relative">
                        <select
                          value={selectedPeriod1}
                          onChange={(e) => setSelectedPeriod1(e.target.value)}
                          className="w-full cursor-pointer appearance-none rounded-xl border-2 border-blue-200 bg-blue-50 p-3 pr-10 transition-colors hover:border-blue-300 focus:border-blue-500 focus:outline-none"
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
                      <label className="mb-2 block text-sm font-semibold text-gray-700">
                        Period 2
                      </label>
                      <div className="relative">
                        <select
                          value={selectedPeriod2}
                          onChange={(e) => setSelectedPeriod2(e.target.value)}
                          className="w-full cursor-pointer appearance-none rounded-xl border-2 border-purple-200 bg-purple-50 p-3 pr-10 transition-colors hover:border-purple-300 focus:border-purple-500 focus:outline-none"
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
                        <div className="rounded-2xl bg-gray-50 p-5">
                          <h3 className="mb-4 text-lg font-semibold text-gray-900">
                            Category Comparison
                          </h3>
                          <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="#e5e7eb"
                                  horizontal={true}
                                  vertical={false}
                                />
                                <XAxis
                                  type="number"
                                  tick={{ fontSize: 12, fill: '#6b7280' }}
                                  tickFormatter={(value) =>
                                    value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                                  }
                                />
                                <YAxis
                                  type="category"
                                  dataKey="name"
                                  tick={{ fontSize: 12, fill: '#6b7280' }}
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
                                    backgroundColor: 'white',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '12px',
                                    padding: '12px',
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
                              <span className="text-sm text-gray-600">
                                {comparisonData.period1Label}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded bg-purple-500"></div>
                              <span className="text-sm text-gray-600">
                                {comparisonData.period2Label}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Detailed Category Changes */}
                      <div className="rounded-2xl bg-gray-50 p-5">
                        <h3 className="mb-4 text-lg font-semibold text-gray-900">
                          Category Changes
                        </h3>
                        <div className="max-h-[300px] space-y-2 overflow-y-auto">
                          {comparisonData.categoryComparisons.map((cat) => (
                            <div
                              key={cat.category}
                              className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-gray-900">
                                  {cat.category}
                                </p>
                                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                                  <span className="font-medium text-blue-600">
                                    {formatCurrency(cat.period1)}
                                  </span>
                                  <span>→</span>
                                  <span className="font-medium text-purple-600">
                                    {formatCurrency(cat.period2)}
                                  </span>
                                </div>
                              </div>
                              <div
                                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm ${
                                  cat.difference > 0
                                    ? 'bg-red-100 text-red-700'
                                    : cat.difference < 0
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-700'
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
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
