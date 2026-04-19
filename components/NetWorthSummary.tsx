'use client'

import { useMemo } from 'react'
import { Landmark, TrendingUp, TrendingDown, Settings } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { NetWorthSnapshot } from '@/lib/types'
import { computeNetWorthChange } from '@/lib/net-worth'
import { formatCHF } from '@/lib/format'

interface NetWorthSummaryProps {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  previousSnapshot: NetWorthSnapshot | null
  onManageAccounts: () => void
}

export function NetWorthSummary({
  totalAssets,
  totalLiabilities,
  netWorth,
  previousSnapshot,
  onManageAccounts,
}: NetWorthSummaryProps) {
  const change = useMemo(() => {
    if (!previousSnapshot) return null
    const current: NetWorthSnapshot = {
      date: new Date(),
      totalAssets,
      totalLiabilities,
      netWorth,
      accountBalances: [],
    }
    return computeNetWorthChange(current, previousSnapshot)
  }, [totalAssets, totalLiabilities, netWorth, previousSnapshot])

  const hasData = totalAssets > 0 || totalLiabilities > 0

  if (!hasData) {
    return (
      <Card className="border-2 border-gray-50 shadow-xl dark:border-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-100 p-2 dark:bg-teal-900">
              <Landmark className="h-6 w-6 text-teal-600 dark:text-teal-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Net Worth</h2>
          </div>
          <Button onClick={onManageAccounts} className="bg-teal-500 hover:bg-teal-600">
            <Settings className="mr-2 h-4 w-4" />
            Add Accounts
          </Button>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <Landmark className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
            <p className="mb-2 font-medium text-gray-600 dark:text-gray-400">
              No accounts configured
            </p>
            <p className="text-sm text-muted-foreground">
              Add your bank accounts, investments, and liabilities to track your net worth
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
          <div className="shrink-0 rounded-xl bg-teal-100 p-2 dark:bg-teal-900">
            <Landmark className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold text-gray-900 dark:text-gray-100">
              Net Worth
            </h2>
            {change && (
              <p className="flex items-center gap-1 text-sm">
                {change.absoluteChange >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                )}
                <span
                  className={
                    change.absoluteChange >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }
                >
                  {change.absoluteChange >= 0 ? '+' : ''}
                  {formatCHF(change.absoluteChange)} ({change.percentChange >= 0 ? '+' : ''}
                  {change.percentChange.toFixed(1)}%)
                </span>
              </p>
            )}
          </div>
        </div>
        <Button variant="secondary" onClick={onManageAccounts} className="shrink-0">
          <Settings className="mr-2 h-4 w-4" />
          Manage
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <div
            className={`min-w-[100px] flex-1 rounded-xl p-3 text-white ${
              netWorth >= 0
                ? 'bg-gradient-to-br from-teal-500 to-emerald-500'
                : 'bg-gradient-to-br from-red-500 to-rose-500'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Net Worth</p>
            <p className="truncate text-xl font-bold">{formatCHF(netWorth)}</p>
          </div>
          <div className="min-w-[100px] flex-1 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 p-3 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Assets</p>
            <p className="truncate text-xl font-bold">{formatCHF(totalAssets)}</p>
          </div>
          <div className="min-w-[100px] flex-1 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-3 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-100">
              Liabilities
            </p>
            <p className="truncate text-xl font-bold">{formatCHF(totalLiabilities)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
