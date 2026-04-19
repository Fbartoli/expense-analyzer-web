import Dexie, { Table } from 'dexie'
import { startOfDay, endOfDay } from 'date-fns'
import type {
  Transaction,
  ExpenseReport,
  Budget,
  HouseholdMember,
  ManualRecurringTransaction,
  CategoryConfigRecord,
  Account,
  PersistedAccount,
  BalanceEntry,
  NetWorthSnapshot,
} from './types'
import type { DashboardLayout } from './dashboard-types'

export interface SavedAnalysis {
  id?: number
  name: string
  fileName: string
  uploadDate: Date
  transactions: Transaction[]
  report: ExpenseReport
}

export interface ChartPreferences {
  id?: number
  granularity: 'daily' | 'weekly' | 'monthly' | 'yearly'
  selectedYear?: string
  selectedMonth?: string
  selectedWeek?: string
  excludedCategories: string[]
  showFilterPanel: boolean
}

export class ExpenseDatabase extends Dexie {
  analyses!: Table<SavedAnalysis>
  budgets!: Table<Budget>
  chartPreferences!: Table<ChartPreferences>
  dashboardLayout!: Table<DashboardLayout>
  householdMembers!: Table<HouseholdMember>
  manualRecurring!: Table<ManualRecurringTransaction>
  categoryConfig!: Table<CategoryConfigRecord>
  accounts!: Table<Account>
  balanceEntries!: Table<BalanceEntry>
  netWorthSnapshots!: Table<NetWorthSnapshot>

  constructor() {
    super('ExpenseAnalyzerDB')
    this.version(1).stores({
      analyses: '++id, name, fileName, uploadDate',
    })
    this.version(2).stores({
      analyses: '++id, name, fileName, uploadDate',
      budgets: '++id, category, createdDate',
    })
    this.version(3).stores({
      analyses: '++id, name, fileName, uploadDate',
      budgets: '++id, category, createdDate',
      chartPreferences: '++id',
    })
    this.version(4).stores({
      analyses: '++id, name, fileName, uploadDate',
      budgets: '++id, category, createdDate',
      chartPreferences: '++id',
      dashboardLayout: '++id',
    })
    this.version(5).stores({
      analyses: '++id, name, fileName, uploadDate',
      budgets: '++id, category, createdDate',
      chartPreferences: '++id',
      dashboardLayout: '++id',
      householdMembers: '++id, name',
    })
    this.version(6).stores({
      analyses: '++id, name, fileName, uploadDate',
      budgets: '++id, category, createdDate',
      chartPreferences: '++id',
      dashboardLayout: '++id',
      householdMembers: '++id, name',
      manualRecurring: '++id, fingerprint',
    })
    this.version(7).stores({
      analyses: '++id, name, fileName, uploadDate',
      budgets: '++id, category, createdDate',
      chartPreferences: '++id',
      dashboardLayout: '++id',
      householdMembers: '++id, name',
      manualRecurring: '++id, fingerprint',
      categoryConfig: '++id, type',
    })
    this.version(8).stores({
      analyses: '++id, name, fileName, uploadDate',
      budgets: '++id, category, createdDate',
      chartPreferences: '++id',
      dashboardLayout: '++id',
      householdMembers: '++id, name',
      manualRecurring: '++id, fingerprint',
      categoryConfig: '++id, type',
      accounts: '++id, type, category',
      balanceEntries: '++id, accountId, date',
      netWorthSnapshots: '++id, date',
    })
  }
}

export const db = new ExpenseDatabase()

export async function saveAnalysis(
  fileName: string,
  transactions: Transaction[],
  report: ExpenseReport,
  customName?: string
): Promise<number> {
  const name = customName || `${fileName} - ${new Date().toLocaleDateString()}`

  const id = await db.analyses.add({
    name,
    fileName,
    uploadDate: new Date(),
    transactions,
    report,
  })

  return id
}

export async function getAllAnalyses(): Promise<SavedAnalysis[]> {
  return await db.analyses.orderBy('uploadDate').reverse().toArray()
}

export async function getAnalysis(id: number): Promise<SavedAnalysis | undefined> {
  return await db.analyses.get(id)
}

export async function deleteAnalysis(id: number): Promise<void> {
  await db.analyses.delete(id)
}

export async function updateAnalysisName(id: number, newName: string): Promise<void> {
  await db.analyses.update(id, { name: newName })
}

export async function clearAllData(): Promise<void> {
  await db.analyses.clear()
}

export async function getStorageInfo(): Promise<{
  count: number
  estimatedSize: string
}> {
  const count = await db.analyses.count()

  let estimatedSize = 'Unknown'
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate()
    if (estimate.usage) {
      const mb = (estimate.usage / (1024 * 1024)).toFixed(2)
      estimatedSize = `${mb} MB`
    }
  }

  return { count, estimatedSize }
}

