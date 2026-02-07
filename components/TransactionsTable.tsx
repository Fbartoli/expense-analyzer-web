'use client'

import { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Table as TableIcon,
  ChevronDown,
  Search,
  Filter,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Users,
} from 'lucide-react'
import { categorizeTransaction } from '@/lib/analyzer'
import { getAllCategories } from '@/lib/categories'
import { getMemberForTransaction } from '@/lib/members'
import { transactionFingerprint } from '@/lib/recurring'
import { MarkRecurringButton } from './MarkRecurringButton'
import type { Transaction, HouseholdMember, ManualRecurringTransaction } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface TransactionsTableProps {
  transactions: Transaction[]
  onUpdateCategories: (categoryOverrides: Map<number, string>) => void
  members?: HouseholdMember[]
  memberOverrides?: Map<number, string>
  onUpdateMembers?: (overrides: Map<number, string>) => void
  onMarkRecurring?: (entry: Omit<ManualRecurringTransaction, 'id'>) => void
  taggedFingerprints?: Set<string>
}

interface TransactionWithCategory extends Transaction {
  category: string
  member: string | null
}

type SortField = 'date' | 'description' | 'category' | 'amount' | 'member'
type SortDirection = 'asc' | 'desc'

interface SortConfig {
  field: SortField
  direction: SortDirection
}

