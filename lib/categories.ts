// All available categories for manual selection
export const CATEGORIES = [
  'Restaurants & Dining',
  'Groceries',
  'Transportation',
  'Travel & Accommodation',
  'Shopping',
  'Health & Beauty',
  'Digital Services',
  'Insurance & Financial',
  'Entertainment',
  'Fuel',
  'Fitness & Sports',
  'Utilities & Telecom',
  'Professional Services',
  'Government & Taxes',
  'Crypto & Investments',
  'Education',
  'Housing',
  'Income',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

/** Alias for clarity when distinguishing from custom categories */
export const BUILTIN_CATEGORIES = CATEGORIES