// Budget CRUD functions
export async function saveBudget(category: string, amount: number): Promise<number> {
  // Check if budget for this category already exists
  const existing = await db.budgets.where('category').equals(category).first()
  if (existing) {
    // Update existing budget
    await db.budgets.update(existing.id!, { amount })
    return existing.id!
  }

  // Create new budget
  return await db.budgets.add({
    category,
    amount,
    createdDate: new Date(),
  })
}

export async function getAllBudgets(): Promise<Budget[]> {
  return await db.budgets.toArray()
}

export async function getBudget(id: number): Promise<Budget | undefined> {
  return await db.budgets.get(id)
}

export async function updateBudget(id: number, amount: number): Promise<void> {
  await db.budgets.update(id, { amount })
}

export async function deleteBudget(id: number): Promise<void> {
  await db.budgets.delete(id)
}

export async function deleteBudgetByCategory(category: string): Promise<void> {
  await db.budgets.where('category').equals(category).delete()
}

// Generic singleton helpers for tables that store a single record
async function saveSingleton<T>(table: Table<T>, data: Omit<T, 'id'>): Promise<void> {
  await table.clear()
  await table.add(data as T)
}

async function getSingleton<T>(table: Table<T>): Promise<T | undefined> {
  const items = await table.toArray()
  return items.length > 0 ? items[0] : undefined
}

// Chart Preferences functions
export async function saveChartPreferences(prefs: Omit<ChartPreferences, 'id'>): Promise<void> {
  await saveSingleton(db.chartPreferences, prefs)
}

export async function getChartPreferences(): Promise<ChartPreferences | undefined> {
  return getSingleton(db.chartPreferences)
}

export async function clearChartPreferences(): Promise<void> {
  await db.chartPreferences.clear()
}

// Dashboard Layout functions
export async function saveDashboardLayout(layout: Omit<DashboardLayout, 'id'>): Promise<void> {
  await saveSingleton(db.dashboardLayout, layout)
}

export async function getDashboardLayout(): Promise<DashboardLayout | undefined> {
  return getSingleton(db.dashboardLayout)
}

export async function clearDashboardLayout(): Promise<void> {
  await db.dashboardLayout.clear()
}

// Household Members CRUD functions
export async function saveHouseholdMember(member: Omit<HouseholdMember, 'id'>): Promise<number> {
  return await db.householdMembers.add(member as HouseholdMember)
}

export async function getAllHouseholdMembers(): Promise<HouseholdMember[]> {
  return await db.householdMembers.toArray()
}

export async function updateHouseholdMember(
  id: number,
  updates: Partial<Omit<HouseholdMember, 'id'>>
): Promise<void> {
  await db.householdMembers.update(id, updates)
}

export async function deleteHouseholdMember(id: number): Promise<void> {
  await db.householdMembers.delete(id)
}

// Manual Recurring CRUD functions
export async function saveManualRecurring(
  entry: Omit<ManualRecurringTransaction, 'id'>
): Promise<number> {
  const existing = await db.manualRecurring.where('fingerprint').equals(entry.fingerprint).first()
  if (existing) {
    await db.manualRecurring.update(existing.id!, entry)
    return existing.id!
  }
  return await db.manualRecurring.add(entry as ManualRecurringTransaction)
}

export async function getAllManualRecurring(): Promise<ManualRecurringTransaction[]> {
  return await db.manualRecurring.toArray()
}

export async function deleteManualRecurring(id: number): Promise<void> {
  await db.manualRecurring.delete(id)
}

export async function deleteManualRecurringByFingerprint(fingerprint: string): Promise<void> {
  await db.manualRecurring.where('fingerprint').equals(fingerprint).delete()
}

// Category Config CRUD functions
export async function saveCategoryConfig(
  record: Omit<CategoryConfigRecord, 'id'>
): Promise<number> {
  return await db.categoryConfig.add(record as CategoryConfigRecord)
}

export async function getAllCategoryConfig(): Promise<CategoryConfigRecord[]> {
  return await db.categoryConfig.toArray()
}

export async function updateCategoryConfig(
  id: number,
  updates: Partial<Omit<CategoryConfigRecord, 'id'>>
): Promise<void> {
  await db.categoryConfig.update(id, updates as Record<string, unknown>)
}

export async function deleteCategoryConfig(id: number): Promise<void> {
  await db.categoryConfig.delete(id)
}

// Account CRUD functions
export async function saveAccount(account: Omit<Account, 'id'>): Promise<number> {
  return await db.accounts.add(account as Account)
}

export async function getAllAccounts(): Promise<PersistedAccount[]> {
  return (await db.accounts.toArray()) as PersistedAccount[]
}

