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
    <div className="rounded-2xl border-2 border-gray-50 bg-white p-8 shadow-xl">
      <div className="mb-8">
        <h2 className="mb-2 text-3xl font-bold text-gray-900">Top 10 Expenses</h2>
        <p className="text-gray-600">Your highest transactions this period</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wide text-gray-700">
                Date
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wide text-gray-700">
                Description
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold uppercase tracking-wide text-gray-700">
                Category
              </th>
              <th className="px-6 py-4 text-right text-sm font-bold uppercase tracking-wide text-gray-700">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr
                key={index}
                className="group border-b border-gray-100 transition-colors hover:bg-gray-50"
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-600">
                  {transaction.purchaseDate && !isNaN(transaction.purchaseDate.getTime())
                    ? format(transaction.purchaseDate, 'MMM d, yyyy')
                    : 'Invalid date'}
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-base font-semibold text-gray-900 transition-colors group-hover:text-blue-600">
                      {transaction.bookingText}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{transaction.accountHolder}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center rounded-xl bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-700">
                    {transaction.sector}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-lg font-bold text-red-600">
                      {formatCurrency(transaction.debit || 0)}
                    </span>
                    <ArrowUpRight className="h-5 w-5 text-red-500" />
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
