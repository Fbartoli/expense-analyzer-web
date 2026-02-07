'use client'

import { useMemo } from 'react'
import { AlertCircle, ArrowUpRight, ArrowDownRight, Repeat, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { detectRecurringTransactions, mergeRecurringWithManual } from '@/lib/recurring'
import type { RecurringTransaction, RecurringAnalysis } from '@/lib/recurring'
import type { Transaction, ManualRecurringTransaction } from '@/lib/types'

interface RecurringTransactionsProps {
  transactions: Transaction[]
  manualRecurring?: ManualRecurringTransaction[]
  onRemoveManualRecurring?: (id: number) => void
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-CH', {
    style: 'currency',
    currency: 'CHF',
  }).format(amount)

const FREQUENCY_CONFIG = {
  weekly: { label: 'Weekly', className: 'bg-blue-100 text-blue-800' },
  monthly: { label: 'Monthly', className: 'bg-purple-100 text-purple-800' },
  quarterly: { label: 'Quarterly', className: 'bg-indigo-100 text-indigo-800' },
  irregular: {
    label: 'Irregular',
    className: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
  },
} as const

const STATUS_CONFIG = {
  active: { label: 'Active', className: 'bg-green-100 text-green-800' },
  new: { label: 'New', className: 'bg-emerald-100 text-emerald-800' },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
  },
  'price-changed': { label: 'Price Changed', className: 'bg-amber-100 text-amber-800' },
} as const

function AlertsSection({ analysis }: { analysis: RecurringAnalysis }) {
  const hasAlerts =
    analysis.newSubscriptions.length > 0 ||
    analysis.priceChanges.length > 0 ||
    analysis.cancelledSubscriptions.length > 0

  if (!hasAlerts) return null

  return (
    <div className="space-y-3">
      {analysis.newSubscriptions.map((sub) => (
        <div
          key={sub.merchantName}
          className="flex items-center justify-between rounded-xl border-2 border-emerald-100 bg-emerald-50 px-4 py-3 dark:bg-emerald-950"
        >
          <div className="flex items-center gap-3">
            <Plus className="h-4 w-4 text-emerald-600" />
            <div>
              <span className="font-medium capitalize text-gray-900 dark:text-gray-100">
                {sub.merchantName}
              </span>
              <span className="ml-2 text-sm text-emerald-700">New subscription detected</span>
            </div>
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(sub.monthlyEquivalent)}/mo
          </span>
        </div>
      ))}

      {analysis.priceChanges.map((sub) => (
        <div
          key={sub.merchantName}
          className="flex items-center justify-between rounded-xl border-2 border-amber-100 bg-amber-50 px-4 py-3 dark:bg-amber-950"
        >
          <div className="flex items-center gap-3">
            {sub.priceChange! > 0 ? (
              <ArrowUpRight className="h-4 w-4 text-amber-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-amber-600" />
            )}
            <div>
              <span className="font-medium capitalize text-gray-900 dark:text-gray-100">
                {sub.merchantName}
              </span>
              <span className="ml-2 text-sm text-amber-700 dark:text-amber-300">
                {sub.priceChange! > 0 ? '+' : ''}
                {sub.priceChange!.toFixed(1)}% price change
              </span>
            </div>
          </div>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(sub.monthlyEquivalent)}/mo
          </span>
        </div>
      ))}

      {analysis.cancelledSubscriptions.map((sub) => (
        <div
          key={sub.merchantName}
          className="flex items-center justify-between rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="flex items-center gap-3">
            <X className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            <div>
              <span className="font-medium capitalize text-gray-500 dark:text-gray-400">
                {sub.merchantName}
              </span>
              <span className="ml-2 text-sm text-gray-400 dark:text-gray-500">
                No longer active
              </span>
            </div>
          </div>
          <span className="font-semibold text-gray-400 line-through dark:text-gray-500">
            {formatCurrency(sub.monthlyEquivalent)}/mo
          </span>
        </div>
      ))}
    </div>
  )
}

function RecurringItem({
  item,
  onRemove,
}: {
  item: RecurringTransaction
  onRemove?: (id: number) => void
}) {
  const freqConfig = FREQUENCY_CONFIG[item.frequency]
  const statusConfig = STATUS_CONFIG[item.status]
  const isCancelled = item.status === 'cancelled'

  return (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-900">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className={`font-medium capitalize ${isCancelled ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}
          >
            {item.merchantName}
          </span>
          <Badge className={statusConfig.className} variant="secondary">
            {statusConfig.label}
          </Badge>
          {item.isManual && (
            <Badge
              className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
              variant="secondary"
            >
              Manual
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{item.category}</span>
          <span>&middot;</span>
          <Badge className={freqConfig.className} variant="secondary">
            {freqConfig.label}
          </Badge>
          <span>&middot;</span>
          <span>
            {item.occurrences} transaction{item.occurrences !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-right">
          <p
            className={`text-lg font-semibold ${isCancelled ? 'text-gray-400 line-through dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}
          >
            {formatCurrency(item.monthlyEquivalent)}
            <span className="text-sm font-normal text-muted-foreground">/mo</span>
          </p>
          {item.priceChange !== null && (
            <p className={`text-sm ${item.priceChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
              {item.priceChange > 0 ? '+' : ''}
              {item.priceChange.toFixed(1)}%
            </p>
          )}
        </div>
        {item.isManual && item.manualId != null && onRemove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.manualId!)}
            className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
            aria-label={`Remove ${item.merchantName}`}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function RecurringTransactions({
  transactions,
  manualRecurring = [],
  onRemoveManualRecurring,
}: RecurringTransactionsProps) {
  const autoAnalysis = useMemo(() => detectRecurringTransactions(transactions), [transactions])

  const analysis = useMemo(
    () => mergeRecurringWithManual(autoAnalysis, manualRecurring),
    [autoAnalysis, manualRecurring]
  )

  if (!analysis.dataQuality.hasEnoughData && manualRecurring.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Recurring Transactions
        </h2>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Not enough data</AlertTitle>
          <AlertDescription>
            Need at least 2 months of transaction history to detect recurring payments. Currently
            have {analysis.dataQuality.totalMonths} month
            {analysis.dataQuality.totalMonths !== 1 ? 's' : ''}. You can still manually tag
            transactions as recurring from the Transactions table.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const activeCount = analysis.recurring.filter((r) => r.status !== 'cancelled').length
  const priceChangeCount = analysis.priceChanges.length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Recurring Transactions
          </h2>
          <Badge className="bg-teal-100 text-teal-800">
            {formatCurrency(analysis.totalMonthlyRecurring)}/mo
          </Badge>
        </div>
        <Repeat className="h-6 w-6 text-muted-foreground" />
      </div>

      {/* Summary Stats */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl bg-gray-50 px-5 py-3 text-sm dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Monthly Total:</span>
          <span className="font-semibold text-teal-600">
            {formatCurrency(analysis.totalMonthlyRecurring)}
          </span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Active:</span>
          <span className="font-semibold text-blue-600">{activeCount}</span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Price Changes:</span>
          <span className="font-semibold text-amber-600">{priceChangeCount}</span>
        </div>
      </div>

      {/* Alerts */}
      <AlertsSection analysis={analysis} />

      {/* All Recurring Items */}
      {analysis.recurring.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
            All Recurring Payments
          </h3>
          <div className="space-y-2">
            {analysis.recurring.map((item) => (
              <RecurringItem
                key={item.merchantName}
                item={item}
                onRemove={onRemoveManualRecurring}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
