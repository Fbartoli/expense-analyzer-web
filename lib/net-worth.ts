import type { AccountCategory, AccountType, NetWorthSnapshot, PersistedAccount } from './types'

export const ACCOUNT_CATEGORY_LABELS: Record<AccountCategory, string> = {
  cash: 'Cash',
  checking: 'Checking Account',
  savings: 'Savings Account',
  investment: 'Investment',
  property: 'Property',
  vehicle: 'Vehicle',
  'other-asset': 'Other Asset',
  'credit-card': 'Credit Card',
  loan: 'Loan',
  mortgage: 'Mortgage',
  'student-loan': 'Student Loan',
  'other-liability': 'Other Liability',
}

export const ASSET_CATEGORY_OPTIONS: AccountCategory[] = [
  'cash',
  'checking',
  'savings',
  'investment',
  'property',
  'vehicle',
  'other-asset',
]

export const LIABILITY_CATEGORY_OPTIONS: AccountCategory[] = (
  Object.keys(ACCOUNT_CATEGORY_LABELS) as AccountCategory[]
).filter((c) => !ASSET_CATEGORY_OPTIONS.includes(c))

export function categoryToType(category: AccountCategory): AccountType {
  return ASSET_CATEGORY_OPTIONS.includes(category) ? 'asset' : 'liability'
}

export function computeNetWorth(
  accounts: PersistedAccount[],
  latestBalances: Map<number, number>
): {
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  byCategory: Map<AccountCategory, number>
} {
  let totalAssets = 0
  let totalLiabilities = 0
  const byCategory = new Map<AccountCategory, number>()

  for (const account of accounts) {
    if (account.archived) continue
    const balance = latestBalances.get(account.id) ?? 0
    const current = byCategory.get(account.category) ?? 0
    byCategory.set(account.category, current + balance)

    if (account.type === 'asset') {
      totalAssets += balance
    } else {
      totalLiabilities += balance
    }
  }

  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    byCategory,
  }
}

export function buildSnapshot(
  accounts: PersistedAccount[],
  latestBalances: Map<number, number>,
  date: Date
): Omit<NetWorthSnapshot, 'id'> {
  const { totalAssets, totalLiabilities, netWorth } = computeNetWorth(accounts, latestBalances)

  const accountBalances = accounts
    .filter((a) => !a.archived)
    .map((a) => ({
      accountId: a.id,
      accountName: a.name,
      type: a.type,
      amount: latestBalances.get(a.id) ?? 0,
    }))

  return {
    date,
    totalAssets,
    totalLiabilities,
    netWorth,
    accountBalances,
  }
}

export function computeNetWorthChange(
  current: NetWorthSnapshot,
  previous: NetWorthSnapshot
): {
  absoluteChange: number
  percentChange: number
  assetChange: number
  liabilityChange: number
} {
  const absoluteChange = current.netWorth - previous.netWorth
  const percentChange =
    previous.netWorth !== 0 ? (absoluteChange / Math.abs(previous.netWorth)) * 100 : 0

  return {
    absoluteChange,
    percentChange,
    assetChange: current.totalAssets - previous.totalAssets,
    liabilityChange: current.totalLiabilities - previous.totalLiabilities,
  }
}
