import Papa from 'papaparse'
import type { Transaction } from './types'

interface CreditCardRow {
  'Account number': string
  'Card number': string
  'Account/Cardholder': string
  'Purchase date': string
  'Booking text': string
  Sector: string
  Amount: string
  'Original currency': string
  Rate: string
  Currency: string
  Debit: string
  Credit: string
  Booked: string
}

interface BankStatementRow {
  'Trade date': string
  'Trade time': string
  'Booking date': string
  'Value date': string
  Currency: string
  Debit: string
  Credit: string
  'Individual amount': string
  Balance: string
  'Transaction no.': string
  Description1: string
  Description2: string
  Description3: string
  Footnotes: string
}

type CSVFormat = 'credit-card' | 'bank-statement'

function parseDateDotFormat(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === '') {
    console.warn('Empty date string, using current date as fallback')
    return new Date()
  }

  const parts = dateStr.trim().split('.')
  if (parts.length !== 3) {
    console.warn('Invalid date format:', dateStr)
    return new Date()
  }

  const day = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    console.warn('Invalid date components:', dateStr)
    return new Date()
  }

  const date = new Date(year, month - 1, day)

  if (isNaN(date.getTime())) {
    console.warn('Invalid date created:', dateStr)
    return new Date()
  }

  return date
}

function parseDateISOFormat(dateStr: string): Date {
  if (!dateStr || dateStr.trim() === '') {
    console.warn('Empty date string, using current date as fallback')
    return new Date()
  }

  const parts = dateStr.trim().split('-')
  if (parts.length !== 3) {
    console.warn('Invalid date format:', dateStr)
    return new Date()
  }

  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10)
  const day = parseInt(parts[2], 10)

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    console.warn('Invalid date components:', dateStr)
    return new Date()
  }

  const date = new Date(year, month - 1, day)

  if (isNaN(date.getTime())) {
    console.warn('Invalid date created:', dateStr)
    return new Date()
  }

  return date
}

function parseNumber(numStr: string): number | null {
  if (!numStr || numStr.trim() === '') return null
  const normalized = numStr.replace(/'/g, '').replace(',', '.')
  const parsed = parseFloat(normalized)
  return isNaN(parsed) ? null : parsed
}

/**
 * Detect delimiter from file content.
 * Checks for "sep=X" header or falls back to auto-detection.
 */
function detectDelimiter(content: string): string {
  // Check for explicit separator declaration (e.g., "sep=;")
  const sepMatch = content.match(/^sep=(.)\r?\n/i)
  if (sepMatch) {
    return sepMatch[1]
  }

  // Auto-detect: count occurrences of common delimiters in first few lines
  const firstLines = content.split('\n').slice(0, 5).join('\n')
  const semicolonCount = (firstLines.match(/;/g) || []).length
  const commaCount = (firstLines.match(/,/g) || []).length

  return semicolonCount > commaCount ? ';' : ','
}

/**
 * Remove the "sep=X" line if present
 */
function removeSepHeader(content: string): string {
  return content.replace(/^sep=.\r?\n/i, '')
}

/**
 * Remove BOM character if present
 */
function removeBOM(content: string): string {
  return content.replace(/^\uFEFF/, '')
}

/**
 * Detect whether the CSV is a bank statement or credit card format.
 * Bank statements have metadata header rows before the actual data.
 */
function detectFormat(content: string): CSVFormat {
  const lines = content.split('\n').slice(0, 15)
  for (const line of lines) {
    if (line.includes('Trade date') && line.includes('Description1')) {
      return 'bank-statement'
    }
  }
  return 'credit-card'
}

/**
 * Extract the data portion of a bank statement CSV, skipping metadata header rows.
 * Returns the content starting from the actual column header row.
 */
function extractBankStatementData(content: string): string {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Trade date') && lines[i].includes('Description1')) {
      return lines.slice(i).join('\n')
    }
  }
  return content
}

