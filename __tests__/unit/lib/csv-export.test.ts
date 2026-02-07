import { describe, it, expect } from 'vitest'
import { transactionsToCsvString } from '@/lib/csv-export'
import { createMockTransaction } from '../../fixtures/transactions'

describe('transactionsToCsvString', () => {
  it('returns correct CSV headers', () => {
    const csv = transactionsToCsvString([])
    const headers = csv.split('\r\n')[0]
    expect(headers).toBe(
      'Date,Booked Date,Description,Account Holder,Sector,Category,Amount,Debit,Credit,Currency,Original Currency,Exchange Rate,Account Number,Card Number'
    )
  })

  it('formats dates as yyyy-MM-dd', () => {
    const tx = createMockTransaction({
      purchaseDate: new Date('2024-03-15'),
      bookedDate: new Date('2024-03-16'),
    })
    const csv = transactionsToCsvString([tx])
    const lines = csv.split('\r\n')
    expect(lines[1]).toContain('2024-03-15')
    expect(lines[1]).toContain('2024-03-16')
  })

  it('includes correct row data', () => {
    const tx = createMockTransaction({
      bookingText: 'Test Restaurant',
      accountHolder: 'Test User',
      sector: 'Restaurants',
      amount: 50.0,
      debit: 50.0,
      credit: null,
      currency: 'CHF',
      originalCurrency: 'CHF',
      rate: null,
      accountNumber: '123456789',
      cardNumber: '****1234',
    })
    const csv = transactionsToCsvString([tx])
    const lines = csv.split('\r\n')
    expect(lines[1]).toContain('Test Restaurant')
    expect(lines[1]).toContain('Test User')
    expect(lines[1]).toContain('Restaurants')
    expect(lines[1]).toContain('50.00')
    expect(lines[1]).toContain('CHF')
    expect(lines[1]).toContain('123456789')
  })

  it('applies category overrides', () => {
    const tx = createMockTransaction({
      sector: 'Restaurants',
      bookingText: 'Test Restaurant',
    })
    const overrides = new Map([[0, 'Shopping']])
    const csv = transactionsToCsvString([tx], overrides)
    const lines = csv.split('\r\n')
    expect(lines[1]).toContain('Shopping')
  })

  it('uses auto-categorization when no override', () => {
    const tx = createMockTransaction({
      sector: 'Restaurants',
      bookingText: 'Test Restaurant',
    })
    const csv = transactionsToCsvString([tx])
    const lines = csv.split('\r\n')
    expect(lines[1]).toContain('Restaurants & Dining')
  })

  it('handles empty transactions array', () => {
    const csv = transactionsToCsvString([])
    const lines = csv.split('\r\n')
    expect(lines[0]).toContain('Date')
    expect(lines.filter((l: string) => l.length > 0)).toHaveLength(1) // headers only
  })

  it('handles null exchange rate', () => {
    const tx = createMockTransaction({ rate: null })
    const csv = transactionsToCsvString([tx])
    expect(csv).not.toContain('null')
  })

  it('handles non-null exchange rate', () => {
    const tx = createMockTransaction({ rate: 1.08 })
    const csv = transactionsToCsvString([tx])
    expect(csv).toContain('1.08')
  })

  it('handles null credit/debit', () => {
    const tx = createMockTransaction({ debit: null, credit: 100.5 })
    const csv = transactionsToCsvString([tx])
    const lines = csv.split('\r\n')
    expect(lines[1]).toContain('100.50')
  })

  it('handles invalid dates gracefully', () => {
    const tx = createMockTransaction({
      purchaseDate: new Date('invalid'),
      bookedDate: new Date('invalid'),
    })
    const csv = transactionsToCsvString([tx])
    // Should not throw
    expect(csv).toBeTruthy()
  })

  it('generates multiple rows for multiple transactions', () => {
    const txns = [
      createMockTransaction({ bookingText: 'First' }),
      createMockTransaction({ bookingText: 'Second' }),
      createMockTransaction({ bookingText: 'Third' }),
    ]
    const csv = transactionsToCsvString(txns)
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(4) // 1 header + 3 data rows
  })
})
