import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useBalanceSheet } from '@/lib/use-balance-sheet'
import { db } from '@/lib/db'

describe('useBalanceSheet', () => {
  beforeEach(async () => {
    await db.accounts.clear()
    await db.balanceEntries.clear()
    await db.netWorthSnapshots.clear()
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await db.accounts.clear()
    await db.balanceEntries.clear()
    await db.netWorthSnapshots.clear()
  })

  it('starts in loading state and resolves empty', async () => {
    const { result } = renderHook(() => useBalanceSheet())
    expect(result.current.loading).toBe(true)
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
    expect(result.current.accounts).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.currentNetWorth.netWorth).toBe(0)
  })

  it('adds an account without an initial balance', async () => {
    const { result } = renderHook(() => useBalanceSheet())
    await waitFor(() => expect(result.current.loading).toBe(false))

    let ok = false
    await act(async () => {
      ok = await result.current.addAccount({
        name: 'UBS Checking',
        type: 'asset',
        category: 'checking',
        currency: 'CHF',
        notes: '',
      })
    })

    expect(ok).toBe(true)
    expect(result.current.accounts).toHaveLength(1)
    expect(result.current.accounts[0].name).toBe('UBS Checking')
    expect(result.current.latestBalances.size).toBe(0)
    expect(await db.balanceEntries.count()).toBe(0)
  })

  it('adds an account with an initial balance and records a balance entry', async () => {
    const { result } = renderHook(() => useBalanceSheet())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const initialBalanceDate = new Date('2026-03-15T12:00:00')
    await act(async () => {
      await result.current.addAccount({
        name: 'Savings',
        type: 'asset',
        category: 'savings',
        currency: 'CHF',
        notes: '',
        initialBalance: 5000,
        initialBalanceDate,
      })
    })

    expect(result.current.currentNetWorth.totalAssets).toBe(5000)
    const entries = await db.balanceEntries.toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0].amount).toBe(5000)
    expect(entries[0].date.getTime()).toBe(initialBalanceDate.getTime())
  })

  it('skips the balance entry when initialBalance is zero', async () => {
    const { result } = renderHook(() => useBalanceSheet())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addAccount({
        name: 'Cash',
        type: 'asset',
        category: 'cash',
        currency: 'CHF',
        notes: '',
        initialBalance: 0,
      })
    })

    expect(await db.balanceEntries.count()).toBe(0)
  })

  it('excludes archived accounts from currentNetWorth', async () => {
    const { result } = renderHook(() => useBalanceSheet())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addAccount({
        name: 'A',
        type: 'asset',
        category: 'checking',
        currency: 'CHF',
        notes: '',
        initialBalance: 1000,
      })
    })
    await act(async () => {
      await result.current.addAccount({
        name: 'B',
        type: 'asset',
        category: 'savings',
        currency: 'CHF',
        notes: '',
        initialBalance: 2000,
      })
    })
    expect(result.current.currentNetWorth.totalAssets).toBe(3000)

    const toArchive = result.current.accounts.find((a) => a.name === 'B')!
    await act(async () => {
      await result.current.archiveAccount(toArchive.id)
    })

    expect(result.current.accounts).toHaveLength(1)
    expect(result.current.currentNetWorth.totalAssets).toBe(1000)
  })

  it('updates a balance and surfaces the new value', async () => {
    const { result } = renderHook(() => useBalanceSheet())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addAccount({
        name: 'UBS',
        type: 'asset',
        category: 'checking',
        currency: 'CHF',
        notes: '',
        initialBalance: 1000,
        initialBalanceDate: new Date('2026-01-01'),
      })
    })

    const id = result.current.accounts[0].id
    await act(async () => {
      await result.current.updateBalance({
        accountId: id,
        amount: 1500,
        date: new Date('2026-04-01'),
        notes: 'bonus',
      })
    })

    expect(result.current.currentNetWorth.totalAssets).toBe(1500)
    const history = await result.current.getBalanceHistory(id)
    expect(history).toHaveLength(2)
  })

  it('takeSnapshot writes a snapshot and updates state', async () => {
    const { result } = renderHook(() => useBalanceSheet())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addAccount({
        name: 'UBS',
        type: 'asset',
        category: 'checking',
        currency: 'CHF',
        notes: '',
        initialBalance: 1000,
      })
    })

    expect(result.current.snapshots).toHaveLength(0)

    let ok = false
    await act(async () => {
      ok = await result.current.takeSnapshot()
    })

    expect(ok).toBe(true)
    expect(result.current.snapshots).toHaveLength(1)
    expect(result.current.snapshots[0].netWorth).toBe(1000)
  })

  it('mutations do not auto-create snapshots', async () => {
    const { result } = renderHook(() => useBalanceSheet())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addAccount({
        name: 'UBS',
        type: 'asset',
        category: 'checking',
        currency: 'CHF',
        notes: '',
        initialBalance: 1000,
      })
    })
    await act(async () => {
      await result.current.updateBalance({
        accountId: result.current.accounts[0].id,
        amount: 2000,
        date: new Date(),
        notes: '',
      })
    })

    // Snapshots must only be written when takeSnapshot() is called explicitly.
    expect(await db.netWorthSnapshots.count()).toBe(0)
  })

  it('sets error state when addAccount fails at the DB layer', async () => {
    const { result } = renderHook(() => useBalanceSheet())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const spy = vi.spyOn(db.accounts, 'add').mockRejectedValueOnce(new Error('boom'))

    let ok = true
    await act(async () => {
      ok = await result.current.addAccount({
        name: 'Fail',
        type: 'asset',
        category: 'checking',
        currency: 'CHF',
        notes: '',
      })
    })

    expect(ok).toBe(false)
    expect(result.current.error).toBe('Failed to add account.')

    act(() => result.current.clearError())
    expect(result.current.error).toBeNull()

    spy.mockRestore()
  })

  it('sets error state when updateBalance fails', async () => {
    const { result } = renderHook(() => useBalanceSheet())
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.addAccount({
        name: 'UBS',
        type: 'asset',
        category: 'checking',
        currency: 'CHF',
        notes: '',
      })
    })

    const spy = vi.spyOn(db.balanceEntries, 'add').mockRejectedValueOnce(new Error('quota'))

    let ok = true
    await act(async () => {
      ok = await result.current.updateBalance({
        accountId: result.current.accounts[0].id,
        amount: 100,
        date: new Date(),
        notes: '',
      })
    })

    expect(ok).toBe(false)
    expect(result.current.error).toBe('Failed to update balance.')
    spy.mockRestore()
  })
})
