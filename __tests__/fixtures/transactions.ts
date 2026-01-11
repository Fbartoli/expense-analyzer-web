import type { Transaction, Budget, ExpenseReport } from '@/lib/types'

export function createMockTransaction(
  overrides: Partial<Transaction> = {}
): Transaction {
  return {
    accountNumber: '123456789',
    cardNumber: '****1234',
    accountHolder: 'Test User',
    purchaseDate: new Date('2024-06-15'),
    bookingText: 'Test Restaurant',
    sector: 'Restaurants',
    amount: 50.0,
    originalCurrency: 'CHF',
    rate: null,
    currency: 'CHF',
    debit: 50.0,
    credit: null,
    bookedDate: new Date('2024-06-16'),
    ...overrides,
  }
}

export function createMockBudget(
  overrides: Partial<Budget> = {}
): Budget {
  return {
    id: 1,
    category: 'Restaurants & Dining',
    amount: 300,
    createdDate: new Date('2024-01-01'),
    ...overrides,
  }
}

export function createMockReport(
  overrides: Partial<ExpenseReport> = {}
): ExpenseReport {
  return {
    totalSpent: 200,
    totalIncome: 5000,
    netBalance: 4800,
    transactionCount: 3,
    dateRange: {
      start: new Date('2024-06-01'),
      end: new Date('2024-06-16'),
    },
    categorySummaries: [],
    monthlyAnalysis: [],
    topExpenses: [],
    largestCategory: null,
    ...overrides,
  }
}
