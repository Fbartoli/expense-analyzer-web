'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
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
  over: 'bg-red-500'
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
    return budgetStatus.find(b => b.budget.category === categoryName)
  }

  // Filter categories and recalculate percentages
  const filteredCategories = useMemo(() => {
    const filtered = categories.filter(cat => !excludedCategories.has(cat.category))
    const totalSpent = filtered.reduce((sum, cat) => sum + cat.totalSpent, 0)

    return filtered.map(cat => ({
      ...cat,
      percentage: totalSpent > 0 ? (cat.totalSpent / totalSpent) * 100 : 0
    }))
  }, [categories, excludedCategories])

  const chartData = filteredCategories.map((cat) => ({
    name: cat.category,
    value: cat.totalSpent,
    percentage: cat.percentage,
  }))

  const toggleCategory = (category: string) => {
    setExcludedCategories(prev => {
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
      
      <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-50">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Spending by Category
            </h2>
            <p className="text-gray-600">Click any category to explore transactions</p>
          </div>
          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
              excludedCategories.size > 0
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter
            {excludedCategories.size > 0 && (
              <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                {excludedCategories.size}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilterPanel && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Filter Categories</span>
              {excludedCategories.size > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
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
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isExcluded
                        ? 'bg-gray-200 text-gray-500 line-through'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${isExcluded ? 'opacity-40' : ''}`}
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    {cat.category}
                    {isExcluded && <X className="w-3 h-3" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <div className="h-[500px] flex items-center justify-center">
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
                      fontWeight: '600'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-2 max-h-[500px] overflow-y-auto">
            {filteredCategories.map((category, index) => {
              const budget = getBudgetForCategory(category.category)
              return (
                <button
                  key={category.category}
                  onClick={() => setSelectedCategory(category)}
                  className="w-full flex flex-col p-4 rounded-xl hover:bg-gray-50 transition-all group border-2 border-transparent hover:border-gray-200"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-5 h-5 rounded-lg flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className="text-left flex-1">
                        <p className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">
                          {category.category}
                        </p>
                        <p className="text-xs text-gray-500">{category.count} transactions • {category.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(category.totalSpent)}
                      </p>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    </div>
                  </div>
                  {/* Budget Progress Indicator */}
                  {budget && (
                    <div className="mt-2 w-full">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`font-medium ${
                          budget.status === 'over' ? 'text-red-600' :
                          budget.status === 'warning' ? 'text-yellow-600' :
                          budget.status === 'early' ? 'text-blue-600' : 'text-green-600'
                        }`}>
                          {budget.percentUsed.toFixed(0)}% of budget
                        </span>
                        <span className="text-gray-500">
                          {formatCurrency(budget.budget.amount)} limit
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
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
