'use client'

import { format } from 'date-fns'
import { ArrowUpRight } from 'lucide-react'
import type { Transaction } from '@/lib/types'

interface TopExpensesProps {
  transactions: Transaction[]
}

export function TopExpenses({ transactions }: TopExpensesProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-50">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Top 10 Expenses</h2>
        <p className="text-gray-600">Your highest transactions this period</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wide">
                Date
              </th>
              <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wide">
                Description
              </th>
              <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wide">
                Category
              </th>
              <th className="text-right py-4 px-6 text-sm font-bold text-gray-700 uppercase tracking-wide">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr
                key={index}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <td className="py-4 px-6 text-sm text-gray-600 font-medium">
                  {transaction.purchaseDate && !isNaN(transaction.purchaseDate.getTime())
                    ? format(transaction.purchaseDate, 'MMM d, yyyy')
                    : 'Invalid date'}
                </td>
                <td className="py-4 px-6">
                  <div>
                    <p className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {transaction.bookingText}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {transaction.accountHolder}
                    </p>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold bg-blue-100 text-blue-700">
                    {transaction.sector}
                  </span>
                </td>
                <td className="py-4 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-lg font-bold text-red-600">
                      {formatCurrency(transaction.debit || 0)}
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-red-500" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
