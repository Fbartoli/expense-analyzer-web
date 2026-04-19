'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { ChevronRight, Filter, X } from 'lucide-react'
import { useChartTheme } from '@/lib/use-chart-theme'
import { CategoryDetails } from './CategoryDetails'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { CategorySummary, BudgetWithSpending, ManualRecurringTransaction } from '@/lib/types'

interface CategoryBreakdownProps {
  categories: CategorySummary[]
  budgetStatus?: BudgetWithSpending[]
  onMarkRecurring?: (entry: Omit<ManualRecurringTransaction, 'id'>) => void
  taggedFingerprints?: Set<string>
  getCategoryColor?: (name: string) => string
}

const COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#6366f1',
  '#f97316',
  '#ef4444',
  '#84cc16',
  '#14b8a6',
  '#a855f7',
  '#f43f5e',
  '#eab308',
  '#22d3ee',
]

const BUDGET_STATUS_COLORS = {
  healthy: 'bg-green-500',
  early: 'bg-blue-500',
  warning: 'bg-yellow-500',
  over: 'bg-red-500',
}

export function CategoryBreakdown({
  categories,
  budgetStatus = [],
  onMarkRecurring,
  taggedFingerprints,
  getCategoryColor,
}: CategoryBreakdownProps) {
  const chartTheme = useChartTheme()
  const [selectedCategory, setSelectedCategory] = useState<CategorySummary | null>(null)
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set())
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const getBudgetForCategory = (categoryName: string): BudgetWithSpending | undefined => {
    return budgetStatus.find((b) => b.budget.category === categoryName)
  }

  const filteredCategories = useMemo(() => {
    const filtered = categories.filter((cat) => !excludedCategories.has(cat.category))
    const totalSpent = filtered.reduce((sum, cat) => sum + cat.totalSpent, 0)

    return filtered.map((cat) => ({
      ...cat,
      percentage: totalSpent > 0 ? (cat.totalSpent / totalSpent) * 100 : 0,
    }))
  }, [categories, excludedCategories])

  const chartData = filteredCategories.map((cat) => ({
    name: cat.category,
    value: cat.totalSpent,
    percentage: cat.percentage,
  }))

  const chartAriaLabel = useMemo(() => {
    const top3 = filteredCategories
      .slice(0, 3)
      .map((c) => `${c.category} ${c.percentage.toFixed(0)}%`)
      .join(', ')
    return `Pie chart showing spending by category. Top categories: ${top3}`
  }, [filteredCategories])

  const toggleCategory = (category: string) => {
    setExcludedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  const clearFilters = () => {
    setExcludedCategories(new Set())
  }

  return (
    <>
      {selectedCategory && (
        <CategoryDetails
          category={selectedCategory.category}
          transactions={selectedCategory.transactions}
          onClose={() => setSelectedCategory(null)}
          onMarkRecurring={onMarkRecurring}
          taggedFingerprints={taggedFingerprints}
        />
      )}

      <Card className="border-2 border-gray-50 shadow-xl">
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <h2 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              Spending by Category
            </h2>
            <p className="text-muted-foreground">Click any category to explore transactions</p>
          </div>
          <Button
            variant={excludedCategories.size > 0 ? 'default' : 'outline'}
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={
              excludedCategories.size > 0
                ? 'border-2 border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200'
                : ''
            }
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {excludedCategories.size > 0 && (
              <Badge className="ml-2 bg-blue-600 text-white">{excludedCategories.size}</Badge>
            )}
          </Button>
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
                    className="h-auto p-0 text-xs text-blue-600"
                  >
                    Clear all
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat, index) => {
                  const isExcluded = excludedCategories.has(cat.category)
                  return (
                    <button
                      key={cat.category}
                      onClick={() => toggleCategory(cat.category)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                        isExcluded
                          ? 'bg-gray-200 text-gray-500 line-through dark:text-gray-400'
                          : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300'
                      }`}
                    >
                      <div
                        className={`h-3 w-3 rounded-full ${isExcluded ? 'opacity-40' : ''}`}
                        style={{
                          backgroundColor:
                            getCategoryColor?.(cat.category) ?? COLORS[index % COLORS.length],
                        }}
                        aria-hidden="true"
                      />
                      {cat.category}
                      {isExcluded && <X className="h-3 w-3" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div
                className="flex h-[500px] items-center justify-center"
                role="img"
                aria-label={chartAriaLabel}
              >
                <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
                        if (percent < 0.08) return null
                        const RADIAN = Math.PI / 180
                        const radius = outerRadius * 1.25
                        const x = cx + radius * Math.cos(-midAngle * RADIAN)
                        const y = cy + radius * Math.sin(-midAngle * RADIAN)
                        return (
                          <text
                            x={x}
                            y={y}
                            fill={chartTheme.axisFill}
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            fontSize={11}
                            fontWeight={600}
                          >
                            {`${name}: ${(percent * 100).toFixed(0)}%`}
                          </text>
                        )
                      }}
                      outerRadius={140}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getCategoryColor?.(entry.name) ?? COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      contentStyle={{
                        backgroundColor: chartTheme.tooltipBg,
                        border: `2px solid ${chartTheme.tooltipBorder}`,
                        borderRadius: '12px',
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: chartTheme.tooltipText,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <ScrollArea className="h-[500px] lg:col-span-2">
              <div className="space-y-2">
                {filteredCategories.map((category, index) => {
                  const budget = getBudgetForCategory(category.category)
                  return (
                    <button
                      key={category.category}
                      onClick={() => setSelectedCategory(category)}
                      className="group flex w-full flex-col rounded-xl border-2 border-transparent p-4 transition-all hover:border-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex w-full items-center justify-between">
                        <div className="flex flex-1 items-center gap-3">
                          <div
                            className="h-5 w-5 flex-shrink-0 rounded-lg shadow-sm"
                            style={{
                              backgroundColor:
                                getCategoryColor?.(category.category) ??
                                COLORS[index % COLORS.length],
                            }}
                            aria-hidden="true"
                          />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900 dark:text-gray-200">
                              {category.category}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {category.count} transactions • {category.percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(category.totalSpent)}
                          </p>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:text-gray-500" />
                        </div>
                      </div>
                      {/* Budget Progress Indicator */}
                      {budget && (
                        <div className="mt-2 w-full">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span
                              className={`font-medium ${
                                budget.status === 'over'
                                  ? 'text-red-600'
                                  : budget.status === 'warning'
                                    ? 'text-yellow-600'
                                    : budget.status === 'early'
                                      ? 'text-blue-600'
                                      : 'text-green-600'
                              }`}
                            >
                              {budget.percentUsed.toFixed(0)}% of budget
                            </span>
                            <span className="text-muted-foreground">
                              {formatCurrency(budget.budget.amount)} limit
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                              className={`h-full ${BUDGET_STATUS_COLORS[budget.status]} transition-all`}
                              style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
