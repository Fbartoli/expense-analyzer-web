'use client'

import { useState, useEffect, useMemo } from 'react'
import { X, GitCompare, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameMonth, isSameWeek, getWeek, getYear } from 'date-fns'
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

    transactions.forEach(t => {
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

    const period = availablePeriods.find(p => p.key === periodKey)
    if (!period) return []

    return selectedAnalysis.transactions.filter(t => {
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

    const period1Info = availablePeriods.find(p => p.key === selectedPeriod1)
    const period2Info = availablePeriods.find(p => p.key === selectedPeriod2)

    // Calculate totals
    const total1 = transactions1.reduce((sum, t) => sum + (t.debit || 0), 0)
    const total2 = transactions2.reduce((sum, t) => sum + (t.debit || 0), 0)
    const totalDiff = total2 - total1
    const totalPercentChange = total1 > 0 ? ((total2 - total1) / total1) * 100 : 0

    // Category breakdown
    const categoryMap1 = new Map<string, number>()
    const categoryMap2 = new Map<string, number>()

    transactions1.forEach(t => {
      const cat = categorizeTransaction(t)
      categoryMap1.set(cat, (categoryMap1.get(cat) || 0) + (t.debit || 0))
    })

    transactions2.forEach(t => {
      const cat = categorizeTransaction(t)
      categoryMap2.set(cat, (categoryMap2.get(cat) || 0) + (t.debit || 0))
    })

    const allCategories = new Set([...categoryMap1.keys(), ...categoryMap2.keys()])

    const categoryComparisons: CategoryComparison[] = Array.from(allCategories).map(category => {
      const amount1 = categoryMap1.get(category) || 0
      const amount2 = categoryMap2.get(category) || 0
      const diff = amount2 - amount1
      const percentChange = amount1 > 0 ? ((amount2 - amount1) / amount1) * 100 : (amount2 > 0 ? 100 : 0)

      return {
        category,
        period1: amount1,
        period2: amount2,
        difference: diff,
        percentChange,
      }
    }).sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))

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
    return comparisonData.categoryComparisons.slice(0, 8).map(c => ({
      name: c.category.length > 10 ? c.category.slice(0, 10) + '...' : c.category,
      fullName: c.category,
      period1: c.period1,
      period2: c.period2,
    }))
  }, [comparisonData])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <GitCompare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Compare Periods</h2>
              <p className="text-blue-100 text-sm">Compare spending between time periods</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Analysis & Period Type Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Analysis Selector */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Data Source</label>
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
                          const selected = analyses.find(a => a.id === id)
                          setSelectedAnalysis(selected || null)
                        }
                      }}
                      className="w-full p-3 pr-10 border-2 border-gray-200 rounded-xl bg-white appearance-none cursor-pointer hover:border-blue-300 focus:border-blue-500 focus:outline-none transition-colors"
                    >
                      {currentTransactions && currentTransactions.length > 0 && (
                        <option value={-1}>Current Analysis</option>
                      )}
                      {analyses.map(analysis => (
                        <option key={analysis.id} value={analysis.id}>
                          {analysis.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Period Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Compare By</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPeriodType('monthly')}
                      className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                        periodType === 'monthly'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setPeriodType('weekly')}
                      className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
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
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <GitCompare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">Not enough data</p>
                  <p className="text-gray-500 text-sm">
                    Need at least 2 {periodType === 'monthly' ? 'months' : 'weeks'} of data to compare
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Period 1</label>
                      <div className="relative">
                        <select
                          value={selectedPeriod1}
                          onChange={(e) => setSelectedPeriod1(e.target.value)}
                          className="w-full p-3 pr-10 border-2 border-blue-200 rounded-xl bg-blue-50 appearance-none cursor-pointer hover:border-blue-300 focus:border-blue-500 focus:outline-none transition-colors"
                        >
                          {availablePeriods.map(period => (
                            <option key={period.key} value={period.key}>
                              {period.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Period 2</label>
                      <div className="relative">
                        <select
                          value={selectedPeriod2}
                          onChange={(e) => setSelectedPeriod2(e.target.value)}
                          className="w-full p-3 pr-10 border-2 border-purple-200 rounded-xl bg-purple-50 appearance-none cursor-pointer hover:border-purple-300 focus:border-purple-500 focus:outline-none transition-colors"
                        >
                          {availablePeriods.map(period => (
                            <option key={period.key} value={period.key}>
                              {period.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {comparisonData && (
                    <>
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                          <p className="text-blue-100 text-xs font-semibold mb-1 uppercase tracking-wide">
                            {comparisonData.period1Label}
                          </p>
                          <p className="text-2xl font-bold">{formatCurrency(comparisonData.totalSpent1)}</p>
                          <p className="text-blue-200 text-sm mt-1">{comparisonData.transactionCount1} transactions</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
                          <p className="text-purple-100 text-xs font-semibold mb-1 uppercase tracking-wide">
                            {comparisonData.period2Label}
                          </p>
                          <p className="text-2xl font-bold">{formatCurrency(comparisonData.totalSpent2)}</p>
                          <p className="text-purple-200 text-sm mt-1">{comparisonData.transactionCount2} transactions</p>
                        </div>

                        <div className={`rounded-2xl p-5 text-white ${
                          comparisonData.totalDiff > 0
                            ? 'bg-gradient-to-br from-red-500 to-red-600'
                            : comparisonData.totalDiff < 0
                              ? 'bg-gradient-to-br from-green-500 to-green-600'
                              : 'bg-gradient-to-br from-gray-500 to-gray-600'
                        }`}>
                          <p className="text-white/80 text-xs font-semibold mb-1 uppercase tracking-wide">Difference</p>
                          <div className="flex items-center gap-2">
                            {comparisonData.totalDiff > 0 ? (
                              <TrendingUp className="w-5 h-5" />
                            ) : comparisonData.totalDiff < 0 ? (
                              <TrendingDown className="w-5 h-5" />
                            ) : (
                              <Minus className="w-5 h-5" />
                            )}
                            <p className="text-2xl font-bold">{formatCurrency(Math.abs(comparisonData.totalDiff))}</p>
                          </div>
                          <p className="text-white/80 text-sm mt-1">
                            {formatPercentChange(comparisonData.totalPercentChange)} {comparisonData.totalDiff > 0 ? 'more' : comparisonData.totalDiff < 0 ? 'less' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Category Comparison Chart */}
                      {chartData.length > 0 && (
                        <div className="bg-gray-50 rounded-2xl p-5">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Comparison</h3>
                          <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={true} vertical={false} />
                                <XAxis
                                  type="number"
                                  tick={{ fontSize: 12, fill: '#6b7280' }}
                                  tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
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
                                    name === 'period1' ? comparisonData.period1Label : comparisonData.period2Label
                                  ]}
                                  labelFormatter={(label) => {
                                    const item = chartData.find(d => d.name === label)
                                    return item?.fullName || label
                                  }}
                                  contentStyle={{
                                    backgroundColor: 'white',
                                    border: '2px solid #e5e7eb',
                                    borderRadius: '12px',
                                    padding: '12px',
                                  }}
                                />
                                <Bar dataKey="period1" name="period1" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="period2" name="period2" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex items-center justify-center gap-6 mt-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-blue-500"></div>
                              <span className="text-sm text-gray-600">{comparisonData.period1Label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded bg-purple-500"></div>
                              <span className="text-sm text-gray-600">{comparisonData.period2Label}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Detailed Category Changes */}
                      <div className="bg-gray-50 rounded-2xl p-5">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Changes</h3>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {comparisonData.categoryComparisons.map((cat) => (
                            <div
                              key={cat.category}
                              className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100"
                            >
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm">{cat.category}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                  <span className="text-blue-600 font-medium">{formatCurrency(cat.period1)}</span>
                                  <span>→</span>
                                  <span className="text-purple-600 font-medium">{formatCurrency(cat.period2)}</span>
                                </div>
                              </div>
                              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm ${
                                cat.difference > 0
                                  ? 'bg-red-100 text-red-700'
                                  : cat.difference < 0
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-100 text-gray-700'
                              }`}>
                                {cat.difference > 0 ? (
                                  <TrendingUp className="w-3.5 h-3.5" />
                                ) : cat.difference < 0 ? (
                                  <TrendingDown className="w-3.5 h-3.5" />
                                ) : (
                                  <Minus className="w-3.5 h-3.5" />
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
