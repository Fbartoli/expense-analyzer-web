import { describe, it, expect } from 'vitest'
import { getTransactionHash, mergeTransactions, findInternalDuplicates } from '@/lib/merge'
import { createMockTransaction } from '../../fixtures/transactions'

describe('merge', () => {
  describe('getTransactionHash', () => {
    it('should generate consistent hash for same transaction', () => {
      const tx = createMockTransaction({
        purchaseDate: new Date('2024-06-15'),
        bookingText: 'Test Restaurant',
        debit: 50.0,
        credit: null,
      })

      const hash1 = getTransactionHash(tx)
      const hash2 = getTransactionHash(tx)

      expect(hash1).toBe(hash2)
    })

    it('should generate different hash for different dates', () => {
      const tx1 = createMockTransaction({ purchaseDate: new Date('2024-06-15') })
      const tx2 = createMockTransaction({ purchaseDate: new Date('2024-06-16') })

      expect(getTransactionHash(tx1)).not.toBe(getTransactionHash(tx2))
    })

    it('should generate different hash for different amounts', () => {
      const tx1 = createMockTransaction({ debit: 50.0 })
      const tx2 = createMockTransaction({ debit: 51.0 })

      expect(getTransactionHash(tx1)).not.toBe(getTransactionHash(tx2))
    })

    it('should generate different hash for different booking text', () => {
      const tx1 = createMockTransaction({ bookingText: 'Restaurant A' })
      const tx2 = createMockTransaction({ bookingText: 'Restaurant B' })

      expect(getTransactionHash(tx1)).not.toBe(getTransactionHash(tx2))
    })

    it('should normalize booking text (lowercase, trim spaces)', () => {
      const tx1 = createMockTransaction({ bookingText: '  Test Restaurant  ' })
      const tx2 = createMockTransaction({ bookingText: 'test restaurant' })

      expect(getTransactionHash(tx1)).toBe(getTransactionHash(tx2))
    })

    it('should normalize multiple spaces in booking text', () => {
      const tx1 = createMockTransaction({ bookingText: 'Test   Restaurant' })
      const tx2 = createMockTransaction({ bookingText: 'Test Restaurant' })

      expect(getTransactionHash(tx1)).toBe(getTransactionHash(tx2))
    })

    it('should handle null credit/debit values', () => {
      const tx = createMockTransaction({ debit: null, credit: 100 })

      const hash = getTransactionHash(tx)

      expect(hash).toContain('0.00|100.00')
    })

    it('should handle string date (non-Date object)', () => {
      const tx = createMockTransaction()
      // Simulate a date that's a string (e.g., from JSON parsing)
      ;(tx as { purchaseDate: string | Date }).purchaseDate = '2024-06-15'

      const hash = getTransactionHash(tx)

      expect(hash).toContain('2024-06-15')
    })

    it('should include date in ISO format (YYYY-MM-DD)', () => {
      const tx = createMockTransaction({ purchaseDate: new Date('2024-06-15') })

      const hash = getTransactionHash(tx)

      expect(hash.startsWith('2024-06-15|')).toBe(true)
    })
  })

  describe('mergeTransactions', () => {
    it('should merge non-duplicate transactions', () => {
      const existing = [createMockTransaction({ purchaseDate: new Date('2024-06-15'), debit: 50 })]
      const incoming = [createMockTransaction({ purchaseDate: new Date('2024-06-16'), debit: 75 })]

      const result = mergeTransactions(existing, incoming)

      expect(result.merged).toHaveLength(2)
      expect(result.newTransactions).toHaveLength(1)
      expect(result.duplicates).toHaveLength(0)
    })

    it('should detect and exclude duplicates', () => {
      const existing = [
        createMockTransaction({
          purchaseDate: new Date('2024-06-15'),
          bookingText: 'Test',
          debit: 50,
        }),
      ]
      const incoming = [
        createMockTransaction({
          purchaseDate: new Date('2024-06-15'),
          bookingText: 'Test',
          debit: 50,
        }),
      ]

      const result = mergeTransactions(existing, incoming)

      expect(result.merged).toHaveLength(1)
      expect(result.newTransactions).toHaveLength(0)
      expect(result.duplicates).toHaveLength(1)
    })

    it('should sort merged transactions by date', () => {
      const existing = [createMockTransaction({ purchaseDate: new Date('2024-06-20') })]
      const incoming = [
        createMockTransaction({
          purchaseDate: new Date('2024-06-10'),
          bookingText: 'Earlier',
        }),
      ]

      const result = mergeTransactions(existing, incoming)

      expect(result.merged[0].bookingText).toBe('Earlier')
    })

    it('should return correct stats', () => {
      const existing = [
        createMockTransaction({ purchaseDate: new Date('2024-06-15'), debit: 50 }),
        createMockTransaction({ purchaseDate: new Date('2024-06-16'), debit: 60 }),
      ]
      const incoming = [
        createMockTransaction({ purchaseDate: new Date('2024-06-15'), debit: 50 }), // duplicate
        createMockTransaction({ purchaseDate: new Date('2024-06-17'), debit: 70 }), // new
      ]

      const result = mergeTransactions(existing, incoming)

      expect(result.stats.originalCount).toBe(2)
      expect(result.stats.newCount).toBe(2)
      expect(result.stats.mergedCount).toBe(3)
      expect(result.stats.duplicatesFound).toBe(1)
    })

    it('should prevent duplicates within incoming set', () => {
      const existing: ReturnType<typeof createMockTransaction>[] = []
      const incoming = [
        createMockTransaction({
          purchaseDate: new Date('2024-06-15'),
          bookingText: 'Same',
          debit: 50,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-06-15'),
          bookingText: 'Same',
          debit: 50,
        }),
      ]

      const result = mergeTransactions(existing, incoming)

      expect(result.merged).toHaveLength(1)
      expect(result.duplicates).toHaveLength(1)
    })

    it('should handle empty existing array', () => {
      const existing: ReturnType<typeof createMockTransaction>[] = []
      const incoming = [createMockTransaction({ purchaseDate: new Date('2024-06-15') })]

      const result = mergeTransactions(existing, incoming)

      expect(result.merged).toHaveLength(1)
      expect(result.newTransactions).toHaveLength(1)
    })

    it('should handle empty incoming array', () => {
      const existing = [createMockTransaction()]
      const incoming: ReturnType<typeof createMockTransaction>[] = []

      const result = mergeTransactions(existing, incoming)

      expect(result.merged).toHaveLength(1)
      expect(result.newTransactions).toHaveLength(0)
    })

    it('should handle both arrays empty', () => {
      const result = mergeTransactions([], [])

      expect(result.merged).toHaveLength(0)
      expect(result.stats.mergedCount).toBe(0)
    })

    it('should handle string dates during merge sort', () => {
      const existing = [
        {
          ...createMockTransaction(),
          purchaseDate: '2024-06-20' as unknown as Date,
        },
      ]
      const incoming = [
        {
          ...createMockTransaction({ bookingText: 'Earlier' }),
          purchaseDate: '2024-06-10' as unknown as Date,
        },
      ]

      const result = mergeTransactions(existing, incoming)

      expect(result.merged[0].bookingText).toBe('Earlier')
    })
  })

  describe('findInternalDuplicates', () => {
    it('should return empty array when no duplicates', () => {
      const transactions = [
        createMockTransaction({ purchaseDate: new Date('2024-06-15'), debit: 50 }),
        createMockTransaction({ purchaseDate: new Date('2024-06-16'), debit: 60 }),
      ]

      const duplicates = findInternalDuplicates(transactions)

      expect(duplicates).toHaveLength(0)
    })

    it('should find duplicate pairs', () => {
      const transactions = [
        createMockTransaction({
          purchaseDate: new Date('2024-06-15'),
          bookingText: 'Same',
          debit: 50,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-06-15'),
          bookingText: 'Same',
          debit: 50,
        }),
      ]

      const duplicates = findInternalDuplicates(transactions)

      expect(duplicates).toHaveLength(1)
      expect(duplicates[0]).toHaveLength(2)
    })

    it('should find multiple duplicate groups', () => {
      const transactions = [
        // Group 1
        createMockTransaction({
          purchaseDate: new Date('2024-06-15'),
          bookingText: 'Restaurant A',
          debit: 50,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-06-15'),
          bookingText: 'Restaurant A',
          debit: 50,
        }),
        // Group 2
        createMockTransaction({
          purchaseDate: new Date('2024-06-16'),
          bookingText: 'Restaurant B',
          debit: 75,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-06-16'),
          bookingText: 'Restaurant B',
          debit: 75,
        }),
        // Unique
        createMockTransaction({
          purchaseDate: new Date('2024-06-17'),
          bookingText: 'Unique',
          debit: 100,
        }),
      ]

      const duplicates = findInternalDuplicates(transactions)

      expect(duplicates).toHaveLength(2)
    })

    it('should find groups with more than 2 duplicates', () => {
      const transactions = [
        createMockTransaction({
          purchaseDate: new Date('2024-06-15'),
          bookingText: 'Same',
          debit: 50,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-06-15'),
          bookingText: 'Same',
          debit: 50,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-06-15'),
          bookingText: 'Same',
          debit: 50,
        }),
      ]

      const duplicates = findInternalDuplicates(transactions)

      expect(duplicates).toHaveLength(1)
      expect(duplicates[0]).toHaveLength(3)
    })

    it('should handle empty array', () => {
      const duplicates = findInternalDuplicates([])

      expect(duplicates).toHaveLength(0)
    })

    it('should handle single transaction', () => {
      const duplicates = findInternalDuplicates([createMockTransaction()])

      expect(duplicates).toHaveLength(0)
    })
  })
})
