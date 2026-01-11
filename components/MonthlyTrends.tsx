'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { Transaction } from '@/lib/types'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO, isSameDay, isSameMonth, isSameYear, getYear } from 'date-fns'
import { categorizeTransaction } from '@/lib/analyzer'
import { getChartPreferences, saveChartPreferences, type ChartPreferences } from '@/lib/db'
import { Filter, X, ChevronLeft, ZoomIn } from 'lucide-react'

interface MonthlyStackedChartProps {
  transactions: Transaction[]
}

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface ZoomState {
  level: Granularity
  selectedYear?: string // yyyy
  selectedMonth?: string // yyyy-MM
  selectedWeek?: string // yyyy-MM-dd (start of week)
}

const CATEGORY_COLORS: Record<string, string> = {
  'Restaurants & Dining': '#ef4444',
  'Groceries': '#f97316',
  'Transportation': '#eab308',
  'Travel & Accommodation': '#22c55e',
  'Shopping': '#14b8a6',
  'Health & Beauty': '#3b82f6',
  'Digital Services': '#8b5cf6',
  'Insurance & Financial': '#ec4899',
  'Entertainment': '#6366f1',
  'Fuel': '#84cc16',
  'Fitness & Sports': '#06b6d4',
  'Utilities & Telecom': '#f43f5e',
  'Professional Services': '#a855f7',
  'Government & Taxes': '#10b981',
  'Crypto & Investments': '#f59e0b',
  'Other': '#9ca3af',
}

interface PeriodData {
  label: string
  periodKey: string
  segments: { category: string; value: number }[]
  total: number
}

interface ChartDataPoint {
  label: string
  periodKey: string
  [key: string]: string | number | { category: string; value: number }[]
}

