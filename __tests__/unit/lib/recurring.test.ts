import { describe, it, expect } from 'vitest'
import {
  normalizeMerchantName,
  detectRecurringTransactions,
  transactionFingerprint,
  mergeRecurringWithManual,
} from '@/lib/recurring'
import type { RecurringAnalysis } from '@/lib/recurring'
import type { ManualRecurringTransaction } from '@/lib/types'
import { createMockTransaction } from '../../fixtures/transactions'

describe('recurring', () => {
  describe('normalizeMerchantName', () => {
    it('should lowercase text', () => {
      expect(normalizeMerchantName('NETFLIX')).toBe('netflix')
    })

    it('should strip .com and other domain suffixes', () => {
      expect(normalizeMerchantName('NETFLIX.COM')).toBe('netflix')
      expect(normalizeMerchantName('spotify.ch')).toBe('spotify')
      expect(normalizeMerchantName('example.co.uk')).toBe('example')
      expect(normalizeMerchantName('service.io')).toBe('service')
    })

    it('should remove noise words', () => {
      expect(normalizeMerchantName('NETFLIX Monthly Subscription')).toBe('netflix')
      expect(normalizeMerchantName('Spotify Premium Renewal')).toBe('spotify')
      expect(normalizeMerchantName('GYM Membership Payment')).toBe('gym')
    })

    it('should remove date patterns', () => {
      expect(normalizeMerchantName('NETFLIX 15.01.2024')).toBe('netflix')
      expect(normalizeMerchantName('SPOTIFY 01/2024')).toBe('spotify')
      expect(normalizeMerchantName('SERVICE 2024-01-15')).toBe('service')
    })

    it('should remove long reference numbers', () => {
      expect(normalizeMerchantName('NETFLIX 1234567890')).toBe('netflix')
      expect(normalizeMerchantName('SPOTIFY REF 98765')).toBe('spotify ref')
    })

    it('should not merge different merchants', () => {
      const netflix = normalizeMerchantName('NETFLIX')
      const netflex = normalizeMerchantName('NETFLEX')
      expect(netflix).not.toBe(netflex)
    })

    it('should handle empty and noise-only strings', () => {
      expect(normalizeMerchantName('')).toBe('')
      expect(normalizeMerchantName('monthly payment subscription')).toBe('')
    })

    it('should replace punctuation with spaces and collapse whitespace', () => {
      expect(normalizeMerchantName('HELLO---WORLD')).toBe('hello world')
      expect(normalizeMerchantName('A.B.C')).toBe('a b c')
    })

    it('should normalize similar booking texts to the same key', () => {
      const a = normalizeMerchantName('NETFLIX.COM Monthly 15.01.2024')
      const b = normalizeMerchantName('NETFLIX.COM Monthly 15.02.2024')
      expect(a).toBe(b)
      expect(a).toBe('netflix')
    })
  })

  describe('detectRecurringTransactions', () => {
    const referenceDate = new Date('2024-07-15')

    it('should detect monthly recurring transactions', () => {
      const txns = [
        createMockTransaction({
          bookingText: 'NETFLIX.COM Monthly',
          purchaseDate: new Date('2024-01-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX.COM Monthly',
          purchaseDate: new Date('2024-02-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX.COM Monthly',
          purchaseDate: new Date('2024-03-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX.COM Monthly',
          purchaseDate: new Date('2024-04-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX.COM Monthly',
          purchaseDate: new Date('2024-05-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX.COM Monthly',
          purchaseDate: new Date('2024-06-15'),
          debit: 12.99,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      expect(result.dataQuality.hasEnoughData).toBe(true)
      expect(result.recurring.length).toBe(1)
      expect(result.recurring[0].frequency).toBe('monthly')
      expect(result.recurring[0].merchantName).toBe('netflix')
      expect(result.recurring[0].occurrences).toBe(6)
      expect(result.recurring[0].status).toBe('active')
    })

    it('should detect weekly recurring transactions', () => {
      const txns: ReturnType<typeof createMockTransaction>[] = []
      // Weekly transactions (every 7 days) for 2 months
      for (let i = 0; i < 8; i++) {
        const date = new Date('2024-05-01')
        date.setDate(date.getDate() + i * 7)
        txns.push(
          createMockTransaction({
            bookingText: 'GYM MEMBERSHIP',
            purchaseDate: date,
            debit: 15,
          })
        )
      }
      const result = detectRecurringTransactions(txns, referenceDate)
      const gym = result.recurring.find((r) => r.merchantName === 'gym')
      expect(gym).toBeDefined()
      expect(gym!.frequency).toBe('weekly')
      expect(gym!.monthlyEquivalent).toBeCloseTo(15 * (52 / 12), 1)
    })

    it('should detect quarterly recurring transactions', () => {
      const txns = [
        createMockTransaction({
          bookingText: 'INSURANCE CO',
          purchaseDate: new Date('2024-01-10'),
          debit: 300,
        }),
        createMockTransaction({
          bookingText: 'INSURANCE CO',
          purchaseDate: new Date('2024-04-10'),
          debit: 300,
        }),
        createMockTransaction({
          bookingText: 'INSURANCE CO',
          purchaseDate: new Date('2024-07-10'),
          debit: 300,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      const insurance = result.recurring.find((r) => r.merchantName === 'insurance co')
      expect(insurance).toBeDefined()
      expect(insurance!.frequency).toBe('quarterly')
      expect(insurance!.monthlyEquivalent).toBeCloseTo(100)
    })

    it('should group transactions by normalized merchant name', () => {
      const txns = [
        createMockTransaction({
          bookingText: 'NETFLIX.COM 15.01.2024',
          purchaseDate: new Date('2024-01-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX.COM 15.02.2024',
          purchaseDate: new Date('2024-02-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX.COM 15.03.2024',
          purchaseDate: new Date('2024-03-15'),
          debit: 12.99,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      expect(result.recurring.length).toBe(1)
      expect(result.recurring[0].merchantName).toBe('netflix')
    })

    it('should detect price changes above 5%', () => {
      const txns = [
        createMockTransaction({
          bookingText: 'SPOTIFY',
          purchaseDate: new Date('2024-01-15'),
          debit: 9.99,
        }),
        createMockTransaction({
          bookingText: 'SPOTIFY',
          purchaseDate: new Date('2024-02-15'),
          debit: 9.99,
        }),
        createMockTransaction({
          bookingText: 'SPOTIFY',
          purchaseDate: new Date('2024-03-15'),
          debit: 9.99,
        }),
        createMockTransaction({
          bookingText: 'SPOTIFY',
          purchaseDate: new Date('2024-04-15'),
          debit: 9.99,
        }),
        createMockTransaction({
          bookingText: 'SPOTIFY',
          purchaseDate: new Date('2024-05-15'),
          debit: 9.99,
        }),
        createMockTransaction({
          bookingText: 'SPOTIFY',
          purchaseDate: new Date('2024-06-15'),
          debit: 12.99,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      const spotify = result.recurring.find((r) => r.merchantName === 'spotify')
      expect(spotify).toBeDefined()
      expect(spotify!.status).toBe('price-changed')
      expect(spotify!.priceChange).not.toBeNull()
      expect(spotify!.priceChange!).toBeGreaterThan(5)
      expect(result.priceChanges.length).toBe(1)
    })

    it('should not flag small price variations (<=5%)', () => {
      const txns = [
        createMockTransaction({
          bookingText: 'SERVICE X',
          purchaseDate: new Date('2024-01-15'),
          debit: 100,
        }),
        createMockTransaction({
          bookingText: 'SERVICE X',
          purchaseDate: new Date('2024-02-15'),
          debit: 100,
        }),
        createMockTransaction({
          bookingText: 'SERVICE X',
          purchaseDate: new Date('2024-03-15'),
          debit: 100,
        }),
        createMockTransaction({
          bookingText: 'SERVICE X',
          purchaseDate: new Date('2024-04-15'),
          debit: 100,
        }),
        createMockTransaction({
          bookingText: 'SERVICE X',
          purchaseDate: new Date('2024-05-15'),
          debit: 100,
        }),
        createMockTransaction({
          bookingText: 'SERVICE X',
          purchaseDate: new Date('2024-06-15'),
          debit: 103,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      const service = result.recurring.find((r) => r.merchantName === 'service x')
      expect(service).toBeDefined()
      expect(service!.priceChange).toBeNull()
      expect(service!.status).toBe('active')
    })

    it('should mark new subscriptions', () => {
      const txns = [
        // Long-running subscription
        createMockTransaction({
          bookingText: 'NETFLIX',
          purchaseDate: new Date('2024-01-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX',
          purchaseDate: new Date('2024-02-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX',
          purchaseDate: new Date('2024-03-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX',
          purchaseDate: new Date('2024-04-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX',
          purchaseDate: new Date('2024-05-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX',
          purchaseDate: new Date('2024-06-15'),
          debit: 12.99,
        }),
        // New subscription (first seen 2 months ago)
        createMockTransaction({
          bookingText: 'NEWAPP',
          purchaseDate: new Date('2024-06-01'),
          debit: 5.99,
        }),
        createMockTransaction({
          bookingText: 'NEWAPP',
          purchaseDate: new Date('2024-07-01'),
          debit: 5.99,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      const newApp = result.recurring.find((r) => r.merchantName === 'newapp')
      expect(newApp).toBeDefined()
      expect(newApp!.status).toBe('new')
      expect(result.newSubscriptions.length).toBe(1)
    })

    it('should mark cancelled subscriptions', () => {
      const txns = [
        createMockTransaction({
          bookingText: 'OLDSERVICE',
          purchaseDate: new Date('2024-01-15'),
          debit: 9.99,
        }),
        createMockTransaction({
          bookingText: 'OLDSERVICE',
          purchaseDate: new Date('2024-02-15'),
          debit: 9.99,
        }),
        createMockTransaction({
          bookingText: 'OLDSERVICE',
          purchaseDate: new Date('2024-03-15'),
          debit: 9.99,
        }),
        createMockTransaction({
          bookingText: 'OLDSERVICE',
          purchaseDate: new Date('2024-04-15'),
          debit: 9.99,
        }),
        // Last seen April, reference is July — 3 months gap
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      const old = result.recurring.find((r) => r.merchantName === 'oldservice')
      expect(old).toBeDefined()
      expect(old!.status).toBe('cancelled')
      expect(result.cancelledSubscriptions.length).toBe(1)
    })

    it('should compute monthly equivalents correctly', () => {
      const txns = [
        // Monthly at 10
        createMockTransaction({
          bookingText: 'MONTHLY SVC',
          purchaseDate: new Date('2024-01-15'),
          debit: 10,
        }),
        createMockTransaction({
          bookingText: 'MONTHLY SVC',
          purchaseDate: new Date('2024-02-15'),
          debit: 10,
        }),
        createMockTransaction({
          bookingText: 'MONTHLY SVC',
          purchaseDate: new Date('2024-03-15'),
          debit: 10,
        }),
        createMockTransaction({
          bookingText: 'MONTHLY SVC',
          purchaseDate: new Date('2024-04-15'),
          debit: 10,
        }),
        createMockTransaction({
          bookingText: 'MONTHLY SVC',
          purchaseDate: new Date('2024-05-15'),
          debit: 10,
        }),
        createMockTransaction({
          bookingText: 'MONTHLY SVC',
          purchaseDate: new Date('2024-06-15'),
          debit: 10,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      const svc = result.recurring.find((r) => r.merchantName === 'svc')
      expect(svc).toBeDefined()
      expect(svc!.monthlyEquivalent).toBeCloseTo(10)
    })

    it('should exclude cancelled from total monthly recurring', () => {
      const txns = [
        // Active subscription
        createMockTransaction({
          bookingText: 'ACTIVE SVC',
          purchaseDate: new Date('2024-01-15'),
          debit: 20,
        }),
        createMockTransaction({
          bookingText: 'ACTIVE SVC',
          purchaseDate: new Date('2024-02-15'),
          debit: 20,
        }),
        createMockTransaction({
          bookingText: 'ACTIVE SVC',
          purchaseDate: new Date('2024-03-15'),
          debit: 20,
        }),
        createMockTransaction({
          bookingText: 'ACTIVE SVC',
          purchaseDate: new Date('2024-04-15'),
          debit: 20,
        }),
        createMockTransaction({
          bookingText: 'ACTIVE SVC',
          purchaseDate: new Date('2024-05-15'),
          debit: 20,
        }),
        createMockTransaction({
          bookingText: 'ACTIVE SVC',
          purchaseDate: new Date('2024-06-15'),
          debit: 20,
        }),
        // Cancelled subscription
        createMockTransaction({
          bookingText: 'OLD SVC',
          purchaseDate: new Date('2024-01-15'),
          debit: 50,
        }),
        createMockTransaction({
          bookingText: 'OLD SVC',
          purchaseDate: new Date('2024-02-15'),
          debit: 50,
        }),
        createMockTransaction({
          bookingText: 'OLD SVC',
          purchaseDate: new Date('2024-03-15'),
          debit: 50,
        }),
        createMockTransaction({
          bookingText: 'OLD SVC',
          purchaseDate: new Date('2024-04-15'),
          debit: 50,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      const active = result.recurring.find((r) => r.merchantName === 'active svc')
      const old = result.recurring.find((r) => r.merchantName === 'old svc')
      expect(active).toBeDefined()
      expect(old).toBeDefined()
      expect(old!.status).toBe('cancelled')
      // Total should only include active
      expect(result.totalMonthlyRecurring).toBeCloseTo(active!.monthlyEquivalent)
    })

    it('should ignore one-off purchases (single occurrence)', () => {
      const txns = [
        createMockTransaction({
          bookingText: 'ONE TIME SHOP',
          purchaseDate: new Date('2024-03-15'),
          debit: 500,
        }),
        // Need at least 2 months of data range
        createMockTransaction({
          bookingText: 'NETFLIX',
          purchaseDate: new Date('2024-01-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX',
          purchaseDate: new Date('2024-02-15'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX',
          purchaseDate: new Date('2024-03-15'),
          debit: 12.99,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      const oneTime = result.recurring.find((r) => r.merchantName === 'one time shop')
      expect(oneTime).toBeUndefined()
    })

    it('should ignore credits (non-debit transactions)', () => {
      const txns = [
        createMockTransaction({
          bookingText: 'REFUND SERVICE',
          purchaseDate: new Date('2024-01-15'),
          debit: null,
          credit: 50,
        }),
        createMockTransaction({
          bookingText: 'REFUND SERVICE',
          purchaseDate: new Date('2024-02-15'),
          debit: null,
          credit: 50,
        }),
        createMockTransaction({
          bookingText: 'REFUND SERVICE',
          purchaseDate: new Date('2024-03-15'),
          debit: null,
          credit: 50,
        }),
        // Need valid debit transactions for data range
        createMockTransaction({
          bookingText: 'SOME DEBIT',
          purchaseDate: new Date('2024-01-15'),
          debit: 10,
        }),
        createMockTransaction({
          bookingText: 'SOME DEBIT',
          purchaseDate: new Date('2024-03-15'),
          debit: 10,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      const refund = result.recurring.find((r) => r.merchantName === 'refund service')
      expect(refund).toBeUndefined()
    })

    it('should handle empty input', () => {
      const result = detectRecurringTransactions([], referenceDate)
      expect(result.recurring).toHaveLength(0)
      expect(result.totalMonthlyRecurring).toBe(0)
      expect(result.dataQuality.hasEnoughData).toBe(false)
    })

    it('should return not enough data with less than 2 months', () => {
      const txns = [
        createMockTransaction({
          bookingText: 'NETFLIX',
          purchaseDate: new Date('2024-06-01'),
          debit: 12.99,
        }),
        createMockTransaction({
          bookingText: 'NETFLIX',
          purchaseDate: new Date('2024-06-15'),
          debit: 12.99,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      expect(result.dataQuality.hasEnoughData).toBe(false)
    })

    it('should filter out grocery stores with variable amounts', () => {
      const txns = [
        // Grocery store visits — same merchant, wildly different amounts
        createMockTransaction({
          bookingText: 'MIGROS ZURICH',
          purchaseDate: new Date('2024-01-05'),
          debit: 45.3,
        }),
        createMockTransaction({
          bookingText: 'MIGROS ZURICH',
          purchaseDate: new Date('2024-02-08'),
          debit: 112.5,
        }),
        createMockTransaction({
          bookingText: 'MIGROS ZURICH',
          purchaseDate: new Date('2024-03-12'),
          debit: 23.8,
        }),
        createMockTransaction({
          bookingText: 'MIGROS ZURICH',
          purchaseDate: new Date('2024-04-03'),
          debit: 87.2,
        }),
        createMockTransaction({
          bookingText: 'MIGROS ZURICH',
          purchaseDate: new Date('2024-05-15'),
          debit: 56.9,
        }),
        createMockTransaction({
          bookingText: 'MIGROS ZURICH',
          purchaseDate: new Date('2024-06-10'),
          debit: 134.0,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      const migros = result.recurring.find((r) => r.merchantName.includes('migros'))
      expect(migros).toBeUndefined()
    })

    it('should filter out train tickets with variable amounts', () => {
      const txns = [
        // Train tickets — same provider, different routes/prices
        createMockTransaction({
          bookingText: 'SBB CFF FFS',
          purchaseDate: new Date('2024-01-10'),
          debit: 15.4,
        }),
        createMockTransaction({
          bookingText: 'SBB CFF FFS',
          purchaseDate: new Date('2024-02-14'),
          debit: 45.0,
        }),
        createMockTransaction({
          bookingText: 'SBB CFF FFS',
          purchaseDate: new Date('2024-03-20'),
          debit: 32.6,
        }),
        createMockTransaction({
          bookingText: 'SBB CFF FFS',
          purchaseDate: new Date('2024-04-05'),
          debit: 8.8,
        }),
        createMockTransaction({
          bookingText: 'SBB CFF FFS',
          purchaseDate: new Date('2024-05-18'),
          debit: 62.0,
        }),
        createMockTransaction({
          bookingText: 'SBB CFF FFS',
          purchaseDate: new Date('2024-06-22'),
          debit: 28.5,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      const sbb = result.recurring.find((r) => r.merchantName.includes('sbb'))
      expect(sbb).toBeUndefined()
    })

    it('should still detect subscriptions with consistent amounts', () => {
      const txns = [
        // Real subscription — same amount every month
        createMockTransaction({
          bookingText: 'SPOTIFY',
          purchaseDate: new Date('2024-01-15'),
          debit: 9.99,
        }),
        createMockTransaction({
          bookingText: 'SPOTIFY',
          purchaseDate: new Date('2024-02-15'),
          debit: 9.99,
        }),
        createMockTransaction({
          bookingText: 'SPOTIFY',
          purchaseDate: new Date('2024-03-15'),
          debit: 9.99,
        }),
        createMockTransaction({
          bookingText: 'SPOTIFY',
          purchaseDate: new Date('2024-04-15'),
          debit: 9.99,
        }),
        createMockTransaction({
          bookingText: 'SPOTIFY',
          purchaseDate: new Date('2024-05-15'),
          debit: 9.99,
        }),
        createMockTransaction({
          bookingText: 'SPOTIFY',
          purchaseDate: new Date('2024-06-15'),
          debit: 9.99,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      const spotify = result.recurring.find((r) => r.merchantName === 'spotify')
      expect(spotify).toBeDefined()
      expect(spotify!.frequency).toBe('monthly')
    })

    it('should sort recurring by monthly equivalent descending', () => {
      const txns = [
        // Cheap subscription
        createMockTransaction({
          bookingText: 'CHEAP APP',
          purchaseDate: new Date('2024-01-15'),
          debit: 2,
        }),
        createMockTransaction({
          bookingText: 'CHEAP APP',
          purchaseDate: new Date('2024-02-15'),
          debit: 2,
        }),
        createMockTransaction({
          bookingText: 'CHEAP APP',
          purchaseDate: new Date('2024-03-15'),
          debit: 2,
        }),
        createMockTransaction({
          bookingText: 'CHEAP APP',
          purchaseDate: new Date('2024-04-15'),
          debit: 2,
        }),
        createMockTransaction({
          bookingText: 'CHEAP APP',
          purchaseDate: new Date('2024-05-15'),
          debit: 2,
        }),
        createMockTransaction({
          bookingText: 'CHEAP APP',
          purchaseDate: new Date('2024-06-15'),
          debit: 2,
        }),
        // Expensive subscription
        createMockTransaction({
          bookingText: 'EXPENSIVE SVC',
          purchaseDate: new Date('2024-01-15'),
          debit: 100,
        }),
        createMockTransaction({
          bookingText: 'EXPENSIVE SVC',
          purchaseDate: new Date('2024-02-15'),
          debit: 100,
        }),
        createMockTransaction({
          bookingText: 'EXPENSIVE SVC',
          purchaseDate: new Date('2024-03-15'),
          debit: 100,
        }),
        createMockTransaction({
          bookingText: 'EXPENSIVE SVC',
          purchaseDate: new Date('2024-04-15'),
          debit: 100,
        }),
        createMockTransaction({
          bookingText: 'EXPENSIVE SVC',
          purchaseDate: new Date('2024-05-15'),
          debit: 100,
        }),
        createMockTransaction({
          bookingText: 'EXPENSIVE SVC',
          purchaseDate: new Date('2024-06-15'),
          debit: 100,
        }),
      ]
      const result = detectRecurringTransactions(txns, referenceDate)
      expect(result.recurring.length).toBe(2)
      expect(result.recurring[0].monthlyEquivalent).toBeGreaterThan(
        result.recurring[1].monthlyEquivalent
      )
    })
  })

  describe('transactionFingerprint', () => {
    it('should produce consistent fingerprint for the same transaction', () => {
      const t = createMockTransaction({
        bookingText: 'NETFLIX',
        purchaseDate: new Date('2024-06-15'),
        debit: 12.99,
      })
      const fp1 = transactionFingerprint(t)
      const fp2 = transactionFingerprint(t)
      expect(fp1).toBe(fp2)
    })

    it('should produce different fingerprints for different transactions', () => {
      const t1 = createMockTransaction({
        bookingText: 'NETFLIX',
        purchaseDate: new Date('2024-06-15'),
        debit: 12.99,
      })
      const t2 = createMockTransaction({
        bookingText: 'SPOTIFY',
        purchaseDate: new Date('2024-06-15'),
        debit: 9.99,
      })
      expect(transactionFingerprint(t1)).not.toBe(transactionFingerprint(t2))
    })

    it('should handle invalid date gracefully', () => {
      const t = createMockTransaction({
        bookingText: 'TEST',
        purchaseDate: new Date('invalid'),
        debit: 10,
      })
      const fp = transactionFingerprint(t)
      expect(fp).toContain('invalid')
      expect(fp).toContain('TEST')
    })

    it('should use 0 for null debit', () => {
      const t = createMockTransaction({ bookingText: 'TEST', debit: null })
      const fp = transactionFingerprint(t)
      expect(fp).toContain('|0')
    })
  })

  describe('mergeRecurringWithManual', () => {
    const emptyAnalysis: RecurringAnalysis = {
      recurring: [],
      totalMonthlyRecurring: 0,
      newSubscriptions: [],
      cancelledSubscriptions: [],
      priceChanges: [],
      dataQuality: { totalMonths: 0, hasEnoughData: false },
    }

    const manualEntry: ManualRecurringTransaction = {
      id: 1,
      fingerprint: 'TEST|2024-06-15T00:00:00.000Z|12.99',
      merchantName: 'netflix',
      bookingText: 'NETFLIX',
      category: 'Entertainment',
      frequency: 'monthly',
      amount: 12.99,
      currency: 'CHF',
      createdDate: new Date('2024-06-15'),
    }

    it('should return auto analysis when manual is empty', () => {
      const result = mergeRecurringWithManual(emptyAnalysis, [])
      expect(result).toBe(emptyAnalysis)
    })

    it('should add manual items to recurring list', () => {
      const result = mergeRecurringWithManual(emptyAnalysis, [manualEntry])
      expect(result.recurring).toHaveLength(1)
      expect(result.recurring[0].isManual).toBe(true)
      expect(result.recurring[0].manualId).toBe(1)
      expect(result.recurring[0].merchantName).toBe('netflix')
    })

    it('should compute monthly equivalent for manual items', () => {
      const quarterly: ManualRecurringTransaction = {
        ...manualEntry,
        id: 2,
        frequency: 'quarterly',
        amount: 90,
      }
      const result = mergeRecurringWithManual(emptyAnalysis, [quarterly])
      expect(result.recurring[0].monthlyEquivalent).toBeCloseTo(30)
    })

    it('should deduplicate by merchantName', () => {
      const autoWithNetflix: RecurringAnalysis = {
        ...emptyAnalysis,
        recurring: [
          {
            merchantName: 'netflix',
            originalBookingTexts: ['NETFLIX.COM'],
            category: 'Entertainment',
            frequency: 'monthly',
            averageAmount: 12.99,
            lastAmount: 12.99,
            previousAmount: null,
            priceChange: null,
            firstSeen: new Date('2024-01-15'),
            lastSeen: new Date('2024-06-15'),
            occurrences: 6,
            status: 'active',
            monthlyEquivalent: 12.99,
          },
        ],
        totalMonthlyRecurring: 12.99,
      }
      const result = mergeRecurringWithManual(autoWithNetflix, [manualEntry])
      // Should NOT add duplicate
      expect(result.recurring).toHaveLength(1)
      expect(result.recurring[0].isManual).toBeUndefined()
    })

    it('should recalculate total monthly recurring', () => {
      const manual2: ManualRecurringTransaction = {
        ...manualEntry,
        id: 2,
        fingerprint: 'OTHER|2024-06-15T00:00:00.000Z|9.99',
        merchantName: 'spotify',
        amount: 9.99,
      }
      const result = mergeRecurringWithManual(emptyAnalysis, [manualEntry, manual2])
      expect(result.totalMonthlyRecurring).toBeCloseTo(12.99 + 9.99)
    })

    it('should sort merged results by monthly equivalent descending', () => {
      const cheap: ManualRecurringTransaction = {
        ...manualEntry,
        id: 2,
        fingerprint: 'CHEAP|2024-06-15T00:00:00.000Z|2',
        merchantName: 'cheap app',
        amount: 2,
      }
      const expensive: ManualRecurringTransaction = {
        ...manualEntry,
        id: 3,
        fingerprint: 'EXPENSIVE|2024-06-15T00:00:00.000Z|100',
        merchantName: 'expensive svc',
        amount: 100,
      }
      const result = mergeRecurringWithManual(emptyAnalysis, [cheap, expensive])
      expect(result.recurring[0].merchantName).toBe('expensive svc')
      expect(result.recurring[1].merchantName).toBe('cheap app')
    })
  })
})
