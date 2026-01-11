'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, PiggyBank, ChevronDown } from 'lucide-react'
import { getAllBudgets, saveBudget, deleteBudget } from '@/lib/db'
import { getAllCategories } from '@/lib/categories'
import type { Budget } from '@/lib/types'

interface BudgetManagerProps {
  isOpen: boolean
  onClose: () => void
  onBudgetsChange: () => void
}

export function BudgetManager({ isOpen, onClose, onBudgetsChange }: BudgetManagerProps) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [saving, setSaving] = useState(false)

  const categories = getAllCategories().filter((c) => c !== 'Income' && c !== 'Other')

  useEffect(() => {
    if (isOpen) {
      loadBudgets()
    }
  }, [isOpen])

  const loadBudgets = async () => {
    setLoading(true)
    try {
      const data = await getAllBudgets()
      setBudgets(data)
    } catch (err) {
      console.error('Failed to load budgets:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBudget = async () => {
    if (!selectedCategory || !amount || parseFloat(amount) <= 0) return

    setSaving(true)
    try {
      await saveBudget(selectedCategory, parseFloat(amount))
      await loadBudgets()
      onBudgetsChange()
      setSelectedCategory('')
      setAmount('')
    } catch (err) {
      console.error('Failed to save budget:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteBudget = async (id: number) => {
    try {
      await deleteBudget(id)
      await loadBudgets()
      onBudgetsChange()
    } catch (err) {
      console.error('Failed to delete budget:', err)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  // Get categories that don't have budgets yet
  const availableCategories = categories.filter((c) => !budgets.some((b) => b.category === c))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-amber-500 to-orange-500 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <PiggyBank className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Manage Budgets</h2>
              <p className="text-sm text-amber-100">Set monthly spending limits</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 transition-colors hover:bg-white/20">
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Add Budget Form */}
              <div className="rounded-xl bg-gray-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Add New Budget</h3>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white p-3 pr-10 text-sm transition-colors hover:border-amber-300 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="">Select category...</option>
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Amount"
                      min="0"
                      step="50"
                      className="w-full rounded-xl border-2 border-gray-200 p-3 text-sm transition-colors focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={handleAddBudget}
                    disabled={!selectedCategory || !amount || saving}
                    className="rounded-xl bg-amber-500 px-4 py-3 text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Budget List */}
              {budgets.length === 0 ? (
                <div className="py-8 text-center">
                  <PiggyBank className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="font-medium text-gray-600">No budgets set</p>
                  <p className="text-sm text-gray-500">Add a budget above to start tracking</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">Your Budgets</h3>
                  {budgets.map((budget) => (
                    <div
                      key={budget.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{budget.category}</p>
                        <p className="font-bold text-amber-600">
                          {formatCurrency(budget.amount)}/month
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteBudget(budget.id!)}
                        className="group rounded-lg p-2 transition-colors hover:bg-red-50"
                      >
                        <Trash2 className="h-5 w-5 text-gray-400 group-hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-gray-200 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-300"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
