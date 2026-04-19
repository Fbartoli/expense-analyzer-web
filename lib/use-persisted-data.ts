import { useState, useEffect, useCallback, useMemo } from 'react'
import { calculateBudgetStatus } from '@/lib/analyzer'
import {
  getAllBudgets,
  getAllHouseholdMembers,
  getAllManualRecurring,
  saveManualRecurring,
  deleteManualRecurring,
} from '@/lib/db'
import type {
  Transaction,
  Budget,
  BudgetWithSpending,
  HouseholdMember,
  ManualRecurringTransaction,
} from '@/lib/types'

interface UsePersistedDataParams {
  transactions: Transaction[]
  filteredTransactions: Transaction[]
  periodDateRange: { start: Date; end: Date } | null
  setError: (error: string | null) => void
}

interface UsePersistedDataReturn {
  budgets: Budget[]
  setBudgets: (budgets: Budget[]) => void
  budgetStatus: BudgetWithSpending[]
  householdMembers: HouseholdMember[]
  setHouseholdMembers: (members: HouseholdMember[]) => void
  manualRecurring: ManualRecurringTransaction[]
  manualRecurringFingerprints: Set<string>
  initialLoading: boolean
  loadBudgets: () => Promise<void>
  loadMembers: () => Promise<void>
  loadManualRecurring: () => Promise<void>
  handleMarkRecurring: (entry: Omit<ManualRecurringTransaction, 'id'>) => Promise<void>
  handleRemoveManualRecurring: (id: number) => Promise<void>
}

export function usePersistedData({
  transactions,
  filteredTransactions,
  periodDateRange,
  setError,
}: UsePersistedDataParams): UsePersistedDataReturn {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [budgetStatus, setBudgetStatus] = useState<BudgetWithSpending[]>([])
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([])
  const [manualRecurring, setManualRecurring] = useState<ManualRecurringTransaction[]>([])
  const [initialLoading, setInitialLoading] = useState(true)

  const manualRecurringFingerprints = useMemo(
    () => new Set(manualRecurring.map((r) => r.fingerprint)),
    [manualRecurring]
  )

  const loadBudgets = useCallback(async (): Promise<void> => {
    try {
      const savedBudgets = await getAllBudgets()
      setBudgets(savedBudgets)
    } catch (err) {
      console.error('Failed to load budgets:', err)
      setError('Failed to load budgets')
    }
  }, [setError])

  const loadMembers = useCallback(async (): Promise<void> => {
    try {
      const saved = await getAllHouseholdMembers()
      setHouseholdMembers(saved)
    } catch (err) {
      console.error('Failed to load household members:', err)
      setError('Failed to load household members')
    }
  }, [setError])

  const loadManualRecurring = useCallback(async (): Promise<void> => {
    try {
      const saved = await getAllManualRecurring()
      setManualRecurring(saved)
    } catch (err) {
      console.error('Failed to load manual recurring:', err)
      setError('Failed to load recurring transactions')
    }
  }, [setError])

  const handleMarkRecurring = useCallback(
    async (entry: Omit<ManualRecurringTransaction, 'id'>): Promise<void> => {
      try {
        await saveManualRecurring(entry)
        await loadManualRecurring()
      } catch (err) {
        console.error('Failed to save manual recurring:', err)
      }
    },
    [loadManualRecurring]
  )

  const handleRemoveManualRecurring = useCallback(
    async (id: number): Promise<void> => {
      try {
        await deleteManualRecurring(id)
        await loadManualRecurring()
      } catch (err) {
        console.error('Failed to remove manual recurring:', err)
      }
    },
    [loadManualRecurring]
  )

  // Budget status calculation
  useEffect(() => {
    const txnsToUse = filteredTransactions.length > 0 ? filteredTransactions : transactions
    if (txnsToUse.length > 0 && budgets.length > 0) {
      const status = calculateBudgetStatus(txnsToUse, budgets, periodDateRange?.start)
      setBudgetStatus(status)
    } else {
      setBudgetStatus([])
    }
  }, [transactions, filteredTransactions, budgets, periodDateRange])

  // Initialization
  useEffect(() => {
    async function initialize() {
      try {
        await Promise.all([loadBudgets(), loadMembers(), loadManualRecurring()])
      } finally {
        setInitialLoading(false)
      }
    }
    initialize()
  }, [loadBudgets, loadMembers, loadManualRecurring])

  return {
    budgets,
    setBudgets,
    budgetStatus,
    householdMembers,
    setHouseholdMembers,
    manualRecurring,
    manualRecurringFingerprints,
    initialLoading,
    loadBudgets,
    loadMembers,
    loadManualRecurring,
    handleMarkRecurring,
    handleRemoveManualRecurring,
  }
}
