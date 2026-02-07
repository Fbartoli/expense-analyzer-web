'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, PiggyBank, ChevronDown } from 'lucide-react'
import { getAllBudgets, saveBudget, deleteBudget } from '@/lib/db'
import { getAllCategories } from '@/lib/categories'
import type { Budget } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'

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
  const [error, setError] = useState<string | null>(null)

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
      setError('Failed to load budgets.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddBudget = async () => {
    if (!selectedCategory || !amount || parseFloat(amount) <= 0) return

    setSaving(true)
    setError(null)
    try {
      await saveBudget(selectedCategory, parseFloat(amount))
      await loadBudgets()
      onBudgetsChange()
      setSelectedCategory('')
      setAmount('')
    } catch (err) {
      console.error('Failed to save budget:', err)
      setError('Failed to save budget.')
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
      setError('Failed to delete budget.')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const availableCategories = categories.filter((c) => !budgets.some((b) => b.category === c))

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden p-0">
        {/* Gradient Header */}
        <DialogHeader className="border-b bg-gradient-to-r from-amber-500 to-orange-500 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <PiggyBank className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-white">Manage Budgets</DialogTitle>
              <DialogDescription className="text-sm text-amber-100">
                Set monthly spending limits
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setError(null)}
                  className="h-auto p-0"
                >
                  Dismiss
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Add Budget Form */}
              <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-900">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Add New Budget
                </h3>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Label htmlFor="budget-category" className="sr-only">
                      Category
                    </Label>
                    <select
                      id="budget-category"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full cursor-pointer appearance-none rounded-xl border-2 border-gray-200 bg-white p-3 pr-10 text-sm transition-colors hover:border-amber-300 focus:border-amber-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
                    >
                      <option value="">Select category...</option>
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  </div>
                  <div className="w-32">
                    <Label htmlFor="budget-amount" className="sr-only">
                      Amount
                    </Label>
                    <Input
                      id="budget-amount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Amount"
                      min="0"
                      step="50"
                      className="h-[46px] rounded-xl border-2"
                    />
                  </div>
                  <Button
                    onClick={handleAddBudget}
                    disabled={!selectedCategory || !amount || saving}
                    className="h-[46px] bg-amber-500 hover:bg-amber-600"
                    aria-label="Add budget"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Budget List */}
              {budgets.length === 0 ? (
                <div className="py-8 text-center">
                  <PiggyBank className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
                  <p className="font-medium text-gray-600 dark:text-gray-400">No budgets set</p>
                  <p className="text-sm text-muted-foreground">
                    Add a budget above to start tracking
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Your Budgets
                  </h3>
                  {budgets.map((budget) => (
                    <div
                      key={budget.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 dark:border-gray-700 dark:bg-gray-950 dark:hover:border-gray-600"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          {budget.category}
                        </p>
                        <p className="font-bold text-amber-600">
                          {formatCurrency(budget.amount)}/month
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBudget(budget.id!)}
                        className="text-gray-400 hover:bg-red-50 hover:text-red-500 dark:text-gray-500 dark:hover:bg-red-950"
                        aria-label="Delete budget"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <DialogFooter className="border-t bg-gray-50 p-4 dark:bg-gray-900">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
