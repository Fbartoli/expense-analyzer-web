import { describe, it, expect } from 'vitest'
import {
  ACCOUNT_CATEGORY_LABELS,
  ASSET_CATEGORY_OPTIONS,
  LIABILITY_CATEGORY_OPTIONS,
  categoryToType,
  computeNetWorth,
  buildSnapshot,
  computeNetWorthChange,
} from '@/lib/net-worth'
import type { NetWorthSnapshot, PersistedAccount } from '@/lib/types'

function account(overrides: Partial<PersistedAccount> = {}): PersistedAccount {
  return {
    id: 1,
    name: 'Test',
    type: 'asset',
    category: 'checking',
    currency: 'CHF',
    notes: '',
    createdDate: new Date('2026-01-01'),
    archived: false,
    ...overrides,
  }
}

describe('net-worth: category arrays', () => {
  it('ACCOUNT_CATEGORY_LABELS covers every AccountCategory', () => {
    // Every AccountCategory literal must have a human-readable label.
    const allCategories = [...ASSET_CATEGORY_OPTIONS, ...LIABILITY_CATEGORY_OPTIONS]
    for (const cat of allCategories) {
      expect(ACCOUNT_CATEGORY_LABELS[cat]).toBeTruthy()
    }
  })

  it('ASSET and LIABILITY option lists partition the label keys', () => {
    const labelKeys = Object.keys(ACCOUNT_CATEGORY_LABELS).sort()
    const combined = [...ASSET_CATEGORY_OPTIONS, ...LIABILITY_CATEGORY_OPTIONS].sort()
    expect(combined).toEqual(labelKeys)
    const intersection = ASSET_CATEGORY_OPTIONS.filter((c) =>
      LIABILITY_CATEGORY_OPTIONS.includes(c)
    )
    expect(intersection).toEqual([])
  })

  it('categoryToType maps assets and liabilities correctly', () => {
    for (const c of ASSET_CATEGORY_OPTIONS) {
      expect(categoryToType(c)).toBe('asset')
    }
    for (const c of LIABILITY_CATEGORY_OPTIONS) {
      expect(categoryToType(c)).toBe('liability')
    }
  })
})

describe('net-worth: computeNetWorth', () => {
  it('returns zeros for empty accounts', () => {
    const result = computeNetWorth([], new Map())
    expect(result.totalAssets).toBe(0)
    expect(result.totalLiabilities).toBe(0)
    expect(result.netWorth).toBe(0)
    expect(result.byCategory.size).toBe(0)
  })

  it('sums assets only when no liabilities present', () => {
    const accounts: PersistedAccount[] = [
      account({ id: 1, type: 'asset', category: 'checking' }),
      account({ id: 2, type: 'asset', category: 'savings' }),
    ]
    const balances = new Map([
      [1, 1000],
      [2, 2500],
    ])
    const result = computeNetWorth(accounts, balances)
    expect(result.totalAssets).toBe(3500)
    expect(result.totalLiabilities).toBe(0)
    expect(result.netWorth).toBe(3500)
    expect(result.byCategory.get('checking')).toBe(1000)
    expect(result.byCategory.get('savings')).toBe(2500)
  })

  it('sums liabilities only when no assets present', () => {
    const accounts: PersistedAccount[] = [
      account({
        id: 1,
        type: 'liability',
        category: 'credit-card',
      }),
    ]
    const balances = new Map([[1, 800]])
    const result = computeNetWorth(accounts, balances)
    expect(result.totalAssets).toBe(0)
    expect(result.totalLiabilities).toBe(800)
    expect(result.netWorth).toBe(-800)
  })

  it('nets assets and liabilities', () => {
    const accounts: PersistedAccount[] = [
      account({ id: 1, type: 'asset', category: 'checking' }),
      account({
        id: 2,
        type: 'liability',
        category: 'mortgage',
      }),
    ]
    const balances = new Map([
      [1, 10_000],
      [2, 3_500],
    ])
    const result = computeNetWorth(accounts, balances)
    expect(result.netWorth).toBe(6_500)
  })

  it('excludes archived accounts', () => {
    const accounts: PersistedAccount[] = [
      account({ id: 1, type: 'asset' }),
      account({ id: 2, type: 'asset', archived: true }),
    ]
    const balances = new Map([
      [1, 1000],
      [2, 9999],
    ])
    const result = computeNetWorth(accounts, balances)
    expect(result.totalAssets).toBe(1000)
    expect(result.byCategory.has('checking')).toBe(true)
    expect(result.byCategory.get('checking')).toBe(1000)
  })

  it('treats accounts without a balance entry as zero', () => {
    const accounts: PersistedAccount[] = [
      account({ id: 1, type: 'asset' }),
      account({ id: 2, type: 'asset', category: 'savings' }),
    ]
    const balances = new Map([[1, 500]])
    const result = computeNetWorth(accounts, balances)
    expect(result.totalAssets).toBe(500)
    expect(result.byCategory.get('savings')).toBe(0)
  })

  it('aggregates same-category accounts into byCategory totals', () => {
    const accounts: PersistedAccount[] = [
      account({ id: 1, category: 'checking' }),
      account({ id: 2, category: 'checking' }),
    ]
    const balances = new Map([
      [1, 100],
      [2, 200],
    ])
    const result = computeNetWorth(accounts, balances)
    expect(result.byCategory.get('checking')).toBe(300)
  })
})

