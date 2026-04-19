import { describe, it, expect } from 'vitest'
import { buildCategoryConfig, EMPTY_CATEGORY_CONFIG } from '@/lib/category-config'
import { CATEGORIES } from '@/lib/categories'
import type { CustomCategory, CategoryAlias } from '@/lib/types'

function custom(name: string, keywords: string[] = [], color = '#ff0000'): CustomCategory {
  return { id: 1, type: 'custom', name, color, keywords }
}

function alias(from: string, to: string): CategoryAlias {
  return { id: 2, type: 'alias', from, to }
}

describe('category-config', () => {
  describe('buildCategoryConfig', () => {
    it('should return built-in categories when no records', () => {
      const config = buildCategoryConfig([])
      expect(config.allCategories).toEqual([...CATEGORIES].sort())
      expect(config.customCategories).toHaveLength(0)
      expect(config.aliases).toHaveLength(0)
      expect(config.customKeywordRules).toHaveLength(0)
    })

    it('should include custom categories in allCategories', () => {
      const config = buildCategoryConfig([custom('Pet Care'), custom('Childcare')])
      expect(config.allCategories).toContain('Pet Care')
      expect(config.allCategories).toContain('Childcare')
      expect(config.customCategories).toHaveLength(2)
    })

    it('should be sorted alphabetically', () => {
      const config = buildCategoryConfig([custom('AAA'), custom('ZZZ')])
      const sorted = [...config.allCategories].sort()
      expect(config.allCategories).toEqual(sorted)
    })
  })

  describe('resolveCategory', () => {
    it('should pass through unknown categories', () => {
      const config = buildCategoryConfig([])
      expect(config.resolveCategory('Unknown')).toBe('Unknown')
    })

    it('should resolve a simple alias', () => {
      const config = buildCategoryConfig([alias('Fuel', 'Transportation')])
      expect(config.resolveCategory('Fuel')).toBe('Transportation')
    })

    it('should resolve a rename', () => {
      const config = buildCategoryConfig([alias('Restaurants & Dining', 'Food & Dining')])
      expect(config.resolveCategory('Restaurants & Dining')).toBe('Food & Dining')
    })

    it('should resolve alias chains', () => {
      const config = buildCategoryConfig([alias('A', 'B'), alias('B', 'C')])
      expect(config.resolveCategory('A')).toBe('C')
      expect(config.resolveCategory('B')).toBe('C')
    })

    it('should handle cycles without infinite loop', () => {
      const config = buildCategoryConfig([alias('A', 'B'), alias('B', 'A')])
      // Should not hang; result is implementation-defined but stable
      const result = config.resolveCategory('A')
      expect(typeof result).toBe('string')
    })

    it('should not resolve non-aliased categories', () => {
      const config = buildCategoryConfig([alias('Fuel', 'Transportation')])
      expect(config.resolveCategory('Groceries')).toBe('Groceries')
    })
  })

  describe('allCategories with aliases', () => {
    it('should remove aliased-from category and keep target', () => {
      const config = buildCategoryConfig([alias('Fuel', 'Transportation')])
      expect(config.allCategories).not.toContain('Fuel')
      expect(config.allCategories).toContain('Transportation')
    })

    it('should add renamed target if not a built-in', () => {
      const config = buildCategoryConfig([alias('Restaurants & Dining', 'Food & Dining')])
      expect(config.allCategories).not.toContain('Restaurants & Dining')
      expect(config.allCategories).toContain('Food & Dining')
    })
  })

  describe('customKeywordRules', () => {
    it('should convert custom category keywords to rules', () => {
      const config = buildCategoryConfig([
        custom('Pet Care', ['veterinary', 'pet shop', 'fressnapf']),
      ])
      expect(config.customKeywordRules).toHaveLength(1)
      expect(config.customKeywordRules[0]).toEqual({
        keywords: ['veterinary', 'pet shop', 'fressnapf'],
        category: 'Pet Care',
      })
    })

    it('should skip custom categories with no keywords', () => {
      const config = buildCategoryConfig([custom('Empty', []), custom('Has Keywords', ['test'])])
      expect(config.customKeywordRules).toHaveLength(1)
      expect(config.customKeywordRules[0].category).toBe('Has Keywords')
    })
  })

  describe('getCategoryColor', () => {
    it('should return built-in color for built-in category', () => {
      const config = buildCategoryConfig([])
      expect(config.getCategoryColor('Groceries')).toBe('#f97316')
    })

    it('should return custom color for custom category', () => {
      const config = buildCategoryConfig([custom('Pet Care', [], '#abcdef')])
      expect(config.getCategoryColor('Pet Care')).toBe('#abcdef')
    })

    it('should return built-in color for renamed category', () => {
      const config = buildCategoryConfig([alias('Groceries', 'Food Shopping')])
      // 'Food Shopping' should get Groceries color via reverse alias
      expect(config.getCategoryColor('Food Shopping')).toBe('#f97316')
    })

    it('should return fallback for unknown category', () => {
      const config = buildCategoryConfig([])
      expect(config.getCategoryColor('Nonexistent')).toBe('#9ca3af')
    })
  })

  describe('EMPTY_CATEGORY_CONFIG', () => {
    it('should have all built-in categories', () => {
      expect(EMPTY_CATEGORY_CONFIG.allCategories).toEqual([...CATEGORIES].sort())
    })

    it('should have no custom rules', () => {
      expect(EMPTY_CATEGORY_CONFIG.customKeywordRules).toHaveLength(0)
    })
  })
})