export function TransactionsTable({
  transactions,
  onUpdateCategories,
  members = [],
  memberOverrides = new Map(),
  onUpdateMembers,
  onMarkRecurring,
  taggedFingerprints,
}: TransactionsTableProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [memberFilter, setMemberFilter] = useState<string>('all')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null)
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null)

  const hasMembers = members.length > 0

  const transactionsWithCategories = useMemo(() => {
    return transactions.map((t, idx) => ({
      ...t,
      id: idx,
      category: categorizeTransaction(t),
      member: getMemberForTransaction(idx, t, members, memberOverrides),
    })) as (TransactionWithCategory & { id: number })[]
  }, [transactions, members, memberOverrides])

  const [localTransactions, setLocalTransactions] = useState(transactionsWithCategories)
  const [overrides, setOverrides] = useState<Map<number, string>>(new Map())

  useEffect(() => {
    setLocalTransactions(transactionsWithCategories)
    setOverrides(new Map())
  }, [transactionsWithCategories])

  const filteredTransactions = useMemo(() => {
    let result = localTransactions.filter((t) => {
      const matchesSearch =
        t.bookingText.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.sector.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter

      const matchesMember =
        memberFilter === 'all' ||
        (memberFilter === 'unassigned' && !t.member) ||
        t.member === memberFilter

      const amount = Math.abs((t.debit || 0) - (t.credit || 0))
      const matchesMinAmount = minAmount === '' || amount >= parseFloat(minAmount)
      const matchesMaxAmount = maxAmount === '' || amount <= parseFloat(maxAmount)

      return (
        matchesSearch && matchesCategory && matchesMember && matchesMinAmount && matchesMaxAmount
      )
    })

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const dir = sortConfig.direction === 'asc' ? 1 : -1
        switch (sortConfig.field) {
          case 'date': {
            const dateA = a.purchaseDate?.getTime() || 0
            const dateB = b.purchaseDate?.getTime() || 0
            return (dateA - dateB) * dir
          }
          case 'description':
            return a.bookingText.localeCompare(b.bookingText) * dir
          case 'category':
            return a.category.localeCompare(b.category) * dir
          case 'amount': {
            const amtA = (a.debit || 0) - (a.credit || 0)
            const amtB = (b.debit || 0) - (b.credit || 0)
            return (amtA - amtB) * dir
          }
          case 'member':
            return (a.member || '').localeCompare(b.member || '') * dir
        }
      })
    }

    return result
  }, [
    localTransactions,
    searchTerm,
    categoryFilter,
    memberFilter,
    minAmount,
    maxAmount,
    sortConfig,
  ])

  const categories = getAllCategories()
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(localTransactions.map((t) => t.category))).sort()
  }, [localTransactions])

  const uniqueMembers = useMemo(() => {
    return Array.from(
      new Set(localTransactions.map((t) => t.member).filter(Boolean) as string[])
    ).sort()
  }, [localTransactions])

  const handleCategoryChange = (id: number, newCategory: string) => {
    const updated = localTransactions.map((t) =>
      t.id === id ? { ...t, category: newCategory } : t
    )
    setLocalTransactions(updated)
    setEditingId(null)

    const newOverrides = new Map(overrides)
    const originalCategory = categorizeTransaction(transactions[id])
    if (newCategory !== originalCategory) {
      newOverrides.set(id, newCategory)
    } else {
      newOverrides.delete(id)
    }
    setOverrides(newOverrides)

    onUpdateCategories(newOverrides)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const handleMemberChange = (id: number, newMember: string) => {
    const updated = localTransactions.map((t) =>
      t.id === id ? { ...t, member: newMember || null } : t
    )
    setLocalTransactions(updated)
    setEditingMemberId(null)

    if (onUpdateMembers) {
      const newOverrides = new Map(memberOverrides)
      if (newMember === '') {
        newOverrides.delete(id)
      } else {
        newOverrides.set(id, newMember)
      }
      onUpdateMembers(newOverrides)
    }
  }

  const handleReset = () => {
    setLocalTransactions(transactionsWithCategories)
    setOverrides(new Map())
    setMinAmount('')
    setMaxAmount('')
    setSortConfig(null)
    setMemberFilter('all')
    onUpdateCategories(new Map())
    if (onUpdateMembers) onUpdateMembers(new Map())
  }

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => {
      if (!prev || prev.field !== field) return { field, direction: 'asc' }
      if (prev.direction === 'asc') return { field, direction: 'desc' }
      return null
    })
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (!sortConfig || sortConfig.field !== field) {
      return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-50" />
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="ml-1 inline h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 inline h-3 w-3" />
    )
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="rounded-xl border-2 px-6 py-3 font-semibold"
      >
        <TableIcon className="mr-2 h-5 w-5 text-green-600" />
        Transactions
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(false)}>
        <DialogContent className="flex max-h-[90vh] max-w-7xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 bg-gradient-to-r from-green-500 to-teal-600 p-6 text-white">
            <DialogTitle className="text-2xl font-bold text-white">
              Edit Transaction Categories
            </DialogTitle>
            <DialogDescription className="text-green-100">
              Click on any category to change it
            </DialogDescription>

            <div className="mt-4 flex flex-wrap gap-4">
              <div className="relative flex-1">
                <label htmlFor="transactions-search" className="sr-only">
                  Search transactions
                </label>
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-green-200" />
                <input
                  id="transactions-search"
                  type="text"
                  placeholder="Search by description or sector..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-white/30 bg-white/20 py-2 pl-10 pr-4 text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>

              <div className="relative">
                <label htmlFor="transactions-category-filter" className="sr-only">
                  Filter by category
                </label>
                <Filter className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-green-200" />
                <select
                  id="transactions-category-filter"
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

              {hasMembers && (
                <div className="relative">
                  <label htmlFor="transactions-member-filter" className="sr-only">
                    Filter by member
                  </label>
                  <Users className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-green-200" />
                  <select
                    id="transactions-member-filter"
                    value={memberFilter}
                    onChange={(e) => setMemberFilter(e.target.value)}
                    className="cursor-pointer appearance-none rounded-lg border border-white/30 bg-white/20 py-2 pl-10 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-white/50"
                  >
                    <option value="all" className="text-gray-900">
                      All Members
                    </option>
                    <option value="unassigned" className="text-gray-900">
                      Unassigned
                    </option>
                    {uniqueMembers.map((m) => (
                      <option key={m} value={m} className="text-gray-900">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button
                variant="secondary"
                onClick={handleReset}
                className="border border-white/30 bg-white/20 text-white hover:bg-white/30"
              >
                Reset All
              </Button>
            </div>

            <div className="mt-3 flex gap-3">
              <div className="relative">
                <label htmlFor="transactions-min-amount" className="sr-only">
                  Minimum amount
                </label>
                <input
                  id="transactions-min-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Min CHF"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="w-32 rounded-lg border border-white/30 bg-white/20 px-3 py-2 text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
              <div className="relative">
                <label htmlFor="transactions-max-amount" className="sr-only">
                  Maximum amount
                </label>
                <input
                  id="transactions-max-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Max CHF"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="w-32 rounded-lg border border-white/30 bg-white/20 px-3 py-2 text-white placeholder-green-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="mb-4 text-sm text-muted-foreground">
              Showing {filteredTransactions.length} of {localTransactions.length} transactions
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
                    <TableHead
                      className="cursor-pointer select-none text-sm font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                      onClick={() => handleSort('date')}
                    >
                      Date
                      <SortIcon field="date" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-sm font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                      onClick={() => handleSort('description')}
                    >
                      Description
                      <SortIcon field="description" />
                    </TableHead>
                    <TableHead className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Sector
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none text-sm font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                      onClick={() => handleSort('category')}
                    >
                      Category
                      <SortIcon field="category" />
                    </TableHead>
                    {hasMembers && (
                      <TableHead
                        className="cursor-pointer select-none text-sm font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                        onClick={() => handleSort('member')}
                      >
                        Member
                        <SortIcon field="member" />
                      </TableHead>
                    )}
                    <TableHead
                      className="cursor-pointer select-none text-right text-sm font-semibold text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
                      onClick={() => handleSort('amount')}
                    >
                      Amount
                      <SortIcon field="amount" />
                    </TableHead>
                    {onMarkRecurring && (
                      <TableHead className="text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Actions
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow
                      key={transaction.id}
                      className="border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        {transaction.purchaseDate && !isNaN(transaction.purchaseDate.getTime())
                          ? format(transaction.purchaseDate, 'MMM d, yyyy')
                          : 'Invalid date'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {transaction.bookingText}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {transaction.accountHolder}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {transaction.sector}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {editingId === transaction.id ? (
                          <select
                            ref={(el) => {
                              if (el) {
                                requestAnimationFrame(() => {
                                  try {
                                    el.showPicker()
                                  } catch {
                                    el.focus()
                                  }
                                })
                              }
                            }}
                            value={transaction.category}
                            onChange={(e) => handleCategoryChange(transaction.id, e.target.value)}
                            onBlur={() => setEditingId(null)}
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
                            className="group flex w-full items-center justify-between gap-2 rounded-lg bg-blue-50 px-3 py-1.5 text-blue-700 transition-colors hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
                          >
                            <span className="text-sm font-medium">{transaction.category}</span>
                            <ChevronDown className="h-4 w-4 text-blue-500 group-hover:text-blue-700" />
                          </button>
                        )}
                      </TableCell>
                      {hasMembers && (
                        <TableCell>
                          {editingMemberId === transaction.id ? (
                            <select
                              ref={(el) => {
                                if (el) {
                                  requestAnimationFrame(() => {
                                    try {
                                      el.showPicker()
                                    } catch {
                                      el.focus()
                                    }
                                  })
                                }
                              }}
                              value={transaction.member || ''}
                              onChange={(e) => handleMemberChange(transaction.id, e.target.value)}
                              onBlur={() => setEditingMemberId(null)}
                              className="w-full rounded-lg border border-indigo-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">Unassigned</option>
                              {members.map((m) => (
                                <option key={m.id} value={m.name}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => setEditingMemberId(transaction.id)}
                              className="group flex w-full items-center justify-between gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900"
                            >
                              <span className="text-sm font-medium">
                                {transaction.member || 'Unassigned'}
                              </span>
                              <ChevronDown className="h-4 w-4 text-indigo-500 group-hover:text-indigo-700" />
                            </button>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <span
                          className={`text-sm font-semibold ${
                            (transaction.debit || 0) > 0 ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {formatCurrency((transaction.debit || 0) - (transaction.credit || 0))}
                        </span>
                      </TableCell>
                      {onMarkRecurring && (
                        <TableCell className="text-center">
                          <MarkRecurringButton
                            transaction={transaction}
                            isAlreadyTagged={
                              taggedFingerprints?.has(transactionFingerprint(transaction)) ?? false
                            }
                            onMarkRecurring={onMarkRecurring}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredTransactions.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <Search className="mx-auto mb-4 h-16 w-16 text-gray-300 dark:text-gray-600" />
                  <p>No transactions found</p>
                  <p className="mt-2 text-sm">Try adjusting your filters</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex shrink-0 items-center justify-between border-t bg-gray-50 p-4 dark:bg-gray-900">
            <p className="text-sm text-muted-foreground">
              Changes are applied immediately to charts and summaries
            </p>
            <Button
              onClick={() => setIsOpen(false)}
              className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
