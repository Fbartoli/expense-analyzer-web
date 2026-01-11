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

  const categories = getAllCategories().filter(c => c !== 'Income' && c !== 'Other')

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
  const availableCategories = categories.filter(
    c => !budgets.some(b => b.category === c)
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-amber-500 to-orange-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <PiggyBank className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Manage Budgets</h2>
              <p className="text-amber-100 text-sm">Set monthly spending limits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Add Budget Form */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Add New Budget</h3>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full p-3 pr-10 border-2 border-gray-200 rounded-xl bg-white appearance-none cursor-pointer hover:border-amber-300 focus:border-amber-500 focus:outline-none transition-colors text-sm"
                    >
                      <option value="">Select category...</option>
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Amount"
                      min="0"
                      step="50"
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none transition-colors text-sm"
                    />
                  </div>
                  <button
                    onClick={handleAddBudget}
                    disabled={!selectedCategory || !amount || saving}
                    className="px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Budget List */}
              {budgets.length === 0 ? (
                <div className="text-center py-8">
                  <PiggyBank className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">No budgets set</p>
                  <p className="text-gray-500 text-sm">Add a budget above to start tracking</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">Your Budgets</h3>
                  {budgets.map(budget => (
                    <div
                      key={budget.id}
                      className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{budget.category}</p>
                        <p className="text-amber-600 font-bold">{formatCurrency(budget.amount)}/month</p>
                      </div>
                      <button
                        onClick={() => handleDeleteBudget(budget.id!)}
                        className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                      >
                        <Trash2 className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