function parseCreditCardRows(data: CreditCardRow[]): Transaction[] {
  return data
    .filter((row) => {
      if (!row['Account number'] && !row['Purchase date'] && !row['Booking text']) {
        return false
      }

      const bookingText = (row['Booking text'] || '').toLowerCase()
      const accountNumber = (row['Account number'] || '').toLowerCase()

      if (
        bookingText.includes('total') ||
        bookingText.includes('sum') ||
        bookingText.includes('subtotal') ||
        bookingText.includes('grand total') ||
        accountNumber.includes('total')
      ) {
        return false
      }

      if (!row['Purchase date'] && !row['Booking text'] && !row['Amount']) {
        return false
      }

      return true
    })
    .map((row) => {
      const amount = parseNumber(row['Amount']) || 0
      let debit = parseNumber(row['Debit'])
      let credit = parseNumber(row['Credit'])

      if (debit === null && credit === null && amount > 0) {
        const bookingText = (row['Booking text'] || '').toUpperCase()
        if (
          bookingText.includes('TRANSFER FROM') ||
          bookingText.includes('INCOMING') ||
          bookingText.includes('DEPOSIT') ||
          bookingText.includes('SALARY') ||
          bookingText.includes('REFUND')
        ) {
          credit = amount
        } else {
          debit = amount
        }
      }

      return {
        accountNumber: row['Account number'] || '',
        cardNumber: row['Card number'] || '',
        accountHolder: row['Account/Cardholder'] || '',
        purchaseDate: parseDateDotFormat(row['Purchase date']),
        bookingText: row['Booking text'] || '',
        sector: row['Sector'] || 'Other',
        amount,
        originalCurrency: row['Original currency'] || '',
        rate: parseNumber(row['Rate']),
        currency: row['Currency'] || 'CHF',
        debit,
        credit,
        bookedDate: parseDateDotFormat(row['Booked']),
      }
    })
}

function extractCardNumber(description2: string): string {
  const match = description2.match(/^(\d{8})-\d/)
  return match ? match[1] : ''
}

function parseBankStatementRows(data: BankStatementRow[]): Transaction[] {
  return data
    .filter((row) => {
      // Must have a trade date to be a valid transaction
      if (!row['Trade date']) return false
      // Skip rows that are completely empty
      if (!row['Debit'] && !row['Credit'] && !row['Description1']) return false
      return true
    })
    .map((row) => {
      const rawDebit = parseNumber(row['Debit'])
      const rawCredit = parseNumber(row['Credit'])

      // Bank statement debits are negative values; convert to positive for consistency
      const debit = rawDebit !== null ? Math.abs(rawDebit) : null
      const credit = rawCredit !== null ? Math.abs(rawCredit) : null

      // Extract card number from Description2 BEFORE stripping semicolons
      const cardNumber = extractCardNumber(row['Description2'] || '')

      // Combine description fields for bookingText, stripping inner semicolons from quoted fields
      const desc1 = (row['Description1'] || '').replace(/;/g, ', ')
      const desc2 = (row['Description2'] || '').replace(/;/g, ', ')
      const bookingText = [desc1, desc2].filter(Boolean).join(' - ')

      const amount = debit || credit || 0

      return {
        accountNumber: row['Transaction no.'] || '',
        cardNumber,
        accountHolder: '',
        purchaseDate: parseDateISOFormat(row['Trade date']),
        bookingText,
        sector: 'Other',
        amount,
        originalCurrency: row['Currency'] || 'CHF',
        rate: null,
        currency: row['Currency'] || 'CHF',
        debit,
        credit,
        bookedDate: parseDateISOFormat(row['Booking date'] || row['Value date']),
      }
    })
}

export function parseCSV(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      let content = e.target?.result as string
      content = removeBOM(content)

      const format = detectFormat(content)
      const delimiter = detectDelimiter(content)

      let csvContent: string
      if (format === 'bank-statement') {
        csvContent = extractBankStatementData(content)
      } else {
        csvContent = removeSepHeader(content)
      }

      if (format === 'bank-statement') {
        Papa.parse<BankStatementRow>(csvContent, {
          header: true,
          delimiter,
          skipEmptyLines: true,
          quoteChar: '"',
          complete: (results) => {
            try {
              resolve(parseBankStatementRows(results.data))
            } catch (error) {
              reject(new Error('Failed to parse CSV: ' + (error as Error).message))
            }
          },
          error: (error: Error) => {
            reject(new Error('CSV parsing error: ' + error.message))
          },
        })
      } else {
        Papa.parse<CreditCardRow>(csvContent, {
          header: true,
          delimiter,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              resolve(parseCreditCardRows(results.data))
            } catch (error) {
              reject(new Error('Failed to parse CSV: ' + (error as Error).message))
            }
          },
          error: (error: Error) => {
            reject(new Error('CSV parsing error: ' + error.message))
          },
        })
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}
