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
    return Array.from(new Set(localTransactions.map(t => t.category))).sort()
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
        className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:bg-green-50 hover:border-green-400 transition-all font-semibold text-gray-700"
      >
        <Table className="w-5 h-5 text-green-600" />
        Transactions
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Edit Transaction Categories</h2>
                  <p className="text-green-100 mt-1">
                    Click on any category to change it
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mt-4 flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-200" />
                  <input
                    type="text"
                    placeholder="Search by description or sector..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-200" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 bg-white/20 border border-white/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none cursor-pointer"
                  >
                    <option value="all" className="text-gray-900">All Categories</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat} className="text-gray-900">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white hover:bg-white/30 transition-colors"
                >
                  Reset All
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="text-sm text-gray-600 mb-4">
                Showing {filteredTransactions.length} of {localTransactions.length} transactions
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Description
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Sector
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                        Category
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction) => (
                      <tr
                        key={transaction.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {transaction.purchaseDate && !isNaN(transaction.purchaseDate.getTime())
                            ? format(transaction.purchaseDate, 'MMM d, yyyy')
                            : 'Invalid date'}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {transaction.bookingText}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {transaction.accountHolder}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {transaction.sector}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {editingId === transaction.id ? (
                            <select
                              value={transaction.category}
                              onChange={(e) => handleCategoryChange(transaction.id, e.target.value)}
                              onBlur={() => setEditingId(null)}
                              autoFocus
                              className="w-full px-3 py-1.5 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
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
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors group w-full justify-between"
                            >
                              <span className="text-sm font-medium">{transaction.category}</span>
                              <ChevronDown className="w-4 h-4 text-blue-500 group-hover:text-blue-700" />
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`text-sm font-semibold ${
                            (transaction.debit || 0) > 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {formatCurrency((transaction.debit || 0) - (transaction.credit || 0))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p>No transactions found</p>
                    <p className="text-sm mt-2">Try adjusting your filters</p>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                💡 Changes are applied immediately to charts and summaries
              </p>
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 transition-all font-medium shadow-md"
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
