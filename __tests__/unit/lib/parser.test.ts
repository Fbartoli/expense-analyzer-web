import { describe, it, expect } from 'vitest'
import { parseCSV } from '@/lib/parser'
import { createMockCSVFile } from '@/test-utils/mock-file'
import {
  validCSVContent,
  csvWithTotals,
  csvWithCommaDelimiter,
  csvWithSwissNumbers,
  csvWithIncome,
  csvWithEmptyDate,
  csvWithInvalidDate,
} from '../../fixtures/csv-samples'

describe('parser', () => {
  describe('parseDate (tested through parseCSV)', () => {
    it('should parse DD.MM.YYYY format correctly', async () => {
      const file = createMockCSVFile(validCSVContent)
      const transactions = await parseCSV(file)

      expect(transactions[0].purchaseDate.getDate()).toBe(15)
      expect(transactions[0].purchaseDate.getMonth()).toBe(5) // June is 0-indexed
      expect(transactions[0].purchaseDate.getFullYear()).toBe(2024)
    })

    it('should handle empty date string with fallback', async () => {
      const file = createMockCSVFile(csvWithEmptyDate)
      const transactions = await parseCSV(file)

      expect(transactions).toHaveLength(1)
      expect(transactions[0].purchaseDate).toBeInstanceOf(Date)
    })

    it('should handle invalid date format gracefully', async () => {
      const file = createMockCSVFile(csvWithInvalidDate)
      const transactions = await parseCSV(file)

      expect(transactions).toHaveLength(1)
      expect(transactions[0].purchaseDate).toBeInstanceOf(Date)
    })
  })

  describe('parseNumber (tested through parseCSV)', () => {
    it('should parse Swiss number format with apostrophe thousands separator', async () => {
      const file = createMockCSVFile(csvWithSwissNumbers)
      const transactions = await parseCSV(file)

      expect(transactions).toHaveLength(1)
      expect(transactions[0].amount).toBe(1234.56)
      expect(transactions[0].debit).toBe(1234.56)
    })

    it('should handle standard decimal numbers', async () => {
      const file = createMockCSVFile(validCSVContent)
      const transactions = await parseCSV(file)

      expect(transactions[0].amount).toBe(50)
      expect(transactions[1].amount).toBe(75.5)
    })
  })

  describe('detectDelimiter (tested through parseCSV)', () => {
    it('should detect explicit sep= header', async () => {
      const file = createMockCSVFile(validCSVContent)
      const transactions = await parseCSV(file)

      expect(transactions).toHaveLength(3)
      expect(transactions[0].bookingText).toBe('Restaurant ABC')
    })

    it('should auto-detect comma delimiter', async () => {
      const file = createMockCSVFile(csvWithCommaDelimiter)
      const transactions = await parseCSV(file)

      expect(transactions).toHaveLength(1)
      expect(transactions[0].bookingText).toBe('Test Purchase')
    })
  })

  describe('parseCSV', () => {
    it('should parse valid CSV with multiple transactions', async () => {
      const file = createMockCSVFile(validCSVContent)
      const transactions = await parseCSV(file)

      expect(transactions).toHaveLength(3)
      expect(transactions[0].sector).toBe('Restaurants')
      expect(transactions[1].sector).toBe('Grocery stores')
      expect(transactions[2].sector).toBe('Gasoline service stations')
    })

    it('should skip total/summary rows', async () => {
      const file = createMockCSVFile(csvWithTotals)
      const transactions = await parseCSV(file)

      expect(transactions).toHaveLength(1)
      expect(transactions[0].bookingText).toBe('Purchase 1')
    })

    it('should handle credit transactions', async () => {
      const file = createMockCSVFile(csvWithIncome)
      const transactions = await parseCSV(file)

      expect(transactions).toHaveLength(2)

      // First transaction is salary (credit)
      expect(transactions[0].credit).toBe(5000)
      expect(transactions[0].debit).toBeNull()

      // Second transaction is expense (debit)
      expect(transactions[1].debit).toBe(50)
      expect(transactions[1].credit).toBeNull()
    })

    it('should infer debit for regular expenses when debit/credit empty', async () => {
      const csvContent = `sep=;
Account number;Card number;Account/Cardholder;Purchase date;Booking text;Sector;Amount;Original currency;Rate;Currency;Debit;Credit;Booked
123456;****1234;John Doe;15.06.2024;Coffee Shop;Restaurants;5.00;CHF;;CHF;;;16.06.2024`

      const file = createMockCSVFile(csvContent)
      const transactions = await parseCSV(file)

      expect(transactions).toHaveLength(1)
      expect(transactions[0].debit).toBe(5)
      expect(transactions[0].credit).toBeNull()
    })

    it('should infer credit for incoming transfers', async () => {
      const csvContent = `sep=;
Account number;Card number;Account/Cardholder;Purchase date;Booking text;Sector;Amount;Original currency;Rate;Currency;Debit;Credit;Booked
123456;****1234;John Doe;15.06.2024;TRANSFER FROM savings;Other;1000.00;CHF;;CHF;;;16.06.2024`

      const file = createMockCSVFile(csvContent)
      const transactions = await parseCSV(file)

      expect(transactions).toHaveLength(1)
      expect(transactions[0].credit).toBe(1000)
      expect(transactions[0].debit).toBeNull()
    })

    it('should skip empty rows', async () => {
      const csvWithEmpty = `sep=;
Account number;Card number;Account/Cardholder;Purchase date;Booking text;Sector;Amount;Original currency;Rate;Currency;Debit;Credit;Booked
123456;****1234;John Doe;15.06.2024;Purchase 1;Restaurants;50.00;CHF;;CHF;50.00;;16.06.2024
;;;;;;;;;;;
123456;****1234;John Doe;16.06.2024;Purchase 2;Groceries;30.00;CHF;;CHF;30.00;;17.06.2024`

      const file = createMockCSVFile(csvWithEmpty)
      const transactions = await parseCSV(file)

      expect(transactions).toHaveLength(2)
    })

    it('should populate all transaction fields correctly', async () => {
      const file = createMockCSVFile(validCSVContent)
      const transactions = await parseCSV(file)

      const tx = transactions[0]
      expect(tx.accountNumber).toBe('123456')
      expect(tx.cardNumber).toBe('****1234')
      expect(tx.accountHolder).toBe('John Doe')
      expect(tx.bookingText).toBe('Restaurant ABC')
      expect(tx.sector).toBe('Restaurants')
      expect(tx.originalCurrency).toBe('CHF')
      expect(tx.currency).toBe('CHF')
    })

    it('should handle missing optional fields', async () => {
      const csvContent = `sep=;
Account number;Card number;Account/Cardholder;Purchase date;Booking text;Sector;Amount;Original currency;Rate;Currency;Debit;Credit;Booked
123456;;John Doe;15.06.2024;Test;;50.00;;;CHF;50.00;;`

      const file = createMockCSVFile(csvContent)
      const transactions = await parseCSV(file)

      expect(transactions).toHaveLength(1)
      expect(transactions[0].cardNumber).toBe('')
      expect(transactions[0].sector).toBe('Other')
      expect(transactions[0].originalCurrency).toBe('')
    })
  })
})