export function MonthlyTrends({ transactions }: MonthlyStackedChartProps) {
  const [zoomState, setZoomState] = useState<ZoomState>({ level: 'yearly' })
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set())
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  // Load saved preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await getChartPreferences()
        if (prefs) {
          setZoomState({
            level: prefs.granularity,
            selectedYear: prefs.selectedYear,
            selectedMonth: prefs.selectedMonth,
            selectedWeek: prefs.selectedWeek,
          })
          setExcludedCategories(new Set(prefs.excludedCategories))
          setShowFilterPanel(prefs.showFilterPanel)
        }
      } catch (err) {
        console.error('Failed to load chart preferences:', err)
      } finally {
        setPreferencesLoaded(true)
      }
    }
    loadPreferences()
  }, [])

  // Save preferences when state changes
  const savePreferences = useCallback(async (
    newZoomState: ZoomState,
    newExcludedCategories: Set<string>,
    newShowFilterPanel: boolean
  ) => {
    if (!preferencesLoaded) return
    try {
      await saveChartPreferences({
        granularity: newZoomState.level,
        selectedYear: newZoomState.selectedYear,
        selectedMonth: newZoomState.selectedMonth,
        selectedWeek: newZoomState.selectedWeek,
        excludedCategories: Array.from(newExcludedCategories),
        showFilterPanel: newShowFilterPanel,
      })
    } catch (err) {
      console.error('Failed to save chart preferences:', err)
    }
  }, [preferencesLoaded])

  // Wrapper functions to update state and save
  const updateZoomState = useCallback((newState: ZoomState) => {
    setZoomState(newState)
    savePreferences(newState, excludedCategories, showFilterPanel)
  }, [excludedCategories, showFilterPanel, savePreferences])

  const updateExcludedCategories = useCallback((newCategories: Set<string>) => {
    setExcludedCategories(newCategories)
    savePreferences(zoomState, newCategories, showFilterPanel)
  }, [zoomState, showFilterPanel, savePreferences])

  const updateShowFilterPanel = useCallback((show: boolean) => {
    setShowFilterPanel(show)
    savePreferences(zoomState, excludedCategories, show)
  }, [zoomState, excludedCategories, savePreferences])

  // Get all unique categories from transactions
  const allCategories = useMemo(() => {
    const categories = new Set<string>()
    transactions
      .filter((t) => (t.debit || 0) > 0)
      .forEach((t) => {
        categories.add(categorizeTransaction(t))
      })
    return Array.from(categories).sort()
  }, [transactions])

  // Get transactions for selected day
  const dayTransactions = useMemo(() => {
    if (!selectedDay) return []
    const selectedDate = parseISO(selectedDay)
    return transactions
      .filter((t) => {
        if ((t.debit || 0) <= 0) return false
        if (!t.purchaseDate || isNaN(t.purchaseDate.getTime())) return false
        return isSameDay(t.purchaseDate, selectedDate)
      })
      .map((t) => ({
        ...t,
        category: categorizeTransaction(t),
      }))
      .sort((a, b) => (b.debit || 0) - (a.debit || 0))
  }, [selectedDay, transactions])

  const { chartData, maxCategories } = useMemo(() => {
    const periodData = new Map<string, Record<string, number>>()

    // Filter transactions based on zoom level
    let filteredTransactions = transactions.filter((t) => (t.debit || 0) > 0)

    if (zoomState.level === 'monthly' && zoomState.selectedYear) {
      const selectedYearNum = parseInt(zoomState.selectedYear)
      filteredTransactions = filteredTransactions.filter((t) => {
        if (!t.purchaseDate || isNaN(t.purchaseDate.getTime())) return false
        return getYear(t.purchaseDate) === selectedYearNum
      })
    } else if (zoomState.level === 'weekly' && zoomState.selectedMonth) {
      const selectedMonthDate = new Date(zoomState.selectedMonth + '-01')
      filteredTransactions = filteredTransactions.filter((t) => {
        if (!t.purchaseDate || isNaN(t.purchaseDate.getTime())) return false
        // Only include transactions that are actually in the selected month
        return isSameMonth(t.purchaseDate, selectedMonthDate)
      })
    } else if (zoomState.level === 'daily' && zoomState.selectedWeek) {
      const weekStart = parseISO(zoomState.selectedWeek)
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const selectedMonthDate = zoomState.selectedMonth ? new Date(zoomState.selectedMonth + '-01') : null
      filteredTransactions = filteredTransactions.filter((t) => {
        if (!t.purchaseDate || isNaN(t.purchaseDate.getTime())) return false
        const inWeek = isWithinInterval(t.purchaseDate, { start: weekStart, end: weekEnd })
        // If we came from a month view, only show days from that month
        if (selectedMonthDate) {
          return inWeek && isSameMonth(t.purchaseDate, selectedMonthDate)
        }
        return inWeek
      })
    }

    // Group by period
    filteredTransactions.forEach((transaction) => {
      if (!transaction.purchaseDate || isNaN(transaction.purchaseDate.getTime())) {
        return
      }

      const category = categorizeTransaction(transaction)
      if (excludedCategories.has(category)) {
        return
      }

      let periodKey: string
      switch (zoomState.level) {
        case 'daily':
          periodKey = format(transaction.purchaseDate, 'yyyy-MM-dd')
          break
        case 'weekly':
          periodKey = format(startOfWeek(transaction.purchaseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd')
          break
        case 'monthly':
          periodKey = format(transaction.purchaseDate, 'yyyy-MM')
          break
        case 'yearly':
        default:
          periodKey = format(transaction.purchaseDate, 'yyyy')
      }

      if (!periodData.has(periodKey)) {
        periodData.set(periodKey, {})
      }

      const periodRecord = periodData.get(periodKey)!
      periodRecord[category] = (periodRecord[category] || 0) + (transaction.debit || 0)
    })

    // Find max categories
    let maxCats = 0
    periodData.forEach((categories) => {
      maxCats = Math.max(maxCats, Object.keys(categories).length)
    })

    // Format labels based on zoom level
    const formatLabel = (key: string): string => {
      switch (zoomState.level) {
        case 'daily':
          return format(new Date(key), 'EEE, MMM d')
        case 'weekly':
          const weekStart = new Date(key)
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

          // If we have a selected month, adjust the label to show only days in that month
          if (zoomState.selectedMonth) {
            const selectedMonthDate = new Date(zoomState.selectedMonth + '-01')
            const monthStart = startOfMonth(selectedMonthDate)
            const monthEnd = endOfMonth(selectedMonthDate)

            // Calculate the actual start/end within the selected month
            const displayStart = weekStart < monthStart ? monthStart : weekStart
            const displayEnd = weekEnd > monthEnd ? monthEnd : weekEnd

            if (format(displayStart, 'MMM') === format(displayEnd, 'MMM')) {
              return `${format(displayStart, 'MMM d')} - ${format(displayEnd, 'd')}`
            }
            return `${format(displayStart, 'MMM d')} - ${format(displayEnd, 'MMM d')}`
          }

          return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd')}`
        case 'monthly':
          return format(new Date(key + '-01'), 'MMM yyyy')
        case 'yearly':
        default:
          return key
      }
    }

    // Sort and create chart data
    const sortedPeriodData: PeriodData[] = Array.from(periodData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([periodKey, categories]) => {
        const segments = Object.entries(categories)
          .map(([category, value]) => ({ category, value }))
          .sort((a, b) => b.value - a.value)

        return {
          periodKey,
          label: formatLabel(periodKey),
          segments,
          total: segments.reduce((sum, s) => sum + s.value, 0),
        }
      })

    const data: ChartDataPoint[] = sortedPeriodData.map((pd) => {
      const dataPoint: ChartDataPoint = {
        label: pd.label,
        periodKey: pd.periodKey,
        segments: pd.segments,
      }

      pd.segments.forEach((segment, index) => {
        dataPoint[`slot${index}`] = segment.value
        dataPoint[`slot${index}Category`] = segment.category
      })

      return dataPoint
    })

    return { chartData: data, maxCategories: maxCats }
  }, [transactions, zoomState, excludedCategories])

  const handleBarClick = (data: ChartDataPoint) => {
    if (zoomState.level === 'yearly') {
      // Zoom into months of this year
      updateZoomState({
        level: 'monthly',
        selectedYear: data.periodKey,
      })
    } else if (zoomState.level === 'monthly') {
      // Zoom into weeks of this month
      updateZoomState({
        level: 'weekly',
        selectedYear: zoomState.selectedYear,
        selectedMonth: data.periodKey,
      })
    } else if (zoomState.level === 'weekly') {
      // Zoom into days of this week
      updateZoomState({
        level: 'daily',
        selectedYear: zoomState.selectedYear,
        selectedMonth: zoomState.selectedMonth,
        selectedWeek: data.periodKey,
      })
    } else if (zoomState.level === 'daily') {
      // Show day's transactions
      setSelectedDay(data.periodKey)
    }
  }

  const handleZoomOut = () => {
    if (zoomState.level === 'daily') {
      updateZoomState({
        level: 'weekly',
        selectedYear: zoomState.selectedYear,
        selectedMonth: zoomState.selectedMonth,
      })
    } else if (zoomState.level === 'weekly') {
      updateZoomState({
        level: 'monthly',
        selectedYear: zoomState.selectedYear,
      })
    } else if (zoomState.level === 'monthly') {
      updateZoomState({ level: 'yearly' })
    }
  }

  const resetZoom = () => {
    updateZoomState({ level: 'yearly' })
  }

  const toggleCategory = (category: string) => {
    const next = new Set(excludedCategories)
    if (next.has(category)) {
      next.delete(category)
    } else {
      next.add(category)
    }
    updateExcludedCategories(next)
  }

  const clearFilters = () => {
    updateExcludedCategories(new Set())
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }>; label?: string }) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    const segments = data.segments as { category: string; value: number }[]

    return (
      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 shadow-lg max-h-80 overflow-auto">
        <p className="font-bold text-gray-900 mb-2">{label}</p>
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-2 text-sm py-1">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[segment.category] || '#9ca3af' }}
            />
            <span className="text-gray-600">{segment.category}:</span>
            <span className="font-semibold">{formatCurrency(segment.value)}</span>
          </div>
        ))}
        <p className="text-xs text-purple-600 mt-2 pt-2 border-t border-gray-100">
          {zoomState.level === 'daily' ? 'Click to see transactions' : 'Click to zoom in'}
        </p>
      </div>
    )
  }

  const getTitle = () => {
    if (zoomState.level === 'daily' && zoomState.selectedWeek) {
      const weekStart = new Date(zoomState.selectedWeek)
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      return `Daily Spending: ${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`
    }
    if (zoomState.level === 'weekly' && zoomState.selectedMonth) {
      return `Weekly Spending: ${format(new Date(zoomState.selectedMonth + '-01'), 'MMMM yyyy')}`
    }
    if (zoomState.level === 'monthly' && zoomState.selectedYear) {
      return `Monthly Spending: ${zoomState.selectedYear}`
    }
    return 'Yearly Spending by Category'
  }

  const getBreadcrumb = () => {
    const parts: { label: string; onClick?: () => void }[] = []

    parts.push({
      label: 'All Years',
      onClick: zoomState.level !== 'yearly' ? resetZoom : undefined,
    })

    if (zoomState.selectedYear) {
      parts.push({
        label: zoomState.selectedYear,
        onClick: zoomState.level !== 'monthly' ? () => updateZoomState({ level: 'monthly', selectedYear: zoomState.selectedYear }) : undefined,
      })
    }

    if (zoomState.selectedMonth) {
      parts.push({
        label: format(new Date(zoomState.selectedMonth + '-01'), 'MMMM'),
        onClick: zoomState.level === 'daily' ? () => updateZoomState({ level: 'weekly', selectedYear: zoomState.selectedYear, selectedMonth: zoomState.selectedMonth }) : undefined,
      })
    }

    if (zoomState.selectedWeek) {
      const weekStart = new Date(zoomState.selectedWeek)
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      parts.push({
        label: `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd')}`,
      })
    }

    return parts
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-50">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{getTitle()}</h2>

          {/* Breadcrumb Navigation */}
          {zoomState.level !== 'yearly' && (
            <div className="flex items-center gap-2 text-sm">
              {getBreadcrumb().map((part, index) => (
                <span key={index} className="flex items-center gap-2">
                  {index > 0 && <span className="text-gray-400">/</span>}
                  {part.onClick ? (
                    <button
                      onClick={part.onClick}
                      className="text-purple-600 hover:text-purple-800 hover:underline"
                    >
                      {part.label}
                    </button>
                  ) : (
                    <span className="text-gray-600">{part.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {zoomState.level === 'yearly' && (
            <p className="text-gray-600 flex items-center gap-2">
              <ZoomIn className="w-4 h-4" />
              Click any bar to zoom in
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom Out Button */}
          {zoomState.level !== 'yearly' && (
            <button
              onClick={handleZoomOut}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {/* Filter Button */}
          <button
            onClick={() => updateShowFilterPanel(!showFilterPanel)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              excludedCategories.size > 0
                ? 'bg-purple-100 text-purple-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter
            {excludedCategories.size > 0 && (
              <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                {excludedCategories.size}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Filter Categories</span>
            {excludedCategories.size > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {allCategories.map((category) => {
              const isExcluded = excludedCategories.has(category)
              return (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isExcluded
                      ? 'bg-gray-200 text-gray-400 line-through'
                      : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-sm ${isExcluded ? 'opacity-30' : ''}`}
                    style={{ backgroundColor: CATEGORY_COLORS[category] || '#9ca3af' }}
                  />
                  {category}
                  {isExcluded && <X className="w-3 h-3" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {excludedCategories.size > 0 && !showFilterPanel && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-500">Excluded:</span>
          {Array.from(excludedCategories).map((category) => (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200"
            >
              {category}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      )}

      <div className="h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            onClick={(e) => {
              if (e && e.activePayload && e.activePayload[0]) {
                handleBarClick(e.activePayload[0].payload as ChartDataPoint)
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              stroke="#9ca3af"
              tickLine={false}
              interval={0}
              angle={zoomState.level === 'daily' ? -45 : 0}
              textAnchor={zoomState.level === 'daily' ? 'end' : 'middle'}
              height={zoomState.level === 'daily' ? 80 : 30}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#6b7280' }}
              stroke="#9ca3af"
              tickLine={false}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            {Array.from({ length: maxCategories }).map((_, slotIndex) => (
              <Bar
                key={`slot${slotIndex}`}
                dataKey={`slot${slotIndex}`}
                stackId="spending"
                radius={slotIndex === 0 ? [0, 0, 0, 0] : slotIndex === maxCategories - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              >
                {chartData.map((entry, entryIndex) => (
                  <Cell
                    key={`cell-${entryIndex}`}
                    fill={CATEGORY_COLORS[entry[`slot${slotIndex}Category`] as string] || '#9ca3af'}
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        {Object.entries(CATEGORY_COLORS)
          .filter(([category]) => !excludedCategories.has(category))
          .slice(0, 12)
          .map(([category, color]) => (
            <div key={category} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="text-gray-600">{category}</span>
            </div>
          ))}
      </div>

      {/* Day Transactions Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDay(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {format(parseISO(selectedDay), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    {dayTransactions.length} transaction{dayTransactions.length !== 1 ? 's' : ''} • Total: {formatCurrency(dayTransactions.reduce((sum, t) => sum + (t.debit || 0), 0))}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {dayTransactions.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No transactions for this day</p>
              ) : (
                <div className="space-y-3">
                  {dayTransactions.map((t, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[t.category] || '#9ca3af' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{t.bookingText}</p>
                        <p className="text-sm text-gray-500">{t.category}</p>
                      </div>
                      <p className="font-bold text-red-600 flex-shrink-0">
                        {formatCurrency(t.debit || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
