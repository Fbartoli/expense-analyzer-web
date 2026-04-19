import { format } from 'date-fns'

const CHF_FORMATTER = new Intl.NumberFormat('en-CH', {
  style: 'currency',
  currency: 'CHF',
})

export function formatCHF(amount: number): string {
  return CHF_FORMATTER.format(amount)
}

export function formatLocalDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return 'Unknown'
  }
  return format(date, 'd MMM yyyy')
}

export function toLocalDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}
