'use client'

import { format } from 'date-fns'
import { TrendingDown, CreditCard } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
      bgColor: 'bg-red-50 dark:bg-red-950',
    },
    {
      title: 'Transactions',
      value: report.transactionCount.toString(),
      icon: CreditCard,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Financial Overview</h2>
        {report.dateRange.start && report.dateRange.end && (
          <div className="text-right">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Period</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
            <Card
              key={card.title}
              className="border-2 border-gray-50 shadow-lg transition-all hover:border-gray-100 hover:shadow-xl dark:hover:border-gray-800"
            >
              <CardContent className="p-6">
                <div className="mb-3 flex items-start justify-between">
                  <div className={`rounded-xl p-3 ${card.bgColor}`}>
                    <Icon className={`h-7 w-7 ${card.color}`} />
                  </div>
                </div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {card.title}
                </h3>
                <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              </CardContent>
            </Card>
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
