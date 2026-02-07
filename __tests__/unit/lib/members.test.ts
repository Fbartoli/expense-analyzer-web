import { describe, it, expect } from 'vitest'
import {
  autoAssignMember,
  getMemberForTransaction,
  calculateMemberSummaries,
  detectCards,
} from '@/lib/members'
import { createMockTransaction } from '../../fixtures/transactions'
import type { HouseholdMember } from '@/lib/types'

const members: HouseholdMember[] = [
  { id: 1, name: 'Alice', cardNumbers: ['19950466'], color: '#3b82f6' },
  { id: 2, name: 'Bob', cardNumbers: ['19950463'], color: '#8b5cf6' },
]

describe('members', () => {
  describe('autoAssignMember', () => {
    it('should return member name when card number matches', () => {
      const tx = createMockTransaction({ cardNumber: '19950466' })
      expect(autoAssignMember(tx, members)).toBe('Alice')
    })

    it('should return null when card number does not match any member', () => {
      const tx = createMockTransaction({ cardNumber: '99999999' })
      expect(autoAssignMember(tx, members)).toBeNull()
    })

    it('should return null when transaction has no card number', () => {
      const tx = createMockTransaction({ cardNumber: '' })
      expect(autoAssignMember(tx, members)).toBeNull()
    })

    it('should return null when members array is empty', () => {
      const tx = createMockTransaction({ cardNumber: '19950466' })
      expect(autoAssignMember(tx, [])).toBeNull()
    })

    it('should match second member card', () => {
      const tx = createMockTransaction({ cardNumber: '19950463' })
      expect(autoAssignMember(tx, members)).toBe('Bob')
    })
  })

  describe('getMemberForTransaction', () => {
    it('should return override when one exists', () => {
      const tx = createMockTransaction({ cardNumber: '19950466' })
      const overrides = new Map([[0, 'Bob']])
      expect(getMemberForTransaction(0, tx, members, overrides)).toBe('Bob')
    })

    it('should fall back to auto-assignment when no override', () => {
      const tx = createMockTransaction({ cardNumber: '19950466' })
      const overrides = new Map<number, string>()
      expect(getMemberForTransaction(0, tx, members, overrides)).toBe('Alice')
    })

    it('should return null when no override and no card match', () => {
      const tx = createMockTransaction({ cardNumber: '' })
      const overrides = new Map<number, string>()
      expect(getMemberForTransaction(0, tx, members, overrides)).toBeNull()
    })

    it('should use override for correct index only', () => {
      const tx = createMockTransaction({ cardNumber: '19950466' })
      const overrides = new Map([[1, 'Bob']])
      expect(getMemberForTransaction(0, tx, members, overrides)).toBe('Alice')
    })
  })

  describe('calculateMemberSummaries', () => {
    it('should aggregate transactions by member', () => {
      const transactions = [
        createMockTransaction({ cardNumber: '19950466', debit: 100, credit: null }),
        createMockTransaction({ cardNumber: '19950466', debit: 50, credit: null }),
        createMockTransaction({ cardNumber: '19950463', debit: 200, credit: null }),
      ]
      const summaries = calculateMemberSummaries(transactions, members, new Map())

      const alice = summaries.find((s) => s.memberName === 'Alice')
      const bob = summaries.find((s) => s.memberName === 'Bob')
      expect(alice?.total).toBe(150)
      expect(alice?.count).toBe(2)
      expect(alice?.transactions).toHaveLength(2)
      expect(alice?.transactions[0].debit).toBe(100)
      expect(alice?.transactions[1].debit).toBe(50)
      expect(bob?.total).toBe(200)
      expect(bob?.count).toBe(1)
      expect(bob?.transactions).toHaveLength(1)
      expect(bob?.transactions[0].debit).toBe(200)
    })

    it('should include Unassigned group for unmatched transactions', () => {
      const transactions = [
        createMockTransaction({ cardNumber: '', debit: 75, credit: null }),
        createMockTransaction({ cardNumber: '19950466', debit: 25, credit: null }),
      ]
      const summaries = calculateMemberSummaries(transactions, members, new Map())

      const unassigned = summaries.find((s) => s.memberName === 'Unassigned')
      expect(unassigned?.total).toBe(75)
      expect(unassigned?.count).toBe(1)
      expect(unassigned?.transactions).toHaveLength(1)
      expect(unassigned?.transactions[0].debit).toBe(75)
    })

    it('should calculate correct percentages', () => {
      const transactions = [
        createMockTransaction({ cardNumber: '19950466', debit: 100, credit: null }),
        createMockTransaction({ cardNumber: '19950463', debit: 100, credit: null }),
      ]
      const summaries = calculateMemberSummaries(transactions, members, new Map())

      const alice = summaries.find((s) => s.memberName === 'Alice')
      const bob = summaries.find((s) => s.memberName === 'Bob')
      expect(alice?.percentage).toBe(50)
      expect(bob?.percentage).toBe(50)
    })

    it('should respect overrides over auto-assignment', () => {
      const transactions = [
        createMockTransaction({ cardNumber: '19950466', debit: 100, credit: null }),
      ]
      const overrides = new Map([[0, 'Bob']])
      const summaries = calculateMemberSummaries(transactions, members, overrides)

      const alice = summaries.find((s) => s.memberName === 'Alice')
      const bob = summaries.find((s) => s.memberName === 'Bob')
      expect(alice).toBeUndefined()
      expect(bob?.total).toBe(100)
      expect(bob?.transactions).toHaveLength(1)
    })

    it('should skip credit-only transactions (debit = 0)', () => {
      const transactions = [
        createMockTransaction({ cardNumber: '19950466', debit: null, credit: 500 }),
      ]
      const summaries = calculateMemberSummaries(transactions, members, new Map())
      expect(summaries).toHaveLength(0)
    })

    it('should return empty array when no transactions', () => {
      const summaries = calculateMemberSummaries([], members, new Map())
      expect(summaries).toHaveLength(0)
    })

    it('should use member colors', () => {
      const transactions = [
        createMockTransaction({ cardNumber: '19950466', debit: 100, credit: null }),
      ]
      const summaries = calculateMemberSummaries(transactions, members, new Map())
      const alice = summaries.find((s) => s.memberName === 'Alice')
      expect(alice?.color).toBe('#3b82f6')
    })
  })

  describe('detectCards', () => {
    it('should return distinct cards with correct counts and totals', () => {
      const transactions = [
        createMockTransaction({ cardNumber: '19950466', debit: 100, credit: null }),
        createMockTransaction({ cardNumber: '19950466', debit: 50, credit: null }),
        createMockTransaction({ cardNumber: '19950463', debit: 200, credit: null }),
      ]
      const cards = detectCards(transactions)

      expect(cards).toHaveLength(2)
      const card466 = cards.find((c) => c.cardNumber === '19950466')
      const card463 = cards.find((c) => c.cardNumber === '19950463')
      expect(card466?.transactionCount).toBe(2)
      expect(card466?.totalSpent).toBe(150)
      expect(card463?.transactionCount).toBe(1)
      expect(card463?.totalSpent).toBe(200)
    })

    it('should skip transactions with empty cardNumber', () => {
      const transactions = [
        createMockTransaction({ cardNumber: '', debit: 100, credit: null }),
        createMockTransaction({ cardNumber: '19950466', debit: 50, credit: null }),
      ]
      const cards = detectCards(transactions)

      expect(cards).toHaveLength(1)
      expect(cards[0].cardNumber).toBe('19950466')
    })

    it('should return empty array when no cards found', () => {
      const transactions = [createMockTransaction({ cardNumber: '', debit: 100, credit: null })]
      expect(detectCards(transactions)).toHaveLength(0)
      expect(detectCards([])).toHaveLength(0)
    })

    it('should sort by transaction count descending', () => {
      const transactions = [
        createMockTransaction({ cardNumber: '11111111', debit: 10, credit: null }),
        createMockTransaction({ cardNumber: '22222222', debit: 10, credit: null }),
        createMockTransaction({ cardNumber: '22222222', debit: 10, credit: null }),
        createMockTransaction({ cardNumber: '22222222', debit: 10, credit: null }),
        createMockTransaction({ cardNumber: '11111111', debit: 10, credit: null }),
      ]
      const cards = detectCards(transactions)

      expect(cards[0].cardNumber).toBe('22222222')
      expect(cards[0].transactionCount).toBe(3)
      expect(cards[1].cardNumber).toBe('11111111')
      expect(cards[1].transactionCount).toBe(2)
    })

    it('should calculate correct firstSeen and lastSeen dates', () => {
      const transactions = [
        createMockTransaction({
          cardNumber: '19950466',
          purchaseDate: new Date('2024-03-15'),
          debit: 10,
          credit: null,
        }),
        createMockTransaction({
          cardNumber: '19950466',
          purchaseDate: new Date('2024-01-10'),
          debit: 20,
          credit: null,
        }),
        createMockTransaction({
          cardNumber: '19950466',
          purchaseDate: new Date('2024-06-20'),
          debit: 30,
          credit: null,
        }),
      ]
      const cards = detectCards(transactions)

      expect(cards).toHaveLength(1)
      expect(cards[0].firstSeen).toEqual(new Date('2024-01-10'))
      expect(cards[0].lastSeen).toEqual(new Date('2024-06-20'))
    })
  })
})
