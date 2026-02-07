import type { Transaction, HouseholdMember, MemberSummary } from './types'

export interface DetectedCard {
  cardNumber: string
  transactionCount: number
  totalSpent: number
  firstSeen: Date
  lastSeen: Date
}

export function detectCards(transactions: Transaction[]): DetectedCard[] {
  const cardMap = new Map<
    string,
    { count: number; total: number; firstSeen: Date; lastSeen: Date }
  >()

  for (const t of transactions) {
    if (!t.cardNumber) continue

    const existing = cardMap.get(t.cardNumber)
    const amount = t.debit || 0
    const date = t.purchaseDate

    if (existing) {
      existing.count += 1
      existing.total += amount
      if (date < existing.firstSeen) existing.firstSeen = date
      if (date > existing.lastSeen) existing.lastSeen = date
    } else {
      cardMap.set(t.cardNumber, {
        count: 1,
        total: amount,
        firstSeen: date,
        lastSeen: date,
      })
    }
  }

  return Array.from(cardMap.entries())
    .map(([cardNumber, data]) => ({
      cardNumber,
      transactionCount: data.count,
      totalSpent: data.total,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
    }))
    .sort((a, b) => b.transactionCount - a.transactionCount)
}

export function autoAssignMember(
  transaction: Transaction,
  members: HouseholdMember[]
): string | null {
  if (!transaction.cardNumber) return null

  for (const member of members) {
    if (member.cardNumbers.includes(transaction.cardNumber)) {
      return member.name
    }
  }
  return null
}

export function getMemberForTransaction(
  index: number,
  transaction: Transaction,
  members: HouseholdMember[],
  overrides: Map<number, string>
): string | null {
  const override = overrides.get(index)
  if (override !== undefined) return override
  return autoAssignMember(transaction, members)
}

export function calculateMemberSummaries(
  transactions: Transaction[],
  members: HouseholdMember[],
  overrides: Map<number, string>
): MemberSummary[] {
  const memberMap = new Map<
    string,
    { total: number; count: number; color: string; transactions: Transaction[] }
  >()

  // Initialize entries for each member
  for (const member of members) {
    memberMap.set(member.name, { total: 0, count: 0, color: member.color, transactions: [] })
  }
  // Initialize "Unassigned" group
  memberMap.set('Unassigned', { total: 0, count: 0, color: '#9ca3af', transactions: [] })

  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i]
    const amount = t.debit || 0
    if (amount === 0) continue

    const memberName = getMemberForTransaction(i, t, members, overrides) || 'Unassigned'

    const entry = memberMap.get(memberName)
    if (entry) {
      entry.total += amount
      entry.count += 1
      entry.transactions.push(t)
    } else {
      // Override to a name not in members list (edge case)
      memberMap.set(memberName, { total: amount, count: 1, color: '#9ca3af', transactions: [t] })
    }
  }

  const totalSpent = Array.from(memberMap.values()).reduce((sum, e) => sum + e.total, 0)

  return Array.from(memberMap.entries())
    .filter(([, entry]) => entry.count > 0)
    .map(([name, entry]) => ({
      memberName: name,
      total: entry.total,
      count: entry.count,
      percentage: totalSpent > 0 ? (entry.total / totalSpent) * 100 : 0,
      color: entry.color,
      transactions: entry.transactions,
    }))
    .sort((a, b) => b.total - a.total)
}
