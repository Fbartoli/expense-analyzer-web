import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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
  saveHouseholdMember,
  getAllHouseholdMembers,
  updateHouseholdMember,
  deleteHouseholdMember,
  saveManualRecurring,
  getAllManualRecurring,
  deleteManualRecurring,
  exportAllData,
  importAllData,
  isValidBackupData,
  saveNetWorthSnapshot,
  getAllNetWorthSnapshots,
  type BackupData,
} from '@/lib/db'
import { createMockTransaction, createMockReport } from '../../fixtures/transactions'
import type { NetWorthSnapshot } from '@/lib/types'

describe('db', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.analyses.clear()
    await db.budgets.clear()
    await db.chartPreferences.clear()
    await db.householdMembers.clear()
    await db.manualRecurring.clear()
  })

  afterEach(async () => {
    await db.analyses.clear()
    await db.budgets.clear()
    await db.chartPreferences.clear()
    await db.householdMembers.clear()
    await db.manualRecurring.clear()
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
      const id = await saveAnalysis('test.csv', [createMockTransaction()], createMockReport())

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

  describe('Household Members CRUD', () => {
    it('should save and retrieve a household member', async () => {
      const id = await saveHouseholdMember({
        name: 'Alice',
        cardNumbers: ['19950466'],
        color: '#3b82f6',
      })
      expect(id).toBeDefined()

      const members = await getAllHouseholdMembers()
      expect(members).toHaveLength(1)
      expect(members[0].name).toBe('Alice')
      expect(members[0].cardNumbers).toEqual(['19950466'])
      expect(members[0].color).toBe('#3b82f6')
    })

    it('should update a household member', async () => {
      const id = await saveHouseholdMember({
        name: 'Alice',
        cardNumbers: ['19950466'],
        color: '#3b82f6',
      })

      await updateHouseholdMember(id, { name: 'Alice B.', cardNumbers: ['19950466', '19950467'] })

      const members = await getAllHouseholdMembers()
      expect(members[0].name).toBe('Alice B.')
      expect(members[0].cardNumbers).toEqual(['19950466', '19950467'])
    })

    it('should delete a household member', async () => {
      const id = await saveHouseholdMember({
        name: 'Alice',
        cardNumbers: ['19950466'],
        color: '#3b82f6',
      })

      await deleteHouseholdMember(id)

      const members = await getAllHouseholdMembers()
      expect(members).toHaveLength(0)
    })

    it('should support multiple members', async () => {
      await saveHouseholdMember({ name: 'Alice', cardNumbers: ['19950466'], color: '#3b82f6' })
      await saveHouseholdMember({ name: 'Bob', cardNumbers: ['19950463'], color: '#8b5cf6' })

      const members = await getAllHouseholdMembers()
      expect(members).toHaveLength(2)
    })
  })

  describe('Manual Recurring CRUD', () => {
    const entry = {
      fingerprint: 'NETFLIX|2024-06-15T00:00:00.000Z|12.99',
      merchantName: 'netflix',
      bookingText: 'NETFLIX',
      category: 'Entertainment',
      frequency: 'monthly' as const,
      amount: 12.99,
      currency: 'CHF',
      createdDate: new Date(),
    }

    it('should save and retrieve a manual recurring entry', async () => {
      const id = await saveManualRecurring(entry)
      expect(id).toBeDefined()

      const all = await getAllManualRecurring()
      expect(all).toHaveLength(1)
      expect(all[0].merchantName).toBe('netflix')
      expect(all[0].fingerprint).toBe(entry.fingerprint)
    })

    it('should upsert on duplicate fingerprint', async () => {
      const id1 = await saveManualRecurring(entry)
      const id2 = await saveManualRecurring({ ...entry, amount: 15.99 })

      expect(id1).toBe(id2)
      const all = await getAllManualRecurring()
      expect(all).toHaveLength(1)
      expect(all[0].amount).toBe(15.99)
    })

    it('should return all entries', async () => {
      await saveManualRecurring(entry)
      await saveManualRecurring({
        fingerprint: 'SPOTIFY|2024-06-15T00:00:00.000Z|9.99',
        merchantName: 'spotify',
        bookingText: 'SPOTIFY',
        category: 'Entertainment',
        frequency: 'monthly' as const,
        amount: 9.99,
        currency: 'CHF',
        createdDate: new Date(),
      })

      const all = await getAllManualRecurring()
      expect(all).toHaveLength(2)
    })

    it('should delete by id', async () => {
      const id = await saveManualRecurring(entry)
      await deleteManualRecurring(id)

      const all = await getAllManualRecurring()
      expect(all).toHaveLength(0)
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
      await saveHouseholdMember({ name: 'Alice', cardNumbers: ['19950466'], color: '#3b82f6' })

      const backup = await exportAllData()

      expect(backup.version).toBe(6)
      expect(backup.exportDate).toBeDefined()
      expect(backup.analyses).toHaveLength(1)
      expect(backup.budgets).toHaveLength(1)
      expect(backup.chartPreferences).not.toBeNull()
      expect(backup.dashboardLayout).toBeNull()
      expect(backup.householdMembers).toHaveLength(1)
      expect(backup.householdMembers![0].name).toBe('Alice')
    })

    it('should export manual recurring data', async () => {
      await saveManualRecurring({
        fingerprint: 'NETFLIX|2024-06-15T00:00:00.000Z|12.99',
        merchantName: 'netflix',
        bookingText: 'NETFLIX',
        category: 'Entertainment',
        frequency: 'monthly',
        amount: 12.99,
        currency: 'CHF',
        createdDate: new Date(),
      })

      const backup = await exportAllData()
      expect(backup.manualRecurring).toHaveLength(1)
      expect(backup.manualRecurring![0].merchantName).toBe('netflix')
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
        dashboardLayout: null,
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
        dashboardLayout: null,
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
        dashboardLayout: null,
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
        dashboardLayout: null,
      }

      const result = await importAllData(backup)

      expect(result.analysesCount).toBe(0)
      expect(result.budgetsCount).toBe(0)
      expect(result.hasChartPreferences).toBe(false)
      expect(result.householdMembersCount).toBe(0)
    })

    it('should import household members from v3 backup', async () => {
      const backup: BackupData = {
        version: 3,
        exportDate: new Date().toISOString(),
        analyses: [],
        budgets: [],
        chartPreferences: null,
        dashboardLayout: null,
        householdMembers: [
          { id: 1, name: 'Alice', cardNumbers: ['19950466'], color: '#3b82f6' },
          { id: 2, name: 'Bob', cardNumbers: ['19950463'], color: '#8b5cf6' },
        ],
      }

      const result = await importAllData(backup)

      expect(result.householdMembersCount).toBe(2)
      const members = await getAllHouseholdMembers()
      expect(members).toHaveLength(2)
      expect(members.map((m) => m.name).sort()).toEqual(['Alice', 'Bob'])
    })

    it('should be backward compatible with v2 backup (no household members)', async () => {
      const backup: BackupData = {
        version: 2,
        exportDate: new Date().toISOString(),
        analyses: [],
        budgets: [],
        chartPreferences: null,
        dashboardLayout: null,
      }

      const result = await importAllData(backup)
      expect(result.householdMembersCount).toBe(0)
    })

    it('should be backward compatible with v3 backup (no manualRecurring)', async () => {
      const backup: BackupData = {
        version: 3,
        exportDate: new Date().toISOString(),
        analyses: [],
        budgets: [],
        chartPreferences: null,
        dashboardLayout: null,
        householdMembers: [],
      }

      const result = await importAllData(backup)
      expect(result.manualRecurringCount).toBe(0)
    })

    it('should import manual recurring from v4 backup', async () => {
      const backup: BackupData = {
        version: 4,
        exportDate: new Date().toISOString(),
        analyses: [],
        budgets: [],
        chartPreferences: null,
        dashboardLayout: null,
        householdMembers: [],
        manualRecurring: [
          {
            id: 1,
            fingerprint: 'NETFLIX|2024-06-15T00:00:00.000Z|12.99',
            merchantName: 'netflix',
            bookingText: 'NETFLIX',
            category: 'Entertainment',
            frequency: 'monthly',
            amount: 12.99,
            currency: 'CHF',
            createdDate: new Date(),
          },
        ],
      }

      const result = await importAllData(backup)
      expect(result.manualRecurringCount).toBe(1)
      const all = await getAllManualRecurring()
      expect(all).toHaveLength(1)
      expect(all[0].merchantName).toBe('netflix')
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
        dashboardLayout: null,
      }

      expect(isValidBackupData(valid)).toBe(true)
    })

    it('should return true for version 3 backup', () => {
      expect(
        isValidBackupData({
          version: 3,
          exportDate: '2024-01-01T00:00:00.000Z',
          analyses: [],
          budgets: [],
          chartPreferences: null,
          dashboardLayout: null,
          householdMembers: [],
        })
      ).toBe(true)
    })

    it('should return true for version 4 backup', () => {
      expect(
        isValidBackupData({
          version: 4,
          exportDate: '2024-01-01T00:00:00.000Z',
          analyses: [],
          budgets: [],
          chartPreferences: null,
          dashboardLayout: null,
          householdMembers: [],
          manualRecurring: [],
        })
      ).toBe(true)
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

  describe('Net Worth Snapshot dedupe', () => {
    beforeEach(async () => {
      await db.netWorthSnapshots.clear()
    })

    afterEach(async () => {
      await db.netWorthSnapshots.clear()
    })

    function snapshot(date: Date, netWorth: number): Omit<NetWorthSnapshot, 'id'> {
      return {
        date,
        totalAssets: netWorth,
        totalLiabilities: 0,
        netWorth,
        accountBalances: [],
      }
    }

    it('keeps only one snapshot per local day; last write wins', async () => {
      // Two writes on the same local day — last one overwrites.
      await saveNetWorthSnapshot(snapshot(new Date('2026-04-19T08:00:00'), 1000))
      await saveNetWorthSnapshot(snapshot(new Date('2026-04-19T18:00:00'), 1500))
      const all = await getAllNetWorthSnapshots()
      expect(all).toHaveLength(1)
      expect(all[0].netWorth).toBe(1500)
    })

    it('keeps snapshots from different days independently', async () => {
      await saveNetWorthSnapshot(snapshot(new Date('2026-04-18T12:00:00'), 1000))
      await saveNetWorthSnapshot(snapshot(new Date('2026-04-19T12:00:00'), 1200))
      const all = await getAllNetWorthSnapshots()
      expect(all).toHaveLength(2)
    })

    it('uses local calendar day, not UTC day', async () => {
      // 23:30 local time on April 19 could be April 20 UTC; dedupe must use
      // the *local* calendar day so a user entering data late at night
      // stays in "today" until they cross local midnight.
      const late = new Date(2026, 3, 19, 23, 30, 0) // 23:30 local Apr 19
      const earlier = new Date(2026, 3, 19, 9, 0, 0) // 09:00 local Apr 19
      await saveNetWorthSnapshot(snapshot(earlier, 500))
      await saveNetWorthSnapshot(snapshot(late, 700))
      const all = await getAllNetWorthSnapshots()
      expect(all).toHaveLength(1)
      expect(all[0].netWorth).toBe(700)
    })
  })

  describe('importAllData atomicity', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('rolls back all tables when a bulkAdd in the middle throws', async () => {
      // Pre-seed so we can prove the clear was also rolled back.
      await saveBudget('Food', 500)
      expect(await getAllBudgets()).toHaveLength(1)

      // Force a failure during the middle of the import. Snapshot bulkAdd
      // is the last step — fail it to prove everything earlier rolls back.
      const spy = vi
        .spyOn(db.netWorthSnapshots, 'bulkAdd')
        .mockRejectedValueOnce(new Error('injected failure'))

      const backup: BackupData = {
        version: 6,
        exportDate: '2026-04-19T00:00:00.000Z',
        analyses: [],
        budgets: [
          {
            category: 'Imported',
            amount: 999,
            createdDate: new Date('2026-01-01'),
          },
        ],
        chartPreferences: null,
        dashboardLayout: null,
        householdMembers: [],
        manualRecurring: [],
        categoryConfig: [],
        accounts: [],
        balanceEntries: [],
        netWorthSnapshots: [
          {
            date: new Date('2026-02-01'),
            totalAssets: 100,
            totalLiabilities: 0,
            netWorth: 100,
            accountBalances: [],
          },
        ],
      }

      await expect(importAllData(backup)).rejects.toThrow()

      // After rollback: the original Food budget is still there, the
      // "Imported" budget from the failed backup was NOT persisted.
      const budgets = await getAllBudgets()
      expect(budgets).toHaveLength(1)
      expect(budgets[0].category).toBe('Food')

      spy.mockRestore()
    })
  })
})
