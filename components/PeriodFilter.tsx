'use client'

import { useState, useMemo, useEffect } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'
import {
  format,
  subDays,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from 'date-fns'
import type { Transaction } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

export type PeriodPreset =
  | 'all'
  | 'last30'
  | 'last90'
  | 'thisMonth'
  | 'lastMonth'
  | 'last3Months'
  | 'last6Months'
  | 'thisYear'
  | 'lastYear'
  | 'custom'

interface PeriodFilterProps {
  transactions: Transaction[]
  onFilteredTransactions: (
    filtered: Transaction[],
    period: PeriodPreset,
    dateRange: { start: Date; end: Date } | null
  ) => void
}

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last3Months', label: 'Last 3 Months' },
  { value: 'last6Months', label: 'Last 6 Months' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'lastYear', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
]

export function PeriodFilter({ transactions, onFilteredTransactions }: PeriodFilterProps) {
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>('all')
  const [customStart, setCustomStart] = useState<string>('')
  const [customEnd, setCustomEnd] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)

  const dateRange = useMemo(() => {
    const now = new Date()

    switch (selectedPreset) {
      case 'all':
        return null
      case 'last30':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) }
      case 'last90':
        return { start: startOfDay(subDays(now, 90)), end: endOfDay(now) }
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) }
      case 'lastMonth': {
        const lastMonth = subMonths(now, 1)
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
      }
      case 'last3Months':
        return { start: startOfDay(subMonths(now, 3)), end: endOfDay(now) }
      case 'last6Months':
        return { start: startOfDay(subMonths(now, 6)), end: endOfDay(now) }
      case 'thisYear':
        return { start: startOfYear(now), end: endOfYear(now) }
      case 'lastYear': {
        const lastYear = new Date(now.getFullYear() - 1, 0, 1)
        return { start: startOfYear(lastYear), end: endOfYear(lastYear) }
      }
      case 'custom':
        if (customStart && customEnd) {
          return {
            start: startOfDay(new Date(customStart)),
            end: endOfDay(new Date(customEnd)),
          }
        }
        return null
      default:
        return null
    }
  }, [selectedPreset, customStart, customEnd])

  const filteredTransactions = useMemo(() => {
    if (!dateRange) return transactions

    return transactions.filter((t) => {
      if (!t.purchaseDate) return false
      const date = new Date(t.purchaseDate)
      return !isNaN(date.getTime()) && isWithinInterval(date, dateRange)
    })
  }, [transactions, dateRange])

  useEffect(() => {
    onFilteredTransactions(filteredTransactions, selectedPreset, dateRange)
  }, [filteredTransactions, selectedPreset, dateRange, onFilteredTransactions])

  const transactionDateRange = useMemo(() => {
    const dates = transactions
      .map((t) => new Date(t.purchaseDate))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())

    if (!dates.length) return null
    return { start: dates[0], end: dates[dates.length - 1] }
  }, [transactions])

  function handlePresetSelect(preset: PeriodPreset): void {
    setSelectedPreset(preset)
    if (preset !== 'custom') {
      setIsOpen(false)
    }
  }

  function handleCustomApply(): void {
    if (customStart && customEnd) {
      setIsOpen(false)
    }
  }

  function clearFilter(): void {
    setSelectedPreset('all')
    setCustomStart('')
    setCustomEnd('')
  }

  function getDisplayLabel(): string {
    if (selectedPreset === 'custom' && customStart && customEnd) {
      return `${format(new Date(customStart), 'MMM d, yyyy')} - ${format(new Date(customEnd), 'MMM d, yyyy')}`
    }
    return PRESETS.find((p) => p.value === selectedPreset)?.label ?? 'Select Period'
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <Button
          variant={selectedPreset !== 'all' ? 'default' : 'outline'}
          onClick={() => setIsOpen(!isOpen)}
          className={
            selectedPreset !== 'all'
              ? 'border-2 border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200'
              : 'border-2'
          }
        >
          <Calendar className="mr-2 h-4 w-4" />
          <span>{getDisplayLabel()}</span>
          <ChevronDown
            className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </Button>

        {selectedPreset !== 'all' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFilter}
            className="h-8 w-8"
            title="Clear filter"
            aria-label="Clear filter"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {selectedPreset !== 'all' && (
          <span className="text-sm text-muted-foreground">
            {filteredTransactions.length} of {transactions.length} transactions
          </span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-2 min-w-[280px] rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-950">
            {/* Presets */}
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick Filters
              </p>
              <div className="grid grid-cols-2 gap-1">
                {PRESETS.filter((p) => p.value !== 'custom').map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetSelect(preset.value)}
                    className={`rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                      selectedPreset === preset.value
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Range */}
            <div className="border-t border-gray-100 p-3 dark:border-gray-800">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Custom Range
              </p>
              <div className="mb-2 flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="period-from" className="mb-1 block text-xs text-muted-foreground">
                    From
                  </Label>
                  <input
                    id="period-from"
                    type="date"
                    value={customStart}
                    onChange={(e) => {
                      setCustomStart(e.target.value)
                      setSelectedPreset('custom')
                    }}
                    max={customEnd || undefined}
                    min={
                      transactionDateRange
                        ? format(transactionDateRange.start, 'yyyy-MM-dd')
                        : undefined
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="period-to" className="mb-1 block text-xs text-muted-foreground">
                    To
                  </Label>
                  <input
                    id="period-to"
                    type="date"
                    value={customEnd}
                    onChange={(e) => {
                      setCustomEnd(e.target.value)
                      setSelectedPreset('custom')
                    }}
                    min={customStart || undefined}
                    max={
                      transactionDateRange
                        ? format(transactionDateRange.end, 'yyyy-MM-dd')
                        : undefined
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-950"
                  />
                </div>
              </div>
              {selectedPreset === 'custom' && customStart && customEnd && (
                <Button onClick={handleCustomApply} className="w-full" size="sm">
                  Apply
                </Button>
              )}
            </div>

            {/* Data range info */}
            {transactionDateRange && (
              <div className="rounded-b-xl border-t border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
                <p className="text-xs text-muted-foreground">
                  Data range: {format(transactionDateRange.start, 'MMM d, yyyy')} -{' '}
                  {format(transactionDateRange.end, 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
