'use client'

import { useMemo } from 'react'
import { PiggyBank, Settings, AlertTriangle } from 'lucide-react'
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
    border: 'border-green-200',
  },
  early: {
    bg: 'bg-blue-500',
    light: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  warning: {
    bg: 'bg-yellow-500',
    light: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
  },
  over: {
    bg: 'bg-red-500',
    light: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-200',
  },
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
    const overBudgetCount = budgetStatus.filter((b) => b.status === 'over').length
    const warningCount = budgetStatus.filter(
      (b) => b.status === 'warning' || b.status === 'early'
    ).length

    return { totalBudget, totalSpent, totalRemaining, overBudgetCount, warningCount }
  }, [budgetStatus])

  if (budgetStatus.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-gray-50 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2">
              <PiggyBank className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Monthly Budgets</h2>
          </div>
          <button
            onClick={onManageBudgets}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 font-semibold text-white transition-colors hover:bg-amber-600"
          >
            <Settings className="h-4 w-4" />
            Set Budgets
          </button>
        </div>
        <div className="py-8 text-center">
          <PiggyBank className="mx-auto mb-4 h-16 w-16 text-gray-300" />
          <p className="mb-2 font-medium text-gray-600">No budgets configured</p>
          <p className="text-sm text-gray-500">Set monthly budgets to track your spending limits</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-gray-50 bg-white p-8 shadow-xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-2">
            <PiggyBank className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Monthly Budgets</h2>
            <p className="text-sm text-gray-600">
              {formatCurrency(summary.totalSpent)} of {formatCurrency(summary.totalBudget)} spent
            </p>
          </div>
        </div>
        <button
          onClick={onManageBudgets}
          className="flex items-center gap-2 rounded-xl bg-gray-100 px-4 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-200"
        >
          <Settings className="h-4 w-4" />
          Manage
        </button>
      </div>

      {/* Summary Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">
            Total Budget
          </p>
          <p className="text-2xl font-bold">{formatCurrency(summary.totalBudget)}</p>
        </div>
        <div
          className={`rounded-xl p-4 text-white ${
            summary.totalRemaining >= 0
              ? 'bg-gradient-to-br from-green-500 to-emerald-500'
              : 'bg-gradient-to-br from-red-500 to-rose-500'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
            {summary.totalRemaining >= 0 ? 'Remaining' : 'Over Budget'}
          </p>
          <p className="text-2xl font-bold">{formatCurrency(Math.abs(summary.totalRemaining))}</p>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 p-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-100">Used</p>
          <p className="text-2xl font-bold">
            {summary.totalBudget > 0
              ? Math.round((summary.totalSpent / summary.totalBudget) * 100)
              : 0}
            %
          </p>
        </div>
      </div>

      {/* Alerts */}
      {(summary.overBudgetCount > 0 || summary.warningCount > 0) && (
        <div
          className={`mb-6 flex items-center gap-3 rounded-xl p-3 ${
            summary.overBudgetCount > 0
              ? 'border border-red-200 bg-red-50'
              : 'border border-yellow-200 bg-yellow-50'
          }`}
        >
          <AlertTriangle
            className={`h-5 w-5 ${summary.overBudgetCount > 0 ? 'text-red-500' : 'text-yellow-500'}`}
          />
          <p
            className={`text-sm font-medium ${summary.overBudgetCount > 0 ? 'text-red-700' : 'text-yellow-700'}`}
          >
            {summary.overBudgetCount > 0 &&
              `${summary.overBudgetCount} budget${summary.overBudgetCount > 1 ? 's' : ''} exceeded`}
            {summary.overBudgetCount > 0 && summary.warningCount > 0 && ', '}
            {summary.warningCount > 0 && `${summary.warningCount} approaching limit`}
          </p>
        </div>
      )}

      {/* Budget List */}
      <div className="space-y-3">
        {budgetStatus.map((item) => {
          const colors = STATUS_COLORS[item.status]
          const percentCapped = Math.min(item.percentUsed, 100)

          return (
            <div
              key={item.budget.id}
              className={`rounded-xl border p-4 ${colors.border} ${colors.light}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-gray-900">{item.budget.category}</span>
                <span className={`text-sm font-bold ${colors.text}`}>
                  {item.percentUsed.toFixed(0)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-2 h-3 overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full ${colors.bg} transition-all duration-500`}
                  style={{ width: `${percentCapped}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{formatCurrency(item.spent)} spent</span>
                <span
                  className={item.remaining >= 0 ? 'text-gray-600' : 'font-semibold text-red-600'}
                >
                  {item.remaining >= 0
                    ? `${formatCurrency(item.remaining)} left`
                    : `${formatCurrency(Math.abs(item.remaining))} over`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
