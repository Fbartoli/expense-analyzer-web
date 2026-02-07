import { differenceInDays, differenceInMonths } from 'date-fns'
import { categorizeTransaction } from './analyzer'
import type { Transaction, ManualRecurringTransaction } from './types'

export type RecurringFrequency = 'monthly' | 'weekly' | 'quarterly' | 'irregular'
export type RecurringStatus = 'active' | 'new' | 'cancelled' | 'price-changed'

export interface RecurringTransaction {
  merchantName: string
  originalBookingTexts: string[]
  category: string
  frequency: RecurringFrequency
  averageAmount: number
  lastAmount: number
  previousAmount: number | null
  priceChange: number | null
  firstSeen: Date
  lastSeen: Date
  occurrences: number
  status: RecurringStatus
  monthlyEquivalent: number
  isManual?: boolean
  manualId?: number
}

export interface RecurringAnalysis {
  recurring: RecurringTransaction[]
  totalMonthlyRecurring: number
  newSubscriptions: RecurringTransaction[]
  cancelledSubscriptions: RecurringTransaction[]
  priceChanges: RecurringTransaction[]
  dataQuality: { totalMonths: number; hasEnoughData: boolean }
}

const NOISE_WORDS = new Set([
  'monthly',
  'annual',
  'yearly',
  'quarterly',
  'weekly',
  'subscription',
  'premium',
  'plus',
  'basic',
  'standard',
  'membership',
  'recurring',
  'payment',
  'autopay',
  'renewal',
  'renew',
])

const DOMAIN_SUFFIXES = ['.co.uk', '.com', '.ch', '.net', '.org', '.io', '.de', '.eu']

export function normalizeMerchantName(bookingText: string): string {
  let text = bookingText.toLowerCase()

  // Strip date patterns: dd.mm.yyyy, dd/mm/yyyy, mm/yyyy, yyyy-mm-dd
  text = text.replace(/\d{1,2}[./]\d{1,2}[./]\d{2,4}/g, '')
  text = text.replace(/\d{1,2}\/\d{4}/g, '')
  text = text.replace(/\d{4}-\d{2}-\d{2}/g, '')

  // Strip trailing reference/ID numbers (5+ digits)
  text = text.replace(/\d{5,}/g, '')

  // Remove domain suffixes
  for (const suffix of DOMAIN_SUFFIXES) {
    text = text.replaceAll(suffix, '')
  }

  // Replace punctuation with spaces
  text = text.replace(/[^a-z0-9\s]/g, ' ')

  // Remove noise words (word boundaries)
  const words = text.split(/\s+/).filter((w) => w.length > 0 && !NOISE_WORDS.has(w))

  return words.join(' ').trim()
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

function detectFrequency(gaps: number[]): RecurringFrequency | null {
  if (gaps.length === 0) return null

  const med = median(gaps)

  if (med >= 5 && med <= 9) return 'weekly'
  if (med >= 25 && med <= 38) return 'monthly'
  if (med >= 80 && med <= 100) return 'quarterly'

  // Irregular: at least 3 gaps (4 occurrences) but no pattern match
  if (gaps.length >= 2) return 'irregular'

  return null
}

export function computeMonthlyEquivalent(amount: number, frequency: RecurringFrequency): number {
  switch (frequency) {
    case 'weekly':
      return amount * (52 / 12)
    case 'quarterly':
      return amount / 3
    case 'monthly':
    case 'irregular':
      return amount
  }
}

export function detectRecurringTransactions(
  transactions: Transaction[],
  referenceDate: Date = new Date()
): RecurringAnalysis {
  // Filter to debit-only with valid dates
  const debits = transactions.filter((t) => {
    if (!t.purchaseDate || isNaN(t.purchaseDate.getTime())) return false
    return (t.debit || 0) > 0
  })

  if (debits.length === 0) {
    return {
      recurring: [],
      totalMonthlyRecurring: 0,
      newSubscriptions: [],
      cancelledSubscriptions: [],
      priceChanges: [],
      dataQuality: { totalMonths: 0, hasEnoughData: false },
    }
  }

  // Check data range
  const dates = debits.map((t) => t.purchaseDate).sort((a, b) => a.getTime() - b.getTime())
  const totalMonths = differenceInMonths(dates[dates.length - 1], dates[0]) + 1

  if (totalMonths < 2) {
    return {
      recurring: [],
      totalMonthlyRecurring: 0,
      newSubscriptions: [],
      cancelledSubscriptions: [],
      priceChanges: [],
      dataQuality: { totalMonths, hasEnoughData: false },
    }
  }

  // Group by normalized merchant name
  const groups = new Map<string, Transaction[]>()
  for (const tx of debits) {
    const key = normalizeMerchantName(tx.bookingText)
    if (key.length === 0) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(tx)
  }

  const recurring: RecurringTransaction[] = []

  for (const [merchantName, txns] of groups) {
    // Need at least 2 transactions to detect recurrence
    if (txns.length < 2) continue

    // Sort chronologically
    const sorted = [...txns].sort((a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime())

    // Compute day-gaps
    const gaps: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      gaps.push(differenceInDays(sorted[i].purchaseDate, sorted[i - 1].purchaseDate))
    }

    const frequency = detectFrequency(gaps)
    if (!frequency) continue

    // Category from most recent transaction
    const category = categorizeTransaction(sorted[sorted.length - 1])

    // Amounts
    const amounts = sorted.map((t) => t.debit || 0)
    const averageAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length

    // Amount consistency check: skip merchants with highly variable amounts.
    // Subscriptions charge ~the same amount each time (low CV).
    // Groceries, train tickets, etc. vary widely (high CV).
    if (averageAmount > 0 && amounts.length >= 3) {
      const variance =
        amounts.reduce((sum, v) => sum + (v - averageAmount) ** 2, 0) / amounts.length
      const cv = Math.sqrt(variance) / averageAmount
      if (cv > 0.5) continue
    }

    const lastAmount = amounts[amounts.length - 1]
    const previousAmount = amounts.length >= 2 ? amounts[amounts.length - 2] : null

    // Price change detection (>5% difference between last two)
    let priceChange: number | null = null
    if (previousAmount !== null && previousAmount > 0) {
      const pctDiff = ((lastAmount - previousAmount) / previousAmount) * 100
      if (Math.abs(pctDiff) > 5) {
        priceChange = pctDiff
      }
    }

    const firstSeen = sorted[0].purchaseDate
    const lastSeen = sorted[sorted.length - 1].purchaseDate

    // Collect original booking texts (unique)
    const originalBookingTexts = [...new Set(sorted.map((t) => t.bookingText))]

    // Monthly equivalent
    const monthlyEquivalent = computeMonthlyEquivalent(lastAmount, frequency)

    // Status determination (priority order)
    let status: RecurringStatus = 'active'
    const monthsSinceLastSeen = differenceInMonths(referenceDate, lastSeen)
    const monthsSinceFirstSeen = differenceInMonths(referenceDate, firstSeen)

    if (monthsSinceLastSeen >= 2) {
      status = 'cancelled'
    } else if (priceChange !== null) {
      status = 'price-changed'
    } else if (monthsSinceFirstSeen <= 2 && sorted.length <= 3) {
      status = 'new'
    }

    recurring.push({
      merchantName,
      originalBookingTexts,
      category,
      frequency,
      averageAmount,
      lastAmount,
      previousAmount,
      priceChange,
      firstSeen,
      lastSeen,
      occurrences: sorted.length,
      status,
      monthlyEquivalent,
    })
  }

  // Sort by monthly equivalent descending
  recurring.sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent)

  // Aggregate total (excluding cancelled)
  const totalMonthlyRecurring = recurring
    .filter((r) => r.status !== 'cancelled')
    .reduce((sum, r) => sum + r.monthlyEquivalent, 0)

  return {
    recurring,
    totalMonthlyRecurring,
    newSubscriptions: recurring.filter((r) => r.status === 'new'),
    cancelledSubscriptions: recurring.filter((r) => r.status === 'cancelled'),
    priceChanges: recurring.filter((r) => r.status === 'price-changed'),
    dataQuality: { totalMonths, hasEnoughData: true },
  }
}

