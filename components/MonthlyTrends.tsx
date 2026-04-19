'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
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
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  isSameDay,
  isSameMonth,
  getYear,
} from 'date-fns'
import { categorizeTransaction } from '@/lib/analyzer'
import { BUILTIN_CATEGORY_COLORS } from '@/lib/category-colors'
import { useChartTheme } from '@/lib/use-chart-theme'
import { getChartPreferences, saveChartPreferences } from '@/lib/db'
import { Filter, X, ChevronLeft, ZoomIn } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface MonthlyStackedChartProps {
  transactions: Transaction[]
  getCategoryColor?: (name: string) => string
}

type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly'

interface ZoomState {
  level: Granularity
  selectedYear?: string
  selectedMonth?: string
  selectedWeek?: string
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

export function MonthlyTrends({ transactions, getCategoryColor }: MonthlyStackedChartProps) {
  const [zoomState, setZoomState] = useState<ZoomState>({ level: 'yearly' })
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set())
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [preferencesLoaded, setPreferencesLoaded] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chartTheme = useChartTheme()

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

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

  const savePreferences = useCallback(
    (newZoomState: ZoomState, newExcludedCategories: Set<string>, newShowFilterPanel: boolean) => {
      if (!preferencesLoaded) return
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
      saveTimerRef.current = setTimeout(async () => {
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
      }, 500)
    },
    [preferencesLoaded]
  )

  const updateZoomState = useCallback(
    (newState: ZoomState) => {
      setZoomState(newState)
      savePreferences(newState, excludedCategories, showFilterPanel)
    },
    [excludedCategories, showFilterPanel, savePreferences]
  )

  const updateExcludedCategories = useCallback(
    (newCategories: Set<string>) => {
      setExcludedCategories(newCategories)
      savePreferences(zoomState, newCategories, showFilterPanel)
    },
    [zoomState, showFilterPanel, savePreferences]
  )

  const updateShowFilterPanel = useCallback(
    (show: boolean) => {
      setShowFilterPanel(show)
      savePreferences(zoomState, excludedCategories, show)
    },
    [zoomState, excludedCategories, savePreferences]
  )

