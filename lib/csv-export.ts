import Papa from 'papaparse'
import { format } from 'date-fns'
import { categorizeTransaction } from './analyzer'
import type { Transaction } from './types'

interface CsvRow {
  Date: string
  'Booked Date': string
  Description: string
  'Account Holder': string
  Sector: string
  Category: string
  Amount: string
  Debit: string
  Credit: string
  Currency: string
  'Original Currency': string
  'Exchange Rate': string
  'Account Number': string
  'Card Number': string
}

function formatDate(date: Date | undefined | null): string {
  if (!date || isNaN(date.getTime())) return ''
  return format(date, 'yyyy-MM-dd')
}

function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return value.toFixed(2)
}

export function exportTransactionsCsv(
  transactions: Transaction[],
  categoryOverrides?: Map<number, string>
): void {
  const rows = buildCsvRows(transactions, categoryOverrides)
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function transactionsToCsvString(
  transactions: Transaction[],
  categoryOverrides?: Map<number, string>
): string {
  const rows = buildCsvRows(transactions, categoryOverrides)
  const fields = [
    'Date',
    'Booked Date',
    'Description',
    'Account Holder',
    'Sector',
    'Category',
    'Amount',
    'Debit',
    'Credit',
    'Currency',
    'Original Currency',
    'Exchange Rate',
    'Account Number',
    'Card Number',
  ]

  return Papa.unparse({ fields, data: rows })
}

function buildCsvRows(
  transactions: Transaction[],
  categoryOverrides?: Map<number, string>
): CsvRow[] {
  return transactions.map((t, idx) => {
    const category = categoryOverrides?.get(idx) ?? t.category ?? categorizeTransaction(t)

    return {
      Date: formatDate(t.purchaseDate),
      'Booked Date': formatDate(t.bookedDate),
      Description: t.bookingText,
      'Account Holder': t.accountHolder,
      Sector: t.sector,
      Category: category,
      Amount: formatAmount(t.amount),
      Debit: formatAmount(t.debit),
      Credit: formatAmount(t.credit),
      Currency: t.currency,
      'Original Currency': t.originalCurrency,
      'Exchange Rate': t.rate !== null ? String(t.rate) : '',
      'Account Number': t.accountNumber,
      'Card Number': t.cardNumber,
    }
  })
}
