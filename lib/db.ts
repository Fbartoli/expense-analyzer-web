import Dexie, { Table } from 'dexie'
import type { Transaction, ExpenseReport, Budget } from './types'

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

  constructor() {
    super('ExpenseAnalyzerDB')
    this.version(1).stores({
      analyses: '++id, name, fileName, uploadDate'
    })
    this.version(2).stores({
      analyses: '++id, name, fileName, uploadDate',
      budgets: '++id, category, createdDate'
    })
    this.version(3).stores({
      analyses: '++id, name, fileName, uploadDate',
      budgets: '++id, category, createdDate',
      chartPreferences: '++id'
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
    createdDate: new Date()
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

// Backup/Restore types and functions
export interface BackupData {
  version: number
  exportDate: string
  analyses: SavedAnalysis[]
  budgets: Budget[]
  chartPreferences: ChartPreferences | null
}

/**
 * Export all data for backup
 */
export async function exportAllData(): Promise<BackupData> {
  const analyses = await db.analyses.toArray()
  const budgets = await db.budgets.toArray()
  const chartPrefsArray = await db.chartPreferences.toArray()
  const chartPreferences = chartPrefsArray.length > 0 ? chartPrefsArray[0] : null

  return {
    version: 1,
    exportDate: new Date().toISOString(),
    analyses,
    budgets,
    chartPreferences,
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
    return obj.map(item => reviveDates(item)) as unknown as T
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
}> {
  if (backup.version !== 1) {
    throw new Error('Unsupported backup version')
  }

  // Clear existing data
  await db.analyses.clear()
  await db.budgets.clear()
  await db.chartPreferences.clear()

  // Import analyses (remove ids and convert date strings to Date objects)
  const analysesToImport = backup.analyses.map(a => {
    const { id, ...rest } = a
    // Convert all date strings back to Date objects
    const revived = reviveDates(rest)
    return revived as SavedAnalysis
  })
  if (analysesToImport.length > 0) {
    await db.analyses.bulkAdd(analysesToImport)
  }

  // Import budgets (convert dates)
  const budgetsToImport = backup.budgets.map(b => {
    const { id, ...rest } = b
    const revived = reviveDates(rest)
    return revived as Budget
  })
  if (budgetsToImport.length > 0) {
    await db.budgets.bulkAdd(budgetsToImport)
  }

  // Import chart preferences
  if (backup.chartPreferences) {
    const { id, ...rest } = backup.chartPreferences
    await db.chartPreferences.add(rest as ChartPreferences)
  }

  return {
    analysesCount: analysesToImport.length,
    budgetsCount: budgetsToImport.length,
    hasChartPreferences: !!backup.chartPreferences,
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
    typeof obj.exportDate === 'string' &&
    Array.isArray(obj.analyses) &&
    Array.isArray(obj.budgets)
  )
}
