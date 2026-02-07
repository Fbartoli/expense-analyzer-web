'use client'

import { useMemo } from 'react'
import { PiggyBank, Settings, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import type { BudgetWithSpending } from '@/lib/types'

interface BudgetOverviewProps {
  budgetStatus: BudgetWithSpending[]
  onManageBudgets: () => void
}

const STATUS_COLORS = {
  healthy: {
    progress: 'bg-green-500',
    light: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
  },
  early: {
    progress: 'bg-blue-500',
    light: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  warning: {
    progress: 'bg-yellow-500',
    light: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  over: {
    progress: 'bg-red-500',
    light: 'bg-red-100 dark:bg-red-900',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800',
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
      <Card className="border-2 border-gray-50 shadow-xl dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2">
              <PiggyBank className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Monthly Budgets</h2>
          </div>
          <Button onClick={onManageBudgets} className="bg-amber-500 hover:bg-amber-600">
            <Settings className="mr-2 h-4 w-4" />
            Set Budgets
          </Button>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <PiggyBank className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
            <p className="mb-2 font-medium text-gray-600 dark:text-gray-400">
              No budgets configured
            </p>
            <p className="text-sm text-muted-foreground">
              Set monthly budgets to track your spending limits
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-gray-50 shadow-xl dark:border-gray-800">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-xl bg-amber-100 p-2">
            <PiggyBank className="h-6 w-6 text-amber-600" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold text-gray-900 dark:text-gray-100">
              Monthly Budgets
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              {formatCurrency(summary.totalSpent)} of {formatCurrency(summary.totalBudget)} spent
            </p>
          </div>
        </div>
        <Button variant="secondary" onClick={onManageBudgets} className="shrink-0">
          <Settings className="mr-2 h-4 w-4" />
          Manage
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="min-w-[100px] flex-1 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-3 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">
              Total Budget
            </p>
            <p className="truncate text-xl font-bold">{formatCurrency(summary.totalBudget)}</p>
          </div>
          <div
            className={`min-w-[100px] flex-1 rounded-xl p-3 text-white ${
              summary.totalRemaining >= 0
                ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                : 'bg-gradient-to-br from-red-500 to-rose-500'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
              {summary.totalRemaining >= 0 ? 'Remaining' : 'Over Budget'}
            </p>
            <p className="truncate text-xl font-bold">
              {formatCurrency(Math.abs(summary.totalRemaining))}
            </p>
          </div>
          <div className="min-w-[100px] flex-1 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 p-3 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-100">Used</p>
            <p className="truncate text-xl font-bold">
              {summary.totalBudget > 0
                ? Math.round((summary.totalSpent / summary.totalBudget) * 100)
                : 0}
              %
            </p>
          </div>
        </div>

        {/* Alerts */}
        {(summary.overBudgetCount > 0 || summary.warningCount > 0) && (
          <Alert
            variant={summary.overBudgetCount > 0 ? 'destructive' : 'default'}
            className={`mb-6 ${summary.overBudgetCount === 0 ? 'border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300' : ''}`}
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {summary.overBudgetCount > 0 &&
                `${summary.overBudgetCount} budget${summary.overBudgetCount > 1 ? 's' : ''} exceeded`}
              {summary.overBudgetCount > 0 && summary.warningCount > 0 && ', '}
              {summary.warningCount > 0 && `${summary.warningCount} approaching limit`}
            </AlertDescription>
          </Alert>
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
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {item.budget.category}
                  </span>
                  <Badge variant="secondary" className={`${colors.text} bg-transparent`}>
                    {item.percentUsed.toFixed(0)}%
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div
                  className="mb-2 h-3 overflow-hidden rounded-full bg-white dark:bg-gray-950"
                  role="progressbar"
                  aria-valuenow={percentCapped}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${item.budget.category} budget: ${item.percentUsed.toFixed(0)}% used`}
                >
                  <div
                    className={`h-full ${colors.progress} transition-all duration-500`}
                    style={{ width: `${percentCapped}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatCurrency(item.spent)} spent</span>
                  <span
                    className={
                      item.remaining >= 0 ? 'text-muted-foreground' : 'font-semibold text-red-600'
                    }
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
      </CardContent>
    </Card>
  )
}
