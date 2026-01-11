import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  db,
  saveAnalysis,
  getAllAnalyses,
  getAnalysis,
  deleteAnalysis,
  updateAnalysisName,
  clearAllData,
  saveBudget,
  getAllBudgets,
  getBudget,
  updateBudget,
  deleteBudget,
  deleteBudgetByCategory,
  saveChartPreferences,
  getChartPreferences,
  clearChartPreferences,
  exportAllData,
  importAllData,
  isValidBackupData,
  type SavedAnalysis,
  type BackupData,
} from '@/lib/db'
import { createMockTransaction, createMockReport } from '../../fixtures/transactions'

describe('db', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.analyses.clear()
    await db.budgets.clear()
    await db.chartPreferences.clear()
  })

  afterEach(async () => {
    await db.analyses.clear()
    await db.budgets.clear()
    await db.chartPreferences.clear()
  })

  describe('Analysis CRUD', () => {
    it('should save and retrieve an analysis', async () => {
      const transactions = [createMockTransaction()]
      const report = createMockReport()

      const id = await saveAnalysis('test.csv', transactions, report)
      expect(id).toBeDefined()

      const saved = await getAnalysis(id)
      expect(saved).toBeDefined()
      expect(saved?.fileName).toBe('test.csv')
      expect(saved?.transactions).toHaveLength(1)
    })

    it('should use custom name when provided', async () => {
      const id = await saveAnalysis(
        'test.csv',
        [createMockTransaction()],
        createMockReport(),
        'My Custom Analysis'
      )

      const saved = await getAnalysis(id)
      expect(saved?.name).toBe('My Custom Analysis')
    })

    it('should generate default name when no custom name', async () => {
      const id = await saveAnalysis(
        'test.csv',
        [createMockTransaction()],
        createMockReport()
      )

      const saved = await getAnalysis(id)
      expect(saved?.name).toContain('test.csv')
    })

    it('should get all analyses sorted by date descending', async () => {
      await saveAnalysis('first.csv', [], createMockReport())
      await new Promise((r) => setTimeout(r, 10)) // Small delay
      await saveAnalysis('second.csv', [], createMockReport())

      const all = await getAllAnalyses()
      expect(all).toHaveLength(2)
      expect(all[0].fileName).toBe('second.csv') // Most recent first
    })

    it('should delete an analysis', async () => {
      const id = await saveAnalysis('test.csv', [], createMockReport())

      await deleteAnalysis(id)

      const result = await getAnalysis(id)
      expect(result).toBeUndefined()
    })

    it('should update analysis name', async () => {
      const id = await saveAnalysis('test.csv', [], createMockReport())

      await updateAnalysisName(id, 'New Name')

      const saved = await getAnalysis(id)
      expect(saved?.name).toBe('New Name')
    })

    it('should clear all analyses', async () => {
      await saveAnalysis('test1.csv', [], createMockReport())
      await saveAnalysis('test2.csv', [], createMockReport())

      await clearAllData()

      const all = await getAllAnalyses()
      expect(all).toHaveLength(0)
    })

    it('should return undefined for non-existent analysis', async () => {
      const result = await getAnalysis(99999)
      expect(result).toBeUndefined()
    })
  })

  describe('Budget CRUD', () => {
    it('should save and retrieve a budget', async () => {
      const id = await saveBudget('Restaurants & Dining', 500)
      expect(id).toBeDefined()

      const budget = await getBudget(id)
      expect(budget?.category).toBe('Restaurants & Dining')
      expect(budget?.amount).toBe(500)
    })

    it('should update existing budget for same category', async () => {
      const id1 = await saveBudget('Groceries', 300)
      const id2 = await saveBudget('Groceries', 400)

      expect(id1).toBe(id2) // Same ID returned
      const budget = await getBudget(id1)
      expect(budget?.amount).toBe(400) // Updated amount
    })

    it('should get all budgets', async () => {
      await saveBudget('Restaurants & Dining', 500)
      await saveBudget('Groceries', 300)

      const all = await getAllBudgets()
      expect(all).toHaveLength(2)
    })

    it('should update budget amount', async () => {
      const id = await saveBudget('Restaurants & Dining', 500)

      await updateBudget(id, 600)

      const budget = await getBudget(id)
      expect(budget?.amount).toBe(600)
    })

    it('should delete budget by id', async () => {
      const id = await saveBudget('Restaurants & Dining', 500)

      await deleteBudget(id)

      const budget = await getBudget(id)
      expect(budget).toBeUndefined()
    })

    it('should delete budget by category', async () => {
      await saveBudget('Restaurants & Dining', 500)

      await deleteBudgetByCategory('Restaurants & Dining')

      const all = await getAllBudgets()
      expect(all).toHaveLength(0)
    })
  })

  describe('Chart Preferences', () => {
    it('should save and retrieve chart preferences', async () => {
      await saveChartPreferences({
        granularity: 'monthly',
        excludedCategories: ['Other'],
        showFilterPanel: true,
      })

      const prefs = await getChartPreferences()
      expect(prefs?.granularity).toBe('monthly')
      expect(prefs?.excludedCategories).toContain('Other')
      expect(prefs?.showFilterPanel).toBe(true)
    })

    it('should update existing preferences (singleton)', async () => {
      await saveChartPreferences({
        granularity: 'monthly',
        excludedCategories: [],
        showFilterPanel: false,
      })

      await saveChartPreferences({
        granularity: 'weekly',
        excludedCategories: ['Income'],
        showFilterPanel: true,
      })

      const all = await db.chartPreferences.toArray()
      expect(all).toHaveLength(1) // Still only one record

      const prefs = await getChartPreferences()
      expect(prefs?.granularity).toBe('weekly')
    })

    it('should return undefined when no preferences saved', async () => {
      const prefs = await getChartPreferences()
      expect(prefs).toBeUndefined()
    })

    it('should clear chart preferences', async () => {
      await saveChartPreferences({
        granularity: 'monthly',
        excludedCategories: [],
        showFilterPanel: false,
      })

      await clearChartPreferences()

      const prefs = await getChartPreferences()
      expect(prefs).toBeUndefined()
    })
  })

  describe('Backup/Restore', () => {
    it('should export all data', async () => {
      await saveAnalysis('test.csv', [createMockTransaction()], createMockReport())
      await saveBudget('Groceries', 300)
      await saveChartPreferences({
        granularity: 'monthly',
        excludedCategories: [],
        showFilterPanel: false,
      })

      const backup = await exportAllData()

      expect(backup.version).toBe(1)
      expect(backup.exportDate).toBeDefined()
      expect(backup.analyses).toHaveLength(1)
      expect(backup.budgets).toHaveLength(1)
      expect(backup.chartPreferences).not.toBeNull()
    })

    it('should export empty data when no records', async () => {
      const backup = await exportAllData()

      expect(backup.analyses).toHaveLength(0)
      expect(backup.budgets).toHaveLength(0)
      expect(backup.chartPreferences).toBeNull()
    })

    it('should import data and replace existing', async () => {
      // Save some initial data
      await saveAnalysis('old.csv', [], createMockReport())

      // Create backup data
      const backup: BackupData = {
        version: 1,
        exportDate: new Date().toISOString(),
        analyses: [
          {
            name: 'Imported Analysis',
            fileName: 'imported.csv',
            uploadDate: new Date(),
            transactions: [createMockTransaction()],
            report: createMockReport(),
          },
        ],
        budgets: [
          {
            id: 1,
            category: 'Groceries',
            amount: 400,
            createdDate: new Date(),
          },
        ],
        chartPreferences: {
          id: 1,
          granularity: 'weekly',
          excludedCategories: ['Other'],
          showFilterPanel: true,
        },
      }

      const result = await importAllData(backup)

      expect(result.analysesCount).toBe(1)
      expect(result.budgetsCount).toBe(1)
      expect(result.hasChartPreferences).toBe(true)

      // Verify old data is replaced - use db directly to isolate any ordering issues
      const analyses = await db.analyses.toArray()
      expect(analyses).toHaveLength(1)
      expect(analyses[0].fileName).toBe('imported.csv')

      // Also verify budgets and preferences were imported
      const budgets = await db.budgets.toArray()
      expect(budgets).toHaveLength(1)
      expect(budgets[0].category).toBe('Groceries')
    })

    it('should revive date strings during import', async () => {
      const dateStr = '2024-06-15T10:30:00.000Z'
      const backup: BackupData = {
        version: 1,
        exportDate: new Date().toISOString(),
        analyses: [
          {
            name: 'Test',
            fileName: 'test.csv',
            uploadDate: new Date(dateStr) as unknown as Date,
            transactions: [
              {
                ...createMockTransaction(),
                purchaseDate: dateStr as unknown as Date,
              },
            ],
            report: createMockReport(),
          },
        ],
        budgets: [],
        chartPreferences: null,
      }

      // Simulate JSON serialization (which converts Dates to strings)
      const serialized = JSON.parse(JSON.stringify(backup)) as BackupData

      await importAllData(serialized)

      const analyses = await getAllAnalyses()
      expect(analyses[0].transactions[0].purchaseDate).toBeInstanceOf(Date)
    })

    it('should throw error for unsupported backup version', async () => {
      const backup: BackupData = {
        version: 999,
        exportDate: new Date().toISOString(),
        analyses: [],
        budgets: [],
        chartPreferences: null,
      }

      await expect(importAllData(backup)).rejects.toThrow('Unsupported backup version')
    })

    it('should handle empty budgets and analyses in import', async () => {
      const backup: BackupData = {
        version: 1,
        exportDate: new Date().toISOString(),
        analyses: [],
        budgets: [],
        chartPreferences: null,
      }

      const result = await importAllData(backup)

      expect(result.analysesCount).toBe(0)
      expect(result.budgetsCount).toBe(0)
      expect(result.hasChartPreferences).toBe(false)
    })
  })

  describe('isValidBackupData', () => {
    it('should return true for valid backup structure', () => {
      const valid: BackupData = {
        version: 1,
        exportDate: '2024-01-01T00:00:00.000Z',
        analyses: [],
        budgets: [],
        chartPreferences: null,
      }

      expect(isValidBackupData(valid)).toBe(true)
    })

    it('should return false for null', () => {
      expect(isValidBackupData(null)).toBe(false)
    })

    it('should return false for non-object', () => {
      expect(isValidBackupData('string')).toBe(false)
      expect(isValidBackupData(123)).toBe(false)
    })

    it('should return false for missing version', () => {
      expect(
        isValidBackupData({
          exportDate: '2024-01-01',
          analyses: [],
          budgets: [],
        })
      ).toBe(false)
    })

    it('should return false for missing analyses array', () => {
      expect(
        isValidBackupData({
          version: 1,
          exportDate: '2024-01-01',
          budgets: [],
        })
      ).toBe(false)
    })

    it('should return false for non-array analyses', () => {
      expect(
        isValidBackupData({
          version: 1,
          exportDate: '2024-01-01',
          analyses: 'not an array',
          budgets: [],
        })
      ).toBe(false)
    })
  })
})
