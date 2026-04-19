import { CATEGORIES } from './categories'
import { getCategoryColor as getColor } from './category-colors'
import type { CategoryConfigRecord, CustomCategory, CategoryAlias } from './types'
import type { BookingTextRule } from './categorization-rules'

export interface CategoryConfig {
  customCategories: CustomCategory[]
  aliases: CategoryAlias[]
  /** All valid category names (built-in after resolution + custom) */
  allCategories: string[]
  /** Resolve a raw category to its display name via alias map */
  resolveCategory: (raw: string) => string
  /** Get display color for a category */
  getCategoryColor: (name: string) => string
  /** Custom keyword rules to inject into categorization engine */
  customKeywordRules: BookingTextRule[]
}

/**
 * Build a resolved alias map from alias records.
 * Handles chains (A->B, B->C => A->C) and detects cycles.
 */
function buildAliasMap(aliases: CategoryAlias[]): Map<string, string> {
  const direct = new Map<string, string>()
  for (const a of aliases) {
    direct.set(a.from, a.to)
  }

  // Resolve chains
  const resolved = new Map<string, string>()
  for (const from of direct.keys()) {
    let current = from
    const visited = new Set<string>()
    while (direct.has(current)) {
      if (visited.has(current)) break // cycle detected
      visited.add(current)
      current = direct.get(current)!
    }
    resolved.set(from, current)
  }

  return resolved
}

/**
 * Build category config from raw DB records.
 * Pure function — safe to memoize.
 */
export function buildCategoryConfig(records: CategoryConfigRecord[]): CategoryConfig {
  const customCategories = records.filter((r): r is CustomCategory => r.type === 'custom')
  const aliases = records.filter((r): r is CategoryAlias => r.type === 'alias')

  const aliasMap = buildAliasMap(aliases)

  // Build allCategories: built-in (with aliases applied) + custom
  const aliasedFroms = new Set(aliasMap.keys())
  const builtInResolved = CATEGORIES.filter((c) => !aliasedFroms.has(c)).map(
    (c) => aliasMap.get(c) ?? c
  )
  const aliasTargets = [...new Set(aliasMap.values())].filter(
    (t) => !CATEGORIES.includes(t as (typeof CATEGORIES)[number])
  )
  const customNames = customCategories.map((c) => c.name)

  const allCategories = [...new Set([...builtInResolved, ...aliasTargets, ...customNames])].sort()

  function resolveCategory(raw: string): string {
    return aliasMap.get(raw) ?? raw
  }

  function getCategoryColor(name: string): string {
    return getColor(name, customCategories, aliases)
  }

  const customKeywordRules: BookingTextRule[] = customCategories
    .filter((c) => c.keywords.length > 0)
    .map((c) => ({
      keywords: c.keywords,
      category: c.name,
    }))

  return {
    customCategories,
    aliases,
    allCategories,
    resolveCategory,
    getCategoryColor,
    customKeywordRules,
  }
}

/** Empty config for use before loading completes */
export const EMPTY_CATEGORY_CONFIG: CategoryConfig = buildCategoryConfig([])
