'use client'

import { format } from 'date-fns'
import { TrendingDown, CreditCard } from 'lucide-react'
import type { ExpenseReport } from '@/lib/types'

interface ExpenseSummaryProps {
  report: ExpenseReport
}

export function ExpenseSummary({ report }: ExpenseSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const cards = [
    {
      title: 'Total Spent',
      value: formatCurrency(report.totalSpent),
      icon: TrendingDown,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      title: 'Transactions',
      value: report.transactionCount.toString(),
      icon: CreditCard,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Financial Overview</h2>
        {report.dateRange.start && report.dateRange.end && (
          <div className="text-right">
            <p className="text-sm uppercase tracking-wide text-gray-500">Period</p>
            <p className="text-sm font-medium text-gray-700">
              {format(report.dateRange.start, 'MMM d, yyyy')} -{' '}
              {format(report.dateRange.end, 'MMM d, yyyy')}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="rounded-2xl border-2 border-gray-50 bg-white p-6 shadow-lg transition-all hover:border-gray-100 hover:shadow-xl"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className={`rounded-xl p-3 ${card.bgColor}`}>
                  <Icon className={`h-7 w-7 ${card.color}`} />
                </div>
              </div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {card.title}
              </h3>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          )
        })}
      </div>

      {report.largestCategory && (
        <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-purple-100">
                Top Spending Category
              </p>
              <p className="mb-1 text-2xl font-bold">{report.largestCategory.category}</p>
              <p className="text-purple-100">
                {formatCurrency(report.largestCategory.totalSpent)} •{' '}
                {report.largestCategory.percentage.toFixed(1)}% of total
              </p>
            </div>
            <div className="text-5xl font-bold text-white/20">#{1}</div>
          </div>
        </div>
      )}
    </div>
  )
}