export function transactionFingerprint(t: Transaction): string {
  const date =
    t.purchaseDate && !isNaN(t.purchaseDate.getTime()) ? t.purchaseDate.toISOString() : 'invalid'
  return `${t.bookingText}|${date}|${t.debit ?? 0}`
}

export function mergeRecurringWithManual(
  auto: RecurringAnalysis,
  manual: ManualRecurringTransaction[]
): RecurringAnalysis {
  if (manual.length === 0) return auto

  const existingMerchants = new Set(auto.recurring.map((r) => r.merchantName))

  const manualItems: RecurringTransaction[] = manual
    .filter((m) => !existingMerchants.has(m.merchantName))
    .map((m) => ({
      merchantName: m.merchantName,
      originalBookingTexts: [m.bookingText],
      category: m.category,
      frequency: m.frequency,
      averageAmount: m.amount,
      lastAmount: m.amount,
      previousAmount: null,
      priceChange: null,
      firstSeen: m.createdDate,
      lastSeen: m.createdDate,
      occurrences: 1,
      status: 'active' as RecurringStatus,
      monthlyEquivalent: computeMonthlyEquivalent(m.amount, m.frequency),
      isManual: true,
      manualId: m.id,
    }))

  const merged = [...auto.recurring, ...manualItems].sort(
    (a, b) => b.monthlyEquivalent - a.monthlyEquivalent
  )

  const totalMonthlyRecurring = merged
    .filter((r) => r.status !== 'cancelled')
    .reduce((sum, r) => sum + r.monthlyEquivalent, 0)

  return {
    recurring: merged,
    totalMonthlyRecurring,
    newSubscriptions: merged.filter((r) => r.status === 'new'),
    cancelledSubscriptions: merged.filter((r) => r.status === 'cancelled'),
    priceChanges: merged.filter((r) => r.status === 'price-changed'),
    dataQuality: auto.dataQuality,
  }
}
