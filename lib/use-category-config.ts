import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getAllCategoryConfig,
  saveCategoryConfig,
  deleteCategoryConfig,
  updateCategoryConfig as dbUpdateCategoryConfig,
  getAllBudgets,
  updateBudget,
  deleteBudget,
  getChartPreferences,
  saveChartPreferences,
} from '@/lib/db'
import {
  buildCategoryConfig,
  EMPTY_CATEGORY_CONFIG,
  type CategoryConfig,
} from '@/lib/category-config'
import type { CategoryConfigRecord, CustomCategory } from '@/lib/types'

export interface UseCategoryConfigReturn {
  config: CategoryConfig
  loading: boolean
  reload: () => Promise<void>
  addCustomCategory: (cat: Omit<CustomCategory, 'id' | 'type'>) => Promise<void>
  addAlias: (from: string, to: string) => Promise<void>
  removeConfig: (id: number) => Promise<void>
  updateConfig: (id: number, updates: Partial<Omit<CategoryConfigRecord, 'id'>>) => Promise<void>
}

export function useCategoryConfig(): UseCategoryConfigReturn {
  const [records, setRecords] = useState<CategoryConfigRecord[]>([])
  const [loading, setLoading] = useState(true)

  const config = useMemo(
    () => (records.length > 0 ? buildCategoryConfig(records) : EMPTY_CATEGORY_CONFIG),
    [records]
  )

  const reload = useCallback(async () => {
    const data = await getAllCategoryConfig()
    setRecords(data)
  }, [])

  useEffect(() => {
    reload().finally(() => setLoading(false))
  }, [reload])

  const addCustomCategory = useCallback(
    async (cat: Omit<CustomCategory, 'id' | 'type'>) => {
      await saveCategoryConfig({
        type: 'custom',
        ...cat,
      } as Omit<CategoryConfigRecord, 'id'>)
      await reload()
    },
    [reload]
  )

  const addAlias = useCallback(
    async (from: string, to: string) => {
      await saveCategoryConfig({
        type: 'alias',
        from,
        to,
      } as Omit<CategoryConfigRecord, 'id'>)

      // Auto-migrate budgets
      const budgets = await getAllBudgets()
      const fromBudget = budgets.find((b) => b.category === from)
      const toBudget = budgets.find((b) => b.category === to)

      if (fromBudget && toBudget) {
        await updateBudget(toBudget.id!, toBudget.amount + fromBudget.amount)
        await deleteBudget(fromBudget.id!)
      } else if (fromBudget) {
        // Rename: update the budget's category to the new name
        const { db } = await import('@/lib/db')
        await db.budgets.update(fromBudget.id!, { category: to })
      }

      // Auto-migrate excluded categories in chart preferences
      const prefs = await getChartPreferences()
      if (prefs?.excludedCategories.includes(from)) {
        const updated = prefs.excludedCategories.filter((c) => c !== from)
        if (!updated.includes(to)) updated.push(to)
        await saveChartPreferences({
          ...prefs,
          excludedCategories: updated,
        })
      }

      await reload()
    },
    [reload]
  )

  const removeConfig = useCallback(
    async (id: number) => {
      await deleteCategoryConfig(id)
      await reload()
    },
    [reload]
  )

  const updateConfig = useCallback(
    async (id: number, updates: Partial<Omit<CategoryConfigRecord, 'id'>>) => {
      await dbUpdateCategoryConfig(id, updates)
      await reload()
    },
    [reload]
  )

  return {
    config,
    loading,
    reload,
    addCustomCategory,
    addAlias,
    removeConfig,
    updateConfig,
  }
}