export async function getActiveAccounts(): Promise<PersistedAccount[]> {
  const all = (await db.accounts.toArray()) as PersistedAccount[]
  return all.filter((a) => !a.archived)
}

export async function updateAccount(
  id: number,
  updates: Partial<Omit<Account, 'id'>>
): Promise<void> {
  await db.accounts.update(id, updates as Record<string, unknown>)
}

export async function archiveAccount(id: number): Promise<void> {
  await db.accounts.update(id, { archived: true })
}

// Balance Entry CRUD functions
export async function saveBalanceEntry(entry: Omit<BalanceEntry, 'id'>): Promise<number> {
  return await db.balanceEntries.add(entry as BalanceEntry)
}

export async function getBalanceEntriesForAccount(accountId: number): Promise<BalanceEntry[]> {
  return await db.balanceEntries.where('accountId').equals(accountId).sortBy('date')
}

export async function getLatestBalances(): Promise<Map<number, BalanceEntry>> {
  const all = await db.balanceEntries.toArray()
  const latest = new Map<number, BalanceEntry>()
  for (const entry of all) {
    const existing = latest.get(entry.accountId)
    if (!existing || entry.date > existing.date) {
      latest.set(entry.accountId, entry)
    }
  }
  return latest
}

export async function deleteBalanceEntry(id: number): Promise<void> {
  await db.balanceEntries.delete(id)
}

// Net Worth Snapshot functions
//
// One snapshot per local calendar day, last-write-wins. We use an indexed
// range query on the `date` column (bounded to the local day) so dedupe
// cost stays O(log n) instead of scanning the whole table.
export async function saveNetWorthSnapshot(
  snapshot: Omit<NetWorthSnapshot, 'id'>
): Promise<number> {
  const dayStart = startOfDay(snapshot.date)
  const dayEnd = endOfDay(snapshot.date)
  return await db.transaction('rw', db.netWorthSnapshots, async () => {
    const sameDay = await db.netWorthSnapshots
      .where('date')
      .between(dayStart, dayEnd, true, true)
      .first()
    if (sameDay) {
      await db.netWorthSnapshots.delete(sameDay.id!)
    }
    return await db.netWorthSnapshots.add(snapshot as NetWorthSnapshot)
  })
}

export async function getAllNetWorthSnapshots(): Promise<NetWorthSnapshot[]> {
  return await db.netWorthSnapshots.orderBy('date').toArray()
}

export async function deleteNetWorthSnapshot(id: number): Promise<void> {
  await db.netWorthSnapshots.delete(id)
}

// Backup/Restore types and functions
export interface BackupData {
  version: number
  exportDate: string
  analyses: SavedAnalysis[]
  budgets: Budget[]
  chartPreferences: ChartPreferences | null
  dashboardLayout: DashboardLayout | null
  householdMembers?: HouseholdMember[]
  manualRecurring?: ManualRecurringTransaction[]
  categoryConfig?: CategoryConfigRecord[]
  accounts?: Account[]
  balanceEntries?: BalanceEntry[]
  netWorthSnapshots?: NetWorthSnapshot[]
}

/**
 * Export all data for backup
 */
export async function exportAllData(): Promise<BackupData> {
  const [
    analyses,
    budgets,
    chartPrefsArray,
    layoutArray,
    householdMembers,
    manualRecurring,
    categoryConfig,
    accounts,
    balanceEntries,
    netWorthSnapshots,
  ] = await Promise.all([
    db.analyses.toArray(),
    db.budgets.toArray(),
    db.chartPreferences.toArray(),
    db.dashboardLayout.toArray(),
    db.householdMembers.toArray(),
    db.manualRecurring.toArray(),
    db.categoryConfig.toArray(),
    db.accounts.toArray(),
    db.balanceEntries.toArray(),
    db.netWorthSnapshots.toArray(),
  ])
  const chartPreferences = chartPrefsArray.length > 0 ? chartPrefsArray[0] : null
  const dashboardLayout = layoutArray.length > 0 ? layoutArray[0] : null

  return {
    version: 6,
    exportDate: new Date().toISOString(),
    analyses,
    budgets,
    chartPreferences,
    dashboardLayout,
    householdMembers,
    manualRecurring,
    categoryConfig,
    accounts,
    balanceEntries,
    netWorthSnapshots,
  }
}

/**
 * Convert date strings back to Date objects in transactions
 */
function reviveDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj

  if (typeof obj === 'string') {
    // Check if it's an ISO date string
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)) {
      return new Date(obj) as unknown as T
    }
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => reviveDates(item)) as unknown as T
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const key in obj) {
      result[key] = reviveDates((obj as Record<string, unknown>)[key])
    }
    return result as T
  }

  return obj
}

/**
 * Import data from backup (replaces existing data)
 */