describe('net-worth: buildSnapshot', () => {
  it('materializes totals and excludes archived accounts from accountBalances', () => {
    const date = new Date('2026-04-19')
    const accounts: PersistedAccount[] = [
      account({ id: 1, name: 'UBS' }),
      account({ id: 2, name: 'Old', archived: true }),
    ]
    const balances = new Map([
      [1, 1000],
      [2, 9999],
    ])
    const snap = buildSnapshot(accounts, balances, date)
    expect(snap.date).toBe(date)
    expect(snap.totalAssets).toBe(1000)
    expect(snap.netWorth).toBe(1000)
    expect(snap.accountBalances).toHaveLength(1)
    expect(snap.accountBalances[0].accountName).toBe('UBS')
  })

  it('records zero amount for active accounts missing a balance entry', () => {
    const accounts: PersistedAccount[] = [account({ id: 1 })]
    const snap = buildSnapshot(accounts, new Map(), new Date())
    expect(snap.accountBalances[0].amount).toBe(0)
    expect(snap.totalAssets).toBe(0)
  })
})

describe('net-worth: computeNetWorthChange', () => {
  function snap(netWorth: number, totalAssets = netWorth, totalLiabilities = 0): NetWorthSnapshot {
    return {
      date: new Date(),
      totalAssets,
      totalLiabilities,
      netWorth,
      accountBalances: [],
    }
  }

  it('returns absolute + percent change for positive previous', () => {
    const result = computeNetWorthChange(snap(1100), snap(1000))
    expect(result.absoluteChange).toBe(100)
    expect(result.percentChange).toBeCloseTo(10, 5)
  })

  it('returns zero percent when previous netWorth is zero', () => {
    const result = computeNetWorthChange(snap(500), snap(0))
    expect(result.absoluteChange).toBe(500)
    expect(result.percentChange).toBe(0)
  })

  it('handles negative previous via abs() in denominator', () => {
    const result = computeNetWorthChange(snap(-500), snap(-1000))
    expect(result.absoluteChange).toBe(500)
    expect(result.percentChange).toBeCloseTo(50, 5)
  })

  it('computes asset and liability deltas independently', () => {
    const prev: NetWorthSnapshot = {
      date: new Date(),
      totalAssets: 1000,
      totalLiabilities: 300,
      netWorth: 700,
      accountBalances: [],
    }
    const curr: NetWorthSnapshot = {
      date: new Date(),
      totalAssets: 1500,
      totalLiabilities: 250,
      netWorth: 1250,
      accountBalances: [],
    }
    const result = computeNetWorthChange(curr, prev)
    expect(result.assetChange).toBe(500)
    expect(result.liabilityChange).toBe(-50)
  })

  it('returns negative absoluteChange when net worth drops', () => {
    const result = computeNetWorthChange(snap(800), snap(1000))
    expect(result.absoluteChange).toBe(-200)
    expect(result.percentChange).toBeCloseTo(-20, 5)
  })
})
