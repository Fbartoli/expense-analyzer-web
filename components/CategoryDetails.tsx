'use client'

import { format } from 'date-fns'
import { X, TrendingDown } from 'lucide-react'
import type { Transaction } from '@/lib/types'

interface CategoryDetailsProps {
  category: string
  transactions: Transaction[]
  onClose: () => void
}

export function CategoryDetails({ category, transactions, onClose }: CategoryDetailsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const totalSpent = transactions.reduce((sum, t) => sum + (t.debit || 0), 0)
  const avgTransaction = totalSpent / transactions.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{category}</h2>
              <p className="mt-1 text-blue-100">
                {transactions.length} transactions • {formatCurrency(totalSpent)} total
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 transition-colors hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-white/10 p-3">
              <p className="text-sm text-blue-100">Average Transaction</p>
              <p className="text-xl font-bold">{formatCurrency(avgTransaction)}</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <p className="text-sm text-blue-100">Total Spent</p>
              <p className="text-xl font-bold">{formatCurrency(totalSpent)}</p>
            </div>
          </div>
        </div>

        <div className="max-h-[calc(90vh-220px)] overflow-y-auto p-6">
          <div className="space-y-3">
            {transactions
              .sort((a, b) => (b.debit || 0) - (a.debit || 0))
              .map((transaction, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-red-50 p-2">
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{transaction.bookingText}</h3>
                          <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                            <span>
                              {transaction.purchaseDate &&
                              !isNaN(transaction.purchaseDate.getTime())
                                ? format(transaction.purchaseDate, 'MMM d, yyyy')
                                : 'Invalid date'}
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                              {transaction.sector}
                            </span>
                          </div>
                        </div>
                      </div>
                      {transaction.accountHolder && (
                        <p className="ml-12 mt-2 text-xs text-gray-500">
                          {transaction.accountHolder}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(transaction.debit || 0)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{transaction.currency}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
