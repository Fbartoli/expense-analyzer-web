'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Table, ChevronDown, Search, Filter, X } from 'lucide-react'
import { categorizeTransaction } from '@/lib/analyzer'
import { getAllCategories } from '@/lib/categories'
import type { Transaction } from '@/lib/types'

interface TransactionsTableProps {
  transactions: Transaction[]
  onUpdateCategories: (categoryOverrides: Map<number, string>) => void
}

interface TransactionWithCategory extends Transaction {
  category: string
}

export function TransactionsTable({ transactions, onUpdateCategories }: TransactionsTableProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [editingId, setEditingId] = useState<number | null>(null)

  // Add category to each transaction
  const transactionsWithCategories = useMemo(() => {
    return transactions.map((t, idx) => ({
      ...t,
      id: idx,
      category: categorizeTransaction(t),
    })) as (TransactionWithCategory & { id: number })[]
  }, [transactions])

  const [localTransactions, setLocalTransactions] = useState(transactionsWithCategories)
  const [overrides, setOverrides] = useState<Map<number, string>>(new Map())

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return localTransactions.filter((t) => {
      const matchesSearch =
        t.bookingText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.sector.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [localTransactions, searchTerm, categoryFilter])

  const categories = getAllCategories()
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(localTransactions.map((t) => t.category))).sort()
  }, [localTransactions])

  const handleCategoryChange = (id: number, newCategory: string) => {
    const updated = localTransactions.map((t) =>
      t.id === id ? { ...t, category: newCategory } : t
    )
    setLocalTransactions(updated)
    setEditingId(null)

    // Track the override
    const newOverrides = new Map(overrides)
    const originalCategory = categorizeTransaction(transactions[id])
    if (newCategory !== originalCategory) {
      newOverrides.set(id, newCategory)
    } else {
      newOverrides.delete(id)
    }
    setOverrides(newOverrides)

    // Notify parent component
    onUpdateCategories(newOverrides)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const handleReset = () => {
    setLocalTransactions(transactionsWithCategories)
    setOverrides(new Map())
    onUpdateCategories(new Map())
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 transition-all hover:border-green-400 hover:bg-green-50"
      >
        <Table className="h-5 w-5 text-green-600" />
        Transactions
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Edit Transaction Categories</h2>
                  <p className="mt-1 text-green-100">Click on any category to change it</p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 transition-colors hover:bg-white/20"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="mt-4 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-green-200" />
                  <input
                    type="text"
                    placeholder="Search by description or sector..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-lg border border-white/30 bg-white/20 py-2 pl-10 pr-4 text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-green-200" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="cursor-pointer appearance-none rounded-lg border border-white/30 bg-white/20 py-2 pl-10 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    <option value="all" className="text-gray-900">
                      All Categories
                    </option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat} className="text-gray-900">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleReset}
                  className="rounded-lg border border-white/30 bg-white/20 px-4 py-2 text-white transition-colors hover:bg-white/30"
                >
                  Reset All
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4 text-sm text-gray-600">
                Showing {filteredTransactions.length} of {localTransactions.length} transactions
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Sector
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                        Category
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {transaction.purchaseDate && !isNaN(transaction.purchaseDate.getTime())
                            ? format(transaction.purchaseDate, 'MMM d, yyyy')
                            : 'Invalid date'}
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {transaction.bookingText}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {transaction.accountHolder}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {transaction.sector}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {editingId === transaction.id ? (
                            <select
                              value={transaction.category}
                              onChange={(e) => handleCategoryChange(transaction.id, e.target.value)}
                              onBlur={() => setEditingId(null)}
                              autoFocus
                              className="w-full rounded-lg border border-blue-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => setEditingId(transaction.id)}
                              className="group flex w-full items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-blue-700 transition-colors hover:bg-blue-100"
                            >
                              <span className="text-sm font-medium">{transaction.category}</span>
                              <ChevronDown className="h-4 w-4 text-blue-500 group-hover:text-blue-700" />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className={`text-sm font-semibold ${
                              (transaction.debit || 0) > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {formatCurrency((transaction.debit || 0) - (transaction.credit || 0))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredTransactions.length === 0 && (
                  <div className="py-12 text-center text-gray-500">
                    <Search className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                    <p>No transactions found</p>
                    <p className="mt-2 text-sm">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t bg-gray-50 p-4">
              <p className="text-sm text-gray-600">
                💡 Changes are applied immediately to charts and summaries
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-gradient-to-r from-green-500 to-teal-600 px-6 py-2 font-medium text-white shadow-md transition-all hover:from-green-600 hover:to-teal-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
