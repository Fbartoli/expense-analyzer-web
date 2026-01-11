'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { ChevronRight, Filter, X } from 'lucide-react'
import { CategoryDetails } from './CategoryDetails'
import type { CategorySummary, BudgetWithSpending } from '@/lib/types'

interface CategoryBreakdownProps {
  categories: CategorySummary[]
  budgetStatus?: BudgetWithSpending[]
}

const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // green
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#f97316', // orange
  '#ef4444', // red
  '#84cc16', // lime
  '#14b8a6', // teal
  '#a855f7', // violet
  '#f43f5e', // rose
  '#eab308', // yellow
  '#22d3ee', // sky
]

const BUDGET_STATUS_COLORS = {
  healthy: 'bg-green-500',
  early: 'bg-blue-500',
  warning: 'bg-yellow-500',
  over: 'bg-red-500',
}

export function CategoryBreakdown({ categories, budgetStatus = [] }: CategoryBreakdownProps) {
  const [selectedCategory, setSelectedCategory] = useState<CategorySummary | null>(null)
  const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set())
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  // Get budget for a specific category
  const getBudgetForCategory = (categoryName: string): BudgetWithSpending | undefined => {
    return budgetStatus.find((b) => b.budget.category === categoryName)
  }

  // Filter categories and recalculate percentages
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
        />
      )}

      <div className="rounded-2xl border-2 border-gray-50 bg-white p-8 shadow-xl">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="mb-2 text-3xl font-bold text-gray-900">Spending by Category</h2>
            <p className="text-gray-600">Click any category to explore transactions</p>
          </div>
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 font-semibold transition-all ${
              excludedCategories.size > 0
                ? 'border-2 border-blue-300 bg-blue-100 text-blue-700'
                : 'border-2 border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filter
            {excludedCategories.size > 0 && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                {excludedCategories.size}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Filter Categories</span>
              {excludedCategories.size > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Clear all
                </button>
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
                        ? 'bg-gray-200 text-gray-500 line-through'
                        : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`h-3 w-3 rounded-full ${isExcluded ? 'opacity-40' : ''}`}
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
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
            <div className="flex h-[500px] items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
                      // Only show labels for slices >= 8%
                      if (percent < 0.08) return null
                      const RADIAN = Math.PI / 180
                      const radius = outerRadius * 1.25
                      const x = cx + radius * Math.cos(-midAngle * RADIAN)
                      const y = cy + radius * Math.sin(-midAngle * RADIAN)
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="#374151"
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [formatCurrency(value), name]}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="max-h-[500px] space-y-2 overflow-y-auto lg:col-span-2">
            {filteredCategories.map((category, index) => {
              const budget = getBudgetForCategory(category.category)
              return (
                <button
                  key={category.category}
                  onClick={() => setSelectedCategory(category)}
                  className="group flex w-full flex-col rounded-xl border-2 border-transparent p-4 transition-all hover:border-gray-200 hover:bg-gray-50"
                >
                  <div className="flex w-full items-center justify-between">
                    <div className="flex flex-1 items-center gap-3">
                      <div
                        className="h-5 w-5 flex-shrink-0 rounded-lg shadow-sm"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">
                          {category.category}
                        </p>
                        <p className="text-xs text-gray-500">
                          {category.count} transactions • {category.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(category.totalSpent)}
                      </p>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
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
                        <span className="text-gray-500">
                          {formatCurrency(budget.budget.amount)} limit
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
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
        </div>
      </div>
    </>
  )
}
