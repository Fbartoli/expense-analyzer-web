'use client'

import { useMemo } from 'react'
import { PiggyBank, Settings, AlertTriangle, TrendingUp } from 'lucide-react'
import type { BudgetWithSpending } from '@/lib/types'

interface BudgetOverviewProps {
  budgetStatus: BudgetWithSpending[]
  onManageBudgets: () => void
}

const STATUS_COLORS = {
  healthy: {
    bg: 'bg-green-500',
    light: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-200'
  },
  early: {
    bg: 'bg-blue-500',
    light: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  warning: {
    bg: 'bg-yellow-500',
    light: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-200'
  },
  over: {
    bg: 'bg-red-500',
    light: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200'
  }
}

export function BudgetOverview({ budgetStatus, onManageBudgets }: BudgetOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const summary = useMemo(() => {
    const totalBudget = budgetStatus.reduce((sum, b) => sum + b.budget.amount, 0)
    const totalSpent = budgetStatus.reduce((sum, b) => sum + b.spent, 0)
    const totalRemaining = totalBudget - totalSpent
    const overBudgetCount = budgetStatus.filter(b => b.status === 'over').length
    const warningCount = budgetStatus.filter(b => b.status === 'warning' || b.status === 'early').length

    return { totalBudget, totalSpent, totalRemaining, overBudgetCount, warningCount }
  }, [budgetStatus])

  if (budgetStatus.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-50">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl">
              <PiggyBank className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Monthly Budgets</h2>
          </div>
          <button
            onClick={onManageBudgets}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-semibold"
          >
            <Settings className="w-4 h-4" />
            Set Budgets
          </button>
        </div>
        <div className="text-center py-8">
          <PiggyBank className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium mb-2">No budgets configured</p>
          <p className="text-gray-500 text-sm">Set monthly budgets to track your spending limits</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-xl">
            <PiggyBank className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Monthly Budgets</h2>
            <p className="text-gray-600 text-sm">
              {formatCurrency(summary.totalSpent)} of {formatCurrency(summary.totalBudget)} spent
            </p>
          </div>
        </div>
        <button
          onClick={onManageBudgets}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
        >
          <Settings className="w-4 h-4" />
          Manage
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white">
          <p className="text-amber-100 text-xs font-semibold uppercase tracking-wide">Total Budget</p>
          <p className="text-2xl font-bold">{formatCurrency(summary.totalBudget)}</p>
        </div>
        <div className={`rounded-xl p-4 text-white ${
          summary.totalRemaining >= 0
            ? 'bg-gradient-to-br from-green-500 to-emerald-500'
            : 'bg-gradient-to-br from-red-500 to-rose-500'
        }`}>
          <p className="text-white/80 text-xs font-semibold uppercase tracking-wide">
            {summary.totalRemaining >= 0 ? 'Remaining' : 'Over Budget'}
          </p>
          <p className="text-2xl font-bold">{formatCurrency(Math.abs(summary.totalRemaining))}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl p-4 text-white">
          <p className="text-purple-100 text-xs font-semibold uppercase tracking-wide">Used</p>
          <p className="text-2xl font-bold">
            {summary.totalBudget > 0 ? Math.round((summary.totalSpent / summary.totalBudget) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Alerts */}
      {(summary.overBudgetCount > 0 || summary.warningCount > 0) && (
        <div className={`flex items-center gap-3 p-3 rounded-xl mb-6 ${
          summary.overBudgetCount > 0 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <AlertTriangle className={`w-5 h-5 ${summary.overBudgetCount > 0 ? 'text-red-500' : 'text-yellow-500'}`} />
          <p className={`text-sm font-medium ${summary.overBudgetCount > 0 ? 'text-red-700' : 'text-yellow-700'}`}>
            {summary.overBudgetCount > 0 && `${summary.overBudgetCount} budget${summary.overBudgetCount > 1 ? 's' : ''} exceeded`}
            {summary.overBudgetCount > 0 && summary.warningCount > 0 && ', '}
            {summary.warningCount > 0 && `${summary.warningCount} approaching limit`}
          </p>
        </div>
      )}

      {/* Budget List */}
      <div className="space-y-3">
        {budgetStatus.map(item => {
          const colors = STATUS_COLORS[item.status]
          const percentCapped = Math.min(item.percentUsed, 100)

          return (
            <div key={item.budget.id} className={`p-4 rounded-xl border ${colors.border} ${colors.light}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-gray-900">{item.budget.category}</span>
                <span className={`text-sm font-bold ${colors.text}`}>
                  {item.percentUsed.toFixed(0)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-3 bg-white rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full ${colors.bg} transition-all duration-500`}
                  style={{ width: `${percentCapped}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  {formatCurrency(item.spent)} spent
                </span>
                <span className={item.remaining >= 0 ? 'text-gray-600' : 'text-red-600 font-semibold'}>
                  {item.remaining >= 0
                    ? `${formatCurrency(item.remaining)} left`
                    : `${formatCurrency(Math.abs(item.remaining))} over`
                  }
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
