'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  Account,
  AccountCategory,
  AccountType,
  BalanceEntry,
  NetWorthSnapshot,
  PersistedAccount,
} from './types'
import {
  saveAccount as dbSaveAccount,
  getActiveAccounts,
  updateAccount as dbUpdateAccount,
  archiveAccount as dbArchiveAccount,
  saveBalanceEntry as dbSaveBalanceEntry,
  getLatestBalances as dbGetLatestBalances,
  getBalanceEntriesForAccount,
  saveNetWorthSnapshot,
  getAllNetWorthSnapshots,
} from './db'
import { computeNetWorth, buildSnapshot } from './net-worth'

export interface NewAccountInput {
  name: string
  type: AccountType
  category: AccountCategory
  currency: string
  notes: string
  memberId?: number
  initialBalance?: number
  initialBalanceDate?: Date
}

export interface UpdateBalanceInput {
  accountId: number
  amount: number
  date: Date
  notes: string
}

export interface UseBalanceSheetReturn {
  accounts: PersistedAccount[]
  latestBalances: Map<number, BalanceEntry>
  snapshots: NetWorthSnapshot[]
  currentNetWorth: {
    totalAssets: number
    totalLiabilities: number
    netWorth: number
  }
  loading: boolean
  error: string | null

  // Mutations return true on success, false on failure (error state set).
  addAccount: (input: NewAccountInput) => Promise<boolean>
  editAccount: (id: number, updates: Partial<Omit<Account, 'id'>>) => Promise<boolean>
  archiveAccount: (id: number) => Promise<boolean>
  updateBalance: (input: UpdateBalanceInput) => Promise<boolean>
  getBalanceHistory: (accountId: number) => Promise<BalanceEntry[]>
  takeSnapshot: () => Promise<boolean>

  clearError: () => void
  reload: () => Promise<void>
}

export function useBalanceSheet(): UseBalanceSheetReturn {
  const [accounts, setAccounts] = useState<PersistedAccount[]>([])
  const [latestBalances, setLatestBalances] = useState<Map<number, BalanceEntry>>(new Map())
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    try {
      const [accts, balances, snaps] = await Promise.all([
        getActiveAccounts(),
        dbGetLatestBalances(),
        getAllNetWorthSnapshots(),
      ])
      setAccounts(accts)
      setLatestBalances(balances)
      setSnapshots(snaps)
    } catch (err) {
      console.error('Failed to load balance sheet data:', err)
      setError('Failed to load balance sheet data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const currentNetWorth = useMemo(() => {
    const balanceAmounts = new Map<number, number>()
    latestBalances.forEach((entry, accountId) => {
      balanceAmounts.set(accountId, entry.amount)
    })
    return computeNetWorth(accounts, balanceAmounts)
  }, [accounts, latestBalances])

  const addAccount = useCallback(
    async (input: NewAccountInput): Promise<boolean> => {
      try {
        const { initialBalance, initialBalanceDate, memberId, ...rest } = input
        const id = await dbSaveAccount({
          ...rest,
          createdDate: new Date(),
          archived: false,
          ...(memberId !== undefined ? { memberId } : {}),
        })

        if (initialBalance !== undefined && initialBalance !== 0) {
          await dbSaveBalanceEntry({
            accountId: id,
            amount: initialBalance,
            date: initialBalanceDate ?? new Date(),
            notes: 'Initial balance',
          })
        }

        await loadAll()
        return true
      } catch (err) {
        console.error('Failed to add account:', err)
        setError('Failed to add account.')
        return false
      }
    },
    [loadAll]
  )

  const editAccount = useCallback(
    async (id: number, updates: Partial<Omit<Account, 'id'>>): Promise<boolean> => {
      try {
        await dbUpdateAccount(id, updates)
        await loadAll()
        return true
      } catch (err) {
        console.error('Failed to edit account:', err)
        setError('Failed to edit account.')
        return false
      }
    },
    [loadAll]
  )

  const archiveAccount = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await dbArchiveAccount(id)
        await loadAll()
        return true
      } catch (err) {
        console.error('Failed to archive account:', err)
        setError('Failed to archive account.')
        return false
      }
    },
    [loadAll]
  )

  const updateBalance = useCallback(
    async (input: UpdateBalanceInput): Promise<boolean> => {
      try {
        await dbSaveBalanceEntry(input)
        await loadAll()
        return true
      } catch (err) {
        console.error('Failed to update balance:', err)
        setError('Failed to update balance.')
        return false
      }
    },
    [loadAll]
  )

  const getBalanceHistory = useCallback(async (accountId: number) => {
    return await getBalanceEntriesForAccount(accountId)
  }, [])

  const takeSnapshot = useCallback(async (): Promise<boolean> => {
    try {
      const balanceAmounts = new Map<number, number>()
      latestBalances.forEach((entry, accountId) => {
        balanceAmounts.set(accountId, entry.amount)
      })
      const snapshot = buildSnapshot(accounts, balanceAmounts, new Date())
      await saveNetWorthSnapshot(snapshot)
      const snaps = await getAllNetWorthSnapshots()
      setSnapshots(snaps)
      return true
    } catch (err) {
      console.error('Failed to take snapshot:', err)
      setError('Failed to save snapshot.')
      return false
    }
  }, [accounts, latestBalances])

  const clearError = useCallback(() => setError(null), [])

  return {
    accounts,
    latestBalances,
    snapshots,
    currentNetWorth,
    loading,
    error,
    addAccount,
    editAccount,
    archiveAccount,
    updateBalance,
    getBalanceHistory,
    takeSnapshot,
    clearError,
    reload: loadAll,
  }
}
