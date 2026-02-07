import Dexie, { Table } from 'dexie'
import type {
  Transaction,
  ExpenseReport,
  Budget,
  HouseholdMember,
  ManualRecurringTransaction,
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

// Chart Preferences functions (singleton - only one preferences record)
export async function saveChartPreferences(prefs: Omit<ChartPreferences, 'id'>): Promise<void> {
  const existing = await db.chartPreferences.toArray()
  if (existing.length > 0) {
    await db.chartPreferences.update(existing[0].id!, prefs)
  } else {
    await db.chartPreferences.add(prefs as ChartPreferences)
  }
}

export async function getChartPreferences(): Promise<ChartPreferences | undefined> {
  const prefs = await db.chartPreferences.toArray()
  return prefs.length > 0 ? prefs[0] : undefined
}

export async function clearChartPreferences(): Promise<void> {
  await db.chartPreferences.clear()
}

// Dashboard Layout functions (singleton - only one layout record)
export async function saveDashboardLayout(layout: Omit<DashboardLayout, 'id'>): Promise<void> {
  const existing = await db.dashboardLayout.toArray()
  if (existing.length > 0) {
    await db.dashboardLayout.update(existing[0].id!, layout)
  } else {
    await db.dashboardLayout.add(layout as DashboardLayout)
  }
}

export async function getDashboardLayout(): Promise<DashboardLayout | undefined> {
  const layouts = await db.dashboardLayout.toArray()
  return layouts.length > 0 ? layouts[0] : undefined
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
}

/**
 * Export all data for backup
 */
export async function exportAllData(): Promise<BackupData> {
  const [analyses, budgets, chartPrefsArray, layoutArray, householdMembers, manualRecurring] =
    await Promise.all([
      db.analyses.toArray(),
      db.budgets.toArray(),
      db.chartPreferences.toArray(),
      db.dashboardLayout.toArray(),
      db.householdMembers.toArray(),
      db.manualRecurring.toArray(),
    ])
  const chartPreferences = chartPrefsArray.length > 0 ? chartPrefsArray[0] : null
  const dashboardLayout = layoutArray.length > 0 ? layoutArray[0] : null

  return {
    version: 4,
    exportDate: new Date().toISOString(),
    analyses,
    budgets,
    chartPreferences,
    dashboardLayout,
    householdMembers,
    manualRecurring,
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
}> {
  if (![1, 2, 3, 4].includes(backup.version)) {
    throw new Error('Unsupported backup version')
  }

  // Clear existing data
  await Promise.all([
    db.analyses.clear(),
    db.budgets.clear(),
    db.chartPreferences.clear(),
    db.dashboardLayout.clear(),
    db.householdMembers.clear(),
    db.manualRecurring.clear(),
  ])

  // Import analyses (remove ids and convert date strings to Date objects)
  const analysesToImport = backup.analyses.map((a) => {
    const { id: _id, ...rest } = a
    // Convert all date strings back to Date objects
    const revived = reviveDates(rest)
    return revived as SavedAnalysis
  })
  if (analysesToImport.length > 0) {
    await db.analyses.bulkAdd(analysesToImport)
  }

  // Import budgets (convert dates)
  const budgetsToImport = backup.budgets.map((b) => {
    const { id: _bid, ...rest } = b
    const revived = reviveDates(rest)
    return revived as Budget
  })
  if (budgetsToImport.length > 0) {
    await db.budgets.bulkAdd(budgetsToImport)
  }

  // Import chart preferences
  if (backup.chartPreferences) {
    const { id: _bid, ...rest } = backup.chartPreferences
    await db.chartPreferences.add(rest as ChartPreferences)
  }

  // Import dashboard layout (v2+)
  if (backup.dashboardLayout) {
    const { id: _lid, ...rest } = backup.dashboardLayout
    await db.dashboardLayout.add(rest as DashboardLayout)
  }

  // Import household members (v3+)
  const membersToImport = (backup.householdMembers || []).map((m) => {
    const { id: _mid, ...rest } = m
    return rest as HouseholdMember
  })
  if (membersToImport.length > 0) {
    await db.householdMembers.bulkAdd(membersToImport)
  }

  // Import manual recurring (v4+)
  const manualRecurringToImport = (backup.manualRecurring || []).map((r) => {
    const { id: _rid, ...rest } = r
    const revived = reviveDates(rest)
    return revived as ManualRecurringTransaction
  })
  if (manualRecurringToImport.length > 0) {
    await db.manualRecurring.bulkAdd(manualRecurringToImport)
  }

  return {
    analysesCount: analysesToImport.length,
    budgetsCount: budgetsToImport.length,
    hasChartPreferences: !!backup.chartPreferences,
    hasDashboardLayout: !!backup.dashboardLayout,
    householdMembersCount: membersToImport.length,
    manualRecurringCount: manualRecurringToImport.length,
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
    [1, 2, 3, 4].includes(obj.version) &&
    typeof obj.exportDate === 'string' &&
    Array.isArray(obj.analyses) &&
    Array.isArray(obj.budgets)
  )
}
