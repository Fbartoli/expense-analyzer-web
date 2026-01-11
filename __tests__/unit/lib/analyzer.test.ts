import { describe, it, expect } from 'vitest'
import { categorizeTransaction, analyzeExpenses, calculateBudgetStatus } from '@/lib/analyzer'
import { createMockTransaction, createMockBudget } from '../../fixtures/transactions'

describe('analyzer', () => {
  describe('categorizeTransaction', () => {
    describe('sector-based categorization', () => {
      it('should categorize Restaurants sector', () => {
        const tx = createMockTransaction({ sector: 'Restaurants' })
        expect(categorizeTransaction(tx)).toBe('Restaurants & Dining')
      })

      it('should categorize Fast-Food Restaurants sector', () => {
        const tx = createMockTransaction({ sector: 'Fast-Food Restaurants' })
        expect(categorizeTransaction(tx)).toBe('Restaurants & Dining')
      })

      it('should categorize Hotels sector', () => {
        const tx = createMockTransaction({ sector: 'Hotels' })
        expect(categorizeTransaction(tx)).toBe('Travel & Accommodation')
      })

      it('should categorize Grocery stores sector', () => {
        const tx = createMockTransaction({ sector: 'Grocery stores' })
        expect(categorizeTransaction(tx)).toBe('Groceries')
      })

      it('should categorize Commuter transportation sector', () => {
        const tx = createMockTransaction({ sector: 'Commuter transportation' })
        expect(categorizeTransaction(tx)).toBe('Transportation')
      })

      it('should categorize Pharmacies sector', () => {
        const tx = createMockTransaction({ sector: 'Pharmacies' })
        expect(categorizeTransaction(tx)).toBe('Health & Beauty')
      })
    })

    describe('booking text-based categorization', () => {
      it('should categorize Uber Eats as dining', () => {
        const tx = createMockTransaction({
          bookingText: 'UBER EATS Amsterdam',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Restaurants & Dining')
      })

      it('should categorize Deliveroo as dining', () => {
        const tx = createMockTransaction({
          bookingText: 'Deliveroo Order',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Restaurants & Dining')
      })

      it('should categorize booking.com as travel', () => {
        const tx = createMockTransaction({
          bookingText: 'BOOKING.COM Hotel Reservation',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Travel & Accommodation')
      })

      it('should categorize Netflix as entertainment', () => {
        const tx = createMockTransaction({
          bookingText: 'NETFLIX.COM Monthly',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Entertainment')
      })

      it('should categorize Spotify as entertainment', () => {
        const tx = createMockTransaction({
          bookingText: 'SPOTIFY Premium',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Entertainment')
      })

      it('should categorize Coinbase as crypto', () => {
        const tx = createMockTransaction({
          bookingText: 'COINBASE Purchase',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Crypto & Investments')
      })

      it('should categorize gym as fitness', () => {
        const tx = createMockTransaction({
          bookingText: 'GYM MEMBERSHIP Monthly',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Fitness & Sports')
      })
    })

    describe('manual category override', () => {
      it('should respect manual category override', () => {
        const tx = {
          ...createMockTransaction({ sector: 'Restaurants' }),
          manualCategory: 'Entertainment',
        }
        expect(categorizeTransaction(tx)).toBe('Entertainment')
      })
    })

    describe('fallback categorization', () => {
      it('should return Other for unrecognized transactions', () => {
        const tx = createMockTransaction({
          sector: 'Unknown Sector XYZ',
          bookingText: 'Random Unknown Merchant',
        })
        expect(categorizeTransaction(tx)).toBe('Other')
      })
    })
  })

  describe('analyzeExpenses', () => {
    it('should calculate total spent correctly', () => {
      const transactions = [
        createMockTransaction({ debit: 100, credit: null }),
        createMockTransaction({ debit: 50, credit: null }),
        createMockTransaction({ debit: null, credit: 200 }),
      ]

      const report = analyzeExpenses(transactions)

      expect(report.totalSpent).toBe(150)
      expect(report.totalIncome).toBe(200)
      expect(report.netBalance).toBe(50)
    })

    it('should count transactions correctly', () => {
      const transactions = [
        createMockTransaction(),
        createMockTransaction(),
        createMockTransaction(),
      ]

      const report = analyzeExpenses(transactions)

      expect(report.transactionCount).toBe(3)
    })

    it('should group by category correctly', () => {
      const transactions = [
        createMockTransaction({ sector: 'Restaurants', debit: 50 }),
        createMockTransaction({ sector: 'Restaurants', debit: 30 }),
        createMockTransaction({ sector: 'Grocery stores', debit: 100 }),
      ]

      const report = analyzeExpenses(transactions)

      const restaurantCategory = report.categorySummaries.find(
        (c) => c.category === 'Restaurants & Dining'
      )
      const groceryCategory = report.categorySummaries.find((c) => c.category === 'Groceries')

      expect(restaurantCategory?.totalSpent).toBe(80)
      expect(restaurantCategory?.count).toBe(2)
      expect(groceryCategory?.totalSpent).toBe(100)
      expect(groceryCategory?.count).toBe(1)
    })

    it('should sort categories by total spent descending', () => {
      const transactions = [
        createMockTransaction({ sector: 'Restaurants', debit: 50 }),
        createMockTransaction({ sector: 'Grocery stores', debit: 200 }),
        createMockTransaction({ sector: 'Hotels', debit: 100 }),
      ]

      const report = analyzeExpenses(transactions)

      expect(report.categorySummaries[0].category).toBe('Groceries')
      expect(report.categorySummaries[1].category).toBe('Travel & Accommodation')
      expect(report.categorySummaries[2].category).toBe('Restaurants & Dining')
    })

    it('should calculate monthly analysis correctly', () => {
      const transactions = [
        createMockTransaction({
          purchaseDate: new Date('2024-06-15'),
          debit: 100,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-06-20'),
          debit: 50,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-07-05'),
          debit: 75,
        }),
      ]

      const report = analyzeExpenses(transactions)

      expect(report.monthlyAnalysis).toHaveLength(2)
      const june = report.monthlyAnalysis.find((m) => m.monthKey === '2024-06')
      const july = report.monthlyAnalysis.find((m) => m.monthKey === '2024-07')

      expect(june?.totalSpent).toBe(150)
      expect(july?.totalSpent).toBe(75)
    })

    it('should return top 10 expenses sorted by amount', () => {
      const transactions = Array.from({ length: 15 }, (_, i) =>
        createMockTransaction({ debit: (i + 1) * 10 })
      )

      const report = analyzeExpenses(transactions)

      expect(report.topExpenses).toHaveLength(10)
      expect(report.topExpenses[0].debit).toBe(150)
      expect(report.topExpenses[9].debit).toBe(60)
    })

    it('should calculate date range correctly', () => {
      const transactions = [
        createMockTransaction({ purchaseDate: new Date('2024-01-15') }),
        createMockTransaction({ purchaseDate: new Date('2024-06-20') }),
        createMockTransaction({ purchaseDate: new Date('2024-03-10') }),
      ]

      const report = analyzeExpenses(transactions)

      expect(report.dateRange.start.toISOString().split('T')[0]).toBe('2024-01-15')
      expect(report.dateRange.end.toISOString().split('T')[0]).toBe('2024-06-20')
    })

    it('should apply category overrides', () => {
      const transactions = [createMockTransaction({ sector: 'Restaurants', debit: 100 })]
      const overrides = new Map<number, string>()
      overrides.set(0, 'Entertainment')

      const report = analyzeExpenses(transactions, overrides)

      expect(report.categorySummaries[0].category).toBe('Entertainment')
    })

    it('should handle empty transactions array', () => {
      const report = analyzeExpenses([])

      expect(report.totalSpent).toBe(0)
      expect(report.totalIncome).toBe(0)
      expect(report.transactionCount).toBe(0)
      expect(report.categorySummaries).toHaveLength(0)
    })
  })

  describe('calculateBudgetStatus', () => {
    it('should return empty array for no budgets', () => {
      const transactions = [createMockTransaction()]
      const status = calculateBudgetStatus(transactions, [])

      expect(status).toHaveLength(0)
    })

    it('should calculate spending against budget', () => {
      const transactions = [
        createMockTransaction({
          sector: 'Restaurants',
          debit: 100,
          purchaseDate: new Date(),
        }),
        createMockTransaction({
          sector: 'Restaurants',
          debit: 50,
          purchaseDate: new Date(),
        }),
      ]
      const budgets = [createMockBudget({ category: 'Restaurants & Dining', amount: 500 })]

      const status = calculateBudgetStatus(transactions, budgets)

      expect(status).toHaveLength(1)
      expect(status[0].spent).toBe(150)
      expect(status[0].remaining).toBe(350)
      expect(status[0].percentUsed).toBe(30)
    })

    it('should set status to healthy for < 50%', () => {
      const transactions = [
        createMockTransaction({
          sector: 'Restaurants',
          debit: 100,
          purchaseDate: new Date(),
        }),
      ]
      const budgets = [createMockBudget({ category: 'Restaurants & Dining', amount: 500 })]

      const status = calculateBudgetStatus(transactions, budgets)

      expect(status[0].status).toBe('healthy')
    })

    it('should set status to early for 50-74%', () => {
      const transactions = [
        createMockTransaction({
          sector: 'Restaurants',
          debit: 300,
          purchaseDate: new Date(),
        }),
      ]
      const budgets = [createMockBudget({ category: 'Restaurants & Dining', amount: 500 })]

      const status = calculateBudgetStatus(transactions, budgets)

      expect(status[0].status).toBe('early')
    })

    it('should set status to warning for 75-99%', () => {
      const transactions = [
        createMockTransaction({
          sector: 'Restaurants',
          debit: 400,
          purchaseDate: new Date(),
        }),
      ]
      const budgets = [createMockBudget({ category: 'Restaurants & Dining', amount: 500 })]

      const status = calculateBudgetStatus(transactions, budgets)

      expect(status[0].status).toBe('warning')
    })

    it('should set status to over for > 100%', () => {
      const transactions = [
        createMockTransaction({
          sector: 'Restaurants',
          debit: 600,
          purchaseDate: new Date(),
        }),
      ]
      const budgets = [createMockBudget({ category: 'Restaurants & Dining', amount: 500 })]

      const status = calculateBudgetStatus(transactions, budgets)

      expect(status[0].status).toBe('over')
      expect(status[0].remaining).toBe(-100)
    })

    it('should sort by percentUsed descending', () => {
      const transactions = [
        createMockTransaction({
          sector: 'Restaurants',
          debit: 100,
          purchaseDate: new Date(),
        }),
        createMockTransaction({
          sector: 'Grocery stores',
          debit: 400,
          purchaseDate: new Date(),
        }),
      ]
      const budgets = [
        createMockBudget({ category: 'Restaurants & Dining', amount: 500 }),
        createMockBudget({ id: 2, category: 'Groceries', amount: 500 }),
      ]

      const status = calculateBudgetStatus(transactions, budgets)

      expect(status[0].budget.category).toBe('Groceries')
      expect(status[1].budget.category).toBe('Restaurants & Dining')
    })
  })
})
