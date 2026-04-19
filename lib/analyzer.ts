import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import type {
  Transaction,
  ExpenseReport,
  CategorySummary,
  MonthlyAnalysis,
  Budget,
  BudgetWithSpending,
  BudgetStatus,
} from './types'
import {
  SECTOR_CATEGORY_MAP,
  CRYPTO_KEYWORDS,
  EARLY_TEXT_RULES,
  SECTOR_PARTIAL_RULES,
  BOOKING_TEXT_RULES,
  type BookingTextRule,
} from './categorization-rules'

export interface TransactionWithCategory extends Transaction {
  manualCategory?: string
}

export function categorizeTransaction(
  transaction: Transaction | TransactionWithCategory,
  customRules?: BookingTextRule[]
): string {
  if (!transaction) return 'Other'

  // 1. Manual override
  if ('manualCategory' in transaction && transaction.manualCategory) {
    return transaction.manualCategory
  }

  const text = transaction.bookingText.toLowerCase()
  const sector = transaction.sector.trim()
  const upperText = transaction.bookingText.toUpperCase()
  const upperSector = sector.toUpperCase()

  // 2. Crypto special-case (booking text)
  for (const kw of CRYPTO_KEYWORDS) {
    if (upperText.includes(kw)) return 'Crypto & Investments'
  }

  // 3. Exact sector match
  if (SECTOR_CATEGORY_MAP[sector]) {
    return SECTOR_CATEGORY_MAP[sector]
  }

  // 4. Early booking-text rules (food delivery, hotel platforms)
  for (const rule of EARLY_TEXT_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.category
    }
  }

  // 5. Partial sector matches
  for (const rule of SECTOR_PARTIAL_RULES) {
    if (rule.patterns.some((p) => upperSector.includes(p))) {
      return rule.category
    }
  }

  // 6. Booking text keyword matches
  for (const rule of BOOKING_TEXT_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.category
    }
  }

  // 7. Custom keyword rules (after built-in, before fallback)
  if (customRules) {
    for (const rule of customRules) {
      if (rule.keywords.some((kw) => text.includes(kw))) {
        return rule.category
      }
    }
  }

  // 8. QR payments and generic transactions
  if (upperSector.includes('QR PAYMENT') || sector === 'A' || sector === '') {
    return 'Other'
  }

  return 'Other'
}

export interface AnalyzeOptions {
  customRules?: BookingTextRule[]
  resolveCategory?: (raw: string) => string
}

