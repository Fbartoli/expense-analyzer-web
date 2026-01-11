import Papa from 'papaparse'
import type { Transaction } from './types'

interface CSVRow {
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

function parseDate(dateStr: string): Date {
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

export function parseCSV(file: File): Promise<Transaction[]> {
  return new Promise((resolve, reject) => {
    // First read the file to detect delimiter
    const reader = new FileReader()

    reader.onload = (e) => {
      const content = e.target?.result as string
      const delimiter = detectDelimiter(content)
      const cleanedContent = removeSepHeader(content)

      Papa.parse<CSVRow>(cleanedContent, {
        header: true,
        delimiter: delimiter,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const transactions: Transaction[] = results.data
              .filter((row) => {
                // Skip empty rows
                if (!row['Account number'] && !row['Purchase date'] && !row['Booking text']) {
                  return false
                }

                // Skip total/summary rows - check multiple columns
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

                // Skip rows that look like summary headers
                if (!row['Purchase date'] && !row['Booking text'] && !row['Amount']) {
                  return false
                }

                return true
              })
              .map((row) => {
                const amount = parseNumber(row['Amount']) || 0
                let debit = parseNumber(row['Debit'])
                let credit = parseNumber(row['Credit'])

                // If Debit/Credit are empty but Amount exists, determine from context
                // Credits are typically transfers IN, debits are expenses OUT
                if (debit === null && credit === null && amount > 0) {
                  const bookingText = (row['Booking text'] || '').toUpperCase()
                  // Check if it's a credit (incoming transfer)
                  if (
                    bookingText.includes('TRANSFER FROM') ||
                    bookingText.includes('INCOMING') ||
                    bookingText.includes('DEPOSIT') ||
                    bookingText.includes('SALARY') ||
                    bookingText.includes('REFUND')
                  ) {
                    credit = amount
                  } else {
                    // Default to debit (expense)
                    debit = amount
                  }
                }

                return {
                  accountNumber: row['Account number'] || '',
                  cardNumber: row['Card number'] || '',
                  accountHolder: row['Account/Cardholder'] || '',
                  purchaseDate: parseDate(row['Purchase date']),
                  bookingText: row['Booking text'] || '',
                  sector: row['Sector'] || 'Other',
                  amount,
                  originalCurrency: row['Original currency'] || '',
                  rate: parseNumber(row['Rate']),
                  currency: row['Currency'] || 'CHF',
                  debit,
                  credit,
                  bookedDate: parseDate(row['Booked']),
                }
              })

            resolve(transactions)
          } catch (error) {
            reject(new Error('Failed to parse CSV: ' + (error as Error).message))
          }
        },
        error: (error: Error) => {
          reject(new Error('CSV parsing error: ' + error.message))
        },
      })
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsText(file)
  })
}