export async function importAllData(backup: BackupData): Promise<{
  analysesCount: number
  budgetsCount: number
  hasChartPreferences: boolean
  hasDashboardLayout: boolean
  householdMembersCount: number
  manualRecurringCount: number
  categoryConfigCount: number
  accountsCount: number
  balanceEntriesCount: number
  netWorthSnapshotsCount: number
}> {
  if (![1, 2, 3, 4, 5, 6].includes(backup.version)) {
    throw new Error('Unsupported backup version')
  }

  const stripId = <T extends { id?: number }>(item: T): Omit<T, 'id'> => {
    const { id: _id, ...rest } = item
    return rest
  }

  const analysesToImport = backup.analyses.map((a) => reviveDates(stripId(a)) as SavedAnalysis)
  const budgetsToImport = backup.budgets.map((b) => reviveDates(stripId(b)) as Budget)
  const membersToImport = (backup.householdMembers || []).map((m) => stripId(m) as HouseholdMember)
  const manualRecurringToImport = (backup.manualRecurring || []).map(
    (r) => reviveDates(stripId(r)) as ManualRecurringTransaction
  )
  const categoryConfigToImport = (backup.categoryConfig || []).map(
    (c) => stripId(c) as CategoryConfigRecord
  )
  const accountsToImport = (backup.accounts || []).map((a) => reviveDates(stripId(a)) as Account)
  const balanceEntriesToImport = (backup.balanceEntries || []).map(
    (e) => reviveDates(stripId(e)) as BalanceEntry
  )
  const snapshotsToImport = (backup.netWorthSnapshots || []).map(
    (s) => reviveDates(stripId(s)) as NetWorthSnapshot
  )

  // Single transaction: all tables clear + bulkAdd atomically. If any step
  // throws (e.g. bulkAdd fails on a malformed row), Dexie rolls back every
  // other write so the DB never ends up in a partially-restored state.
  await db.transaction(
    'rw',
    [
      db.analyses,
      db.budgets,
      db.chartPreferences,
      db.dashboardLayout,
      db.householdMembers,
      db.manualRecurring,
      db.categoryConfig,
      db.accounts,
      db.balanceEntries,
      db.netWorthSnapshots,
    ],
    async () => {
      await Promise.all([
        db.analyses.clear(),
        db.budgets.clear(),
        db.chartPreferences.clear(),
        db.dashboardLayout.clear(),
        db.householdMembers.clear(),
        db.manualRecurring.clear(),
        db.categoryConfig.clear(),
        db.accounts.clear(),
        db.balanceEntries.clear(),
        db.netWorthSnapshots.clear(),
      ])

      if (analysesToImport.length > 0) {
        await db.analyses.bulkAdd(analysesToImport)
      }
      if (budgetsToImport.length > 0) {
        await db.budgets.bulkAdd(budgetsToImport)
      }
      if (backup.chartPreferences) {
        await db.chartPreferences.add(stripId(backup.chartPreferences) as ChartPreferences)
      }
      if (backup.dashboardLayout) {
        await db.dashboardLayout.add(stripId(backup.dashboardLayout) as DashboardLayout)
      }
      if (membersToImport.length > 0) {
        await db.householdMembers.bulkAdd(membersToImport)
      }
      if (manualRecurringToImport.length > 0) {
        await db.manualRecurring.bulkAdd(manualRecurringToImport)
      }
      if (categoryConfigToImport.length > 0) {
        await db.categoryConfig.bulkAdd(categoryConfigToImport)
      }
      if (accountsToImport.length > 0) {
        await db.accounts.bulkAdd(accountsToImport)
      }
      if (balanceEntriesToImport.length > 0) {
        await db.balanceEntries.bulkAdd(balanceEntriesToImport)
      }
      if (snapshotsToImport.length > 0) {
        await db.netWorthSnapshots.bulkAdd(snapshotsToImport)
      }
    }
  )

  return {
    analysesCount: analysesToImport.length,
    budgetsCount: budgetsToImport.length,
    hasChartPreferences: !!backup.chartPreferences,
    hasDashboardLayout: !!backup.dashboardLayout,
    householdMembersCount: membersToImport.length,
    manualRecurringCount: manualRecurringToImport.length,
    categoryConfigCount: categoryConfigToImport.length,
    accountsCount: accountsToImport.length,
    balanceEntriesCount: balanceEntriesToImport.length,
    netWorthSnapshotsCount: snapshotsToImport.length,
  }
}

/**
 * Validate backup data structure
 */
export function isValidBackupData(data: unknown): data is BackupData {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return (
    typeof obj.version === 'number' &&
    [1, 2, 3, 4, 5, 6].includes(obj.version) &&
    typeof obj.exportDate === 'string' &&
    Array.isArray(obj.analyses) &&
    Array.isArray(obj.budgets)
  )
}