export function analyzeExpenses(
  transactions: Transaction[],
  categoryOverrides?: Map<number, string>,
  options?: AnalyzeOptions
): ExpenseReport {
  const { customRules, resolveCategory } = options ?? {}

  // Categorize all transactions upfront and stamp category on each
  const categorized: Transaction[] = transactions.map((t, idx) => {
    const override = categoryOverrides?.get(idx)
    const withOverride = override
      ? ({ ...t, manualCategory: override } as TransactionWithCategory)
      : t
    const raw = categorizeTransaction(withOverride, customRules)
    const resolved = resolveCategory ? resolveCategory(raw) : raw
    return { ...t, category: resolved }
  })

  const expenses = categorized.filter((t) => (t.debit || 0) > 0)
  const income = categorized.filter((t) => (t.credit || 0) > 0)

  const totalSpent = expenses.reduce((sum, t) => sum + (t.debit || 0), 0)
  const totalIncome = income.reduce((sum, t) => sum + (t.credit || 0), 0)

  const categoryMap = new Map<string, Transaction[]>()
  for (const tx of expenses) {
    const cat = tx.category!
    if (!categoryMap.has(cat)) categoryMap.set(cat, [])
    categoryMap.get(cat)!.push(tx)
  }

  const categorySummaries: CategorySummary[] = Array.from(categoryMap.entries())
    .map(([category, txns]) => {
      const categoryTotalSpent = txns.reduce((sum, t) => sum + (t.debit || 0), 0)
      return {
        category,
        totalSpent: categoryTotalSpent,
        count: txns.length,
        percentage: 0,
        averageTransaction: categoryTotalSpent / txns.length,
        transactions: txns,
      }
    })
    .sort((a, b) => b.totalSpent - a.totalSpent)

  const totalCategorySpent = categorySummaries.reduce((sum, c) => sum + c.totalSpent, 0)
  categorySummaries.forEach((cat) => {
    cat.percentage = totalCategorySpent > 0 ? (cat.totalSpent / totalCategorySpent) * 100 : 0
  })

  const monthlyMap = new Map<string, Transaction[]>()
  for (const tx of categorized) {
    try {
      if (!tx.purchaseDate || isNaN(tx.purchaseDate.getTime())) continue
      const monthKey = format(tx.purchaseDate, 'yyyy-MM')
      if (!monthlyMap.has(monthKey)) monthlyMap.set(monthKey, [])
      monthlyMap.get(monthKey)!.push(tx)
    } catch (_error) {
      console.warn('Invalid date for transaction:', tx)
    }
  }

  const monthlyAnalysis: MonthlyAnalysis[] = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0])) // Sort by yyyy-MM key (chronological)
    .map(([monthKey, txns]) => {
      const spent = txns
        .filter((t) => (t.debit || 0) > 0)
        .reduce((sum, t) => sum + (t.debit || 0), 0)
      const income = txns
        .filter((t) => (t.credit || 0) > 0)
        .reduce((sum, t) => sum + (t.credit || 0), 0)

      return {
        month: format(new Date(monthKey + '-01'), 'MMM yyyy'),
        monthKey, // yyyy-MM format for sorting
        totalSpent: spent,
        totalIncome: income,
        netFlow: income - spent,
        transactionCount: txns.length,
      }
    })

  const topExpenses = [...expenses].sort((a, b) => (b.debit || 0) - (a.debit || 0)).slice(0, 10)

  const dates = categorized
    .map((t) => t.purchaseDate)
    .filter((d) => d && !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  return {
    totalSpent,
    totalIncome,
    netBalance: totalIncome - totalSpent,
    transactionCount: transactions.length,
    dateRange: {
      start: dates.length > 0 ? dates[0] : new Date(),
      end: dates.length > 0 ? dates[dates.length - 1] : new Date(),
    },
    categorySummaries,
    monthlyAnalysis,
    topExpenses,
    largestCategory: categorySummaries[0] || null,
    categorizedTransactions: categorized,
  }
}

/**
 * Calculate budget status by comparing budgets against actual spending
 */
export function calculateBudgetStatus(
  transactions: Transaction[],
  budgets: Budget[],
  month?: Date
): BudgetWithSpending[] {
  if (budgets.length === 0) return []

  // Default to current month if not specified
  const targetMonth = month || new Date()
  const monthStart = startOfMonth(targetMonth)
  const monthEnd = endOfMonth(targetMonth)

  // Filter transactions to the target month
  const monthTransactions = transactions.filter((t) => {
    const date = new Date(t.purchaseDate)
    if (isNaN(date.getTime())) return false
    return isWithinInterval(date, { start: monthStart, end: monthEnd })
  })

  // Calculate spending by category
  const categorySpending = new Map<string, number>()
  monthTransactions.forEach((t) => {
    if ((t.debit || 0) > 0) {
      const category = t.category || categorizeTransaction(t)
      categorySpending.set(category, (categorySpending.get(category) || 0) + (t.debit || 0))
    }
  })

  // Calculate budget status for each budget
  return budgets
    .map((budget) => {
      const spent = categorySpending.get(budget.category) || 0
      const remaining = budget.amount - spent
      const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

      let status: BudgetStatus
      if (percentUsed > 100) {
        status = 'over'
      } else if (percentUsed >= 75) {
        status = 'warning'
      } else if (percentUsed >= 50) {
        status = 'early'
      } else {
        status = 'healthy'
      }

      return {
        budget,
        spent,
        remaining,
        percentUsed,
        status,
      }
    })
    .sort((a, b) => b.percentUsed - a.percentUsed) // Sort by most used first
}
