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
            <p className="text-sm text-gray-500 uppercase tracking-wide">Period</p>
            <p className="text-sm font-medium text-gray-700">
              {format(report.dateRange.start, 'MMM d, yyyy')} - {format(report.dateRange.end, 'MMM d, yyyy')}
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-50 hover:shadow-xl hover:border-gray-100 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-3 rounded-xl ${card.bgColor}`}>
                  <Icon className={`w-7 h-7 ${card.color}`} />
                </div>
              </div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{card.title}</h3>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          )
        })}
      </div>

      {report.largestCategory && (
        <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-semibold uppercase tracking-wide mb-2">Top Spending Category</p>
              <p className="text-2xl font-bold mb-1">
                {report.largestCategory.category}
              </p>
              <p className="text-purple-100">
                {formatCurrency(report.largestCategory.totalSpent)} • {report.largestCategory.percentage.toFixed(1)}% of total
              </p>
            </div>
            <div className="text-5xl font-bold text-white/20">
              #{1}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
