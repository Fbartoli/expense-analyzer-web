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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{category}</h2>
              <p className="text-blue-100 mt-1">
                {transactions.length} transactions • {formatCurrency(totalSpent)} total
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm text-blue-100">Average Transaction</p>
              <p className="text-xl font-bold">{formatCurrency(avgTransaction)}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-sm text-blue-100">Total Spent</p>
              <p className="text-xl font-bold">{formatCurrency(totalSpent)}</p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-220px)] p-6">
          <div className="space-y-3">
            {transactions
              .sort((a, b) => (b.debit || 0) - (a.debit || 0))
              .map((transaction, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg">
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {transaction.bookingText}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                            <span>
                              {transaction.purchaseDate && !isNaN(transaction.purchaseDate.getTime())
                                ? format(transaction.purchaseDate, 'MMM d, yyyy')
                                : 'Invalid date'}
                            </span>
                            <span>•</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                              {transaction.sector}
                            </span>
                          </div>
                        </div>
                      </div>
                      {transaction.accountHolder && (
                        <p className="text-xs text-gray-500 mt-2 ml-12">
                          {transaction.accountHolder}
                        </p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(transaction.debit || 0)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {transaction.currency}
                      </p>
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
