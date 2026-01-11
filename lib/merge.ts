import type { Transaction } from './types'

/**
 * Generate a unique hash for a transaction to detect duplicates.
 * Uses purchaseDate, bookingText, and debit/credit amounts.
 */
export function getTransactionHash(t: Transaction): string {
  const dateStr = t.purchaseDate instanceof Date
    ? t.purchaseDate.toISOString().split('T')[0]
    : String(t.purchaseDate)

  // Normalize booking text: lowercase, remove extra spaces
  const normalizedText = t.bookingText.toLowerCase().trim().replace(/\s+/g, ' ')

  // Use debit and credit values (handle nulls)
  const debit = t.debit?.toFixed(2) || '0.00'
  const credit = t.credit?.toFixed(2) || '0.00'

  return `${dateStr}|${normalizedText}|${debit}|${credit}`
}

export interface MergeResult {
  merged: Transaction[]
  newTransactions: Transaction[]
  duplicates: Transaction[]
  stats: {
    originalCount: number
    newCount: number
    mergedCount: number
    duplicatesFound: number
  }
}

/**
 * Merge new transactions into existing ones, detecting duplicates.
 */
export function mergeTransactions(
  existing: Transaction[],
  incoming: Transaction[]
): MergeResult {
  // Create a set of hashes from existing transactions
  const existingHashes = new Set<string>()
  existing.forEach(t => {
    existingHashes.add(getTransactionHash(t))
  })

  const newTransactions: Transaction[] = []
  const duplicates: Transaction[] = []

  // Check each incoming transaction
  incoming.forEach(t => {
    const hash = getTransactionHash(t)
    if (existingHashes.has(hash)) {
      duplicates.push(t)
    } else {
      newTransactions.push(t)
      existingHashes.add(hash) // Prevent duplicates within incoming set too
    }
  })

  // Merge: existing + new (sorted by date)
  const merged = [...existing, ...newTransactions].sort((a, b) => {
    const dateA = a.purchaseDate instanceof Date ? a.purchaseDate : new Date(a.purchaseDate)
    const dateB = b.purchaseDate instanceof Date ? b.purchaseDate : new Date(b.purchaseDate)
    return dateA.getTime() - dateB.getTime()
  })

  return {
    merged,
    newTransactions,
    duplicates,
    stats: {
      originalCount: existing.length,
      newCount: incoming.length,
      mergedCount: merged.length,
      duplicatesFound: duplicates.length,
    }
  }
}

/**
 * Find potential duplicates within a single transaction set.
 * Useful for checking if a CSV has internal duplicates.
 */
export function findInternalDuplicates(transactions: Transaction[]): Transaction[][] {
  const hashMap = new Map<string, Transaction[]>()

  transactions.forEach(t => {
    const hash = getTransactionHash(t)
    const existing = hashMap.get(hash) || []
    existing.push(t)
    hashMap.set(hash, existing)
  })

  // Return only groups with more than one transaction
  return Array.from(hashMap.values()).filter(group => group.length > 1)
}