  const allCategories = useMemo(() => {
    const categories = new Set<string>()
    transactions
      .filter((t) => (t.debit || 0) > 0)
      .forEach((t) => {
        categories.add(t.category || categorizeTransaction(t))
      })
    return Array.from(categories).sort()
  }, [transactions])

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
        category: t.category || categorizeTransaction(t),
      }))
      .sort((a, b) => (b.debit || 0) - (a.debit || 0))
  }, [selectedDay, transactions])

  const { chartData, maxCategories } = useMemo(() => {
    const periodData = new Map<string, Record<string, number>>()

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
        return isSameMonth(t.purchaseDate, selectedMonthDate)
      })
    } else if (zoomState.level === 'daily' && zoomState.selectedWeek) {
      const weekStart = parseISO(zoomState.selectedWeek)
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const selectedMonthDate = zoomState.selectedMonth
        ? new Date(zoomState.selectedMonth + '-01')
        : null
      filteredTransactions = filteredTransactions.filter((t) => {
        if (!t.purchaseDate || isNaN(t.purchaseDate.getTime())) return false
        const inWeek = isWithinInterval(t.purchaseDate, { start: weekStart, end: weekEnd })
        if (selectedMonthDate) {
          return inWeek && isSameMonth(t.purchaseDate, selectedMonthDate)
        }
        return inWeek
      })
    }

    filteredTransactions.forEach((transaction) => {
      if (!transaction.purchaseDate || isNaN(transaction.purchaseDate.getTime())) {
        return
      }

      const category = transaction.category || categorizeTransaction(transaction)
      if (excludedCategories.has(category)) {
        return
      }

      let periodKey: string
      switch (zoomState.level) {
        case 'daily':
          periodKey = format(transaction.purchaseDate, 'yyyy-MM-dd')
          break
        case 'weekly':
          periodKey = format(
            startOfWeek(transaction.purchaseDate, { weekStartsOn: 1 }),
            'yyyy-MM-dd'
          )
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

    let maxCats = 0
    periodData.forEach((categories) => {
      maxCats = Math.max(maxCats, Object.keys(categories).length)
    })

    const formatLabel = (key: string): string => {
      switch (zoomState.level) {
        case 'daily':
          return format(new Date(key), 'EEE, MMM d')
        case 'weekly': {
          const weekStart = new Date(key)
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })

          if (zoomState.selectedMonth) {
            const selectedMonthDate = new Date(zoomState.selectedMonth + '-01')
            const monthStart = startOfMonth(selectedMonthDate)
            const monthEnd = endOfMonth(selectedMonthDate)

            const displayStart = weekStart < monthStart ? monthStart : weekStart
            const displayEnd = weekEnd > monthEnd ? monthEnd : weekEnd

            if (format(displayStart, 'MMM') === format(displayEnd, 'MMM')) {
              return `${format(displayStart, 'MMM d')} - ${format(displayEnd, 'd')}`
            }
            return `${format(displayStart, 'MMM d')} - ${format(displayEnd, 'MMM d')}`
          }

          return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd')}`
        }
        case 'monthly':
          return format(new Date(key + '-01'), 'MMM yyyy')
        case 'yearly':
        default:
          return key
      }
    }

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
      updateZoomState({
        level: 'monthly',
        selectedYear: data.periodKey,
      })
    } else if (zoomState.level === 'monthly') {
      updateZoomState({
        level: 'weekly',
        selectedYear: zoomState.selectedYear,
        selectedMonth: data.periodKey,
      })
    } else if (zoomState.level === 'weekly') {
      updateZoomState({
        level: 'daily',
        selectedYear: zoomState.selectedYear,
        selectedMonth: zoomState.selectedMonth,
        selectedWeek: data.periodKey,
      })
    } else if (zoomState.level === 'daily') {
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

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean
    payload?: Array<{ payload: ChartDataPoint }>
    label?: string
  }) => {
    if (!active || !payload || !payload.length) return null

    const data = payload[0].payload
    const segments = data.segments as { category: string; value: number }[]

    return (
      <div className="max-h-80 overflow-auto rounded-xl border-2 border-gray-200 bg-white p-4 shadow-lg dark:border-gray-700 dark:bg-gray-900">
        <p className="mb-2 font-bold text-gray-900 dark:text-gray-100">{label}</p>
        {segments.map((segment, i) => (
          <div key={i} className="flex items-center gap-2 py-1 text-sm">
            <div
              className="h-3 w-3 flex-shrink-0 rounded-sm"
              style={{
                backgroundColor:
                  getCategoryColor?.(segment.category) ??
                  BUILTIN_CATEGORY_COLORS[segment.category] ??
                  '#9ca3af',
              }}
            />
            <span className="text-muted-foreground">{segment.category}:</span>
            <span className="font-semibold">{formatCurrency(segment.value)}</span>
          </div>
        ))}
        <p className="mt-2 border-t border-gray-100 pt-2 text-xs text-purple-600 dark:border-gray-800">
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
        onClick:
          zoomState.level !== 'monthly'
            ? () => updateZoomState({ level: 'monthly', selectedYear: zoomState.selectedYear })
            : undefined,
      })
    }

    if (zoomState.selectedMonth) {
      parts.push({
        label: format(new Date(zoomState.selectedMonth + '-01'), 'MMMM'),
        onClick:
          zoomState.level === 'daily'
            ? () =>
                updateZoomState({
                  level: 'weekly',
                  selectedYear: zoomState.selectedYear,
                  selectedMonth: zoomState.selectedMonth,
                })
            : undefined,
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
    <Card className="border-2 border-gray-50 shadow-xl dark:border-gray-800">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
        <div>
          <h2 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">{getTitle()}</h2>

          {/* Breadcrumb Navigation */}
          {zoomState.level !== 'yearly' && (
            <div className="flex items-center gap-2 text-sm">
              {getBreadcrumb().map((part, index) => (
                <span key={index} className="flex items-center gap-2">
                  {index > 0 && <span className="text-muted-foreground">/</span>}
                  {part.onClick ? (
                    <button
                      onClick={part.onClick}
                      className="text-purple-600 hover:text-purple-800 hover:underline"
                    >
                      {part.label}
                    </button>
                  ) : (
                    <span className="text-muted-foreground">{part.label}</span>
                  )}
                </span>
              ))}
            </div>
          )}

          {zoomState.level === 'yearly' && (
            <p className="flex items-center gap-2 text-muted-foreground">
              <ZoomIn className="h-4 w-4" />
              Click any bar to zoom in
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {zoomState.level !== 'yearly' && (
            <Button
              variant="secondary"
              onClick={handleZoomOut}
              className="bg-purple-100 text-purple-700 hover:bg-purple-200"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}

          <Button
            variant={excludedCategories.size > 0 ? 'secondary' : 'outline'}
            onClick={() => updateShowFilterPanel(!showFilterPanel)}
            className={excludedCategories.size > 0 ? 'bg-purple-100 text-purple-700' : ''}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {excludedCategories.size > 0 && (
              <Badge className="ml-2 bg-purple-600 text-white">{excludedCategories.size}</Badge>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Filter Categories
              </span>
              {excludedCategories.size > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={clearFilters}
                  className="h-auto p-0 text-sm text-purple-600"
                >
                  Clear all filters
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((category) => {
                const isExcluded = excludedCategories.has(category)
                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                      isExcluded
                        ? 'bg-gray-200 text-gray-400 line-through dark:bg-gray-700 dark:text-gray-500'
                        : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300'
                    }`}
                  >
                    <div
                      className={`h-3 w-3 rounded-sm ${isExcluded ? 'opacity-30' : ''}`}
                      style={{
                        backgroundColor:
                          getCategoryColor?.(category) ??
                          BUILTIN_CATEGORY_COLORS[category] ??
                          '#9ca3af',
                      }}
                    />
                    {category}
                    {isExcluded && <X className="h-3 w-3" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {excludedCategories.size > 0 && !showFilterPanel && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Excluded:</span>
            {Array.from(excludedCategories).map((category) => (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className="inline-flex items-center rounded-md border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-gray-200"
              >
                {category}
                <X className="ml-1 h-3 w-3" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}

        <div
          className="h-[500px]"
          role="img"
          aria-label={`Bar chart showing monthly spending trends. ${chartData.length} months shown.`}
        >
          <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
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
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartTheme.gridStroke}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: chartTheme.axisFill }}
                stroke={chartTheme.axisStroke}
                tickLine={false}
                interval={0}
                angle={zoomState.level === 'daily' ? -45 : 0}
                textAnchor={zoomState.level === 'daily' ? 'end' : 'middle'}
                height={zoomState.level === 'daily' ? 80 : 30}
              />
              <YAxis
                tick={{ fontSize: 12, fill: chartTheme.axisFill }}
                stroke={chartTheme.axisStroke}
                tickLine={false}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              {Array.from({ length: maxCategories }).map((_, slotIndex) => (
                <Bar
                  key={`slot${slotIndex}`}
                  dataKey={`slot${slotIndex}`}
                  stackId="spending"
                  radius={
                    slotIndex === 0
                      ? [0, 0, 0, 0]
                      : slotIndex === maxCategories - 1
                        ? [4, 4, 0, 0]
                        : [0, 0, 0, 0]
                  }
                >
                  {chartData.map((entry, entryIndex) => (
                    <Cell
                      key={`cell-${entryIndex}`}
                      fill={
                        getCategoryColor?.(entry[`slot${slotIndex}Category`] as string) ??
                        BUILTIN_CATEGORY_COLORS[entry[`slot${slotIndex}Category`] as string] ??
                        '#9ca3af'
                      }
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          {Object.entries(BUILTIN_CATEGORY_COLORS)
            .filter(([category]) => !excludedCategories.has(category))
            .slice(0, 12)
            .map(([category, color]) => (
              <div key={category} className="flex items-center gap-2 text-sm">
                <div
                  className="h-3 w-3 rounded-sm"
                  style={{
                    backgroundColor: getCategoryColor?.(category) ?? color,
                  }}
                />
                <span className="text-muted-foreground">{category}</span>
              </div>
            ))}
        </div>

        {/* Day Transactions Dialog */}
        <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
          <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden p-0">
            <DialogHeader className="border-b border-gray-100 p-6 dark:border-gray-800">
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {selectedDay ? format(parseISO(selectedDay), 'EEEE, MMMM d, yyyy') : ''}
              </DialogTitle>
              <DialogDescription>
                {dayTransactions.length} transaction{dayTransactions.length !== 1 ? 's' : ''} •
                Total: {formatCurrency(dayTransactions.reduce((sum, t) => sum + (t.debit || 0), 0))}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[60vh] p-6">
              {dayTransactions.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No transactions for this day
                </p>
              ) : (
                <div className="space-y-3">
                  {dayTransactions.map((t, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 rounded-xl bg-gray-50 p-4 transition-colors hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800"
                    >
                      <div
                        className="h-3 w-3 flex-shrink-0 rounded-sm"
                        style={{
                          backgroundColor:
                            getCategoryColor?.(t.category) ??
                            BUILTIN_CATEGORY_COLORS[t.category] ??
                            '#9ca3af',
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900 dark:text-gray-100">
                          {t.bookingText}
                        </p>
                        <p className="text-sm text-muted-foreground">{t.category}</p>
                      </div>
                      <p className="flex-shrink-0 font-bold text-red-600">
                        {formatCurrency(t.debit || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
