import type { CustomCategory, CategoryAlias } from './types'

export const BUILTIN_CATEGORY_COLORS: Record<string, string> = {
  'Restaurants & Dining': '#ef4444',
  Groceries: '#f97316',
  Transportation: '#eab308',
  'Travel & Accommodation': '#22c55e',
  Shopping: '#14b8a6',
  'Health & Beauty': '#3b82f6',
  'Digital Services': '#8b5cf6',
  'Insurance & Financial': '#ec4899',
  Entertainment: '#6366f1',
  Fuel: '#84cc16',
  'Fitness & Sports': '#06b6d4',
  'Utilities & Telecom': '#f43f5e',
  'Professional Services': '#a855f7',
  'Government & Taxes': '#10b981',
  'Crypto & Investments': '#f59e0b',
  Education: '#0ea5e9',
  Housing: '#d946ef',
  Income: '#22d3ee',
  Other: '#9ca3af',
}

/** Palette for custom category color picker */
export const DEFAULT_CUSTOM_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6366f1',
  '#84cc16',
  '#06b6d4',
  '#f43f5e',
]

/**
 * Resolve a category's display color.
 * Priority: custom category color > alias-resolved built-in > built-in > fallback
 */
export function getCategoryColor(
  name: string,
  customCategories: CustomCategory[],
  aliases: CategoryAlias[]
): string {
  // Check custom categories first
  const custom = customCategories.find((c) => c.name === name)
  if (custom) return custom.color

  // Check built-in directly
  if (BUILTIN_CATEGORY_COLORS[name]) return BUILTIN_CATEGORY_COLORS[name]

  // Check if name is a renamed built-in (reverse alias lookup)
  const alias = aliases.find((a) => a.to === name)
  if (alias && BUILTIN_CATEGORY_COLORS[alias.from]) {
    return BUILTIN_CATEGORY_COLORS[alias.from]
  }

  return '#9ca3af'
}
