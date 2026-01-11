'use client'

import { useState, useMemo, useEffect } from 'react'
import { Calendar, ChevronDown, X } from 'lucide-react'
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import type { Transaction } from '@/lib/types'

export type PeriodPreset = 'all' | 'last30' | 'last90' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'last6Months' | 'thisYear' | 'lastYear' | 'custom'

interface PeriodFilterProps {
  transactions: Transaction[]
  onFilteredTransactions: (filtered: Transaction[], period: PeriodPreset, dateRange: { start: Date; end: Date } | null) => void
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

  // Calculate date range based on preset
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
      case 'lastMonth':
        const lastMonth = subMonths(now, 1)
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
      case 'last3Months':
        return { start: startOfDay(subMonths(now, 3)), end: endOfDay(now) }
      case 'last6Months':
        return { start: startOfDay(subMonths(now, 6)), end: endOfDay(now) }
      case 'thisYear':
        return { start: startOfYear(now), end: endOfYear(now) }
      case 'lastYear':
        const lastYear = new Date(now.getFullYear() - 1, 0, 1)
        return { start: startOfYear(lastYear), end: endOfYear(lastYear) }
      case 'custom':
        if (customStart && customEnd) {
          return {
            start: startOfDay(new Date(customStart)),
            end: endOfDay(new Date(customEnd))
          }
        }
        return null
      default:
        return null
    }
  }, [selectedPreset, customStart, customEnd])

  // Filter transactions based on date range
  const filteredTransactions = useMemo(() => {
    if (!dateRange) return transactions

    return transactions.filter(t => {
      if (!t.purchaseDate) return false
      const date = new Date(t.purchaseDate)
      return !isNaN(date.getTime()) && isWithinInterval(date, dateRange)
    })
  }, [transactions, dateRange])

  // Notify parent of filtered transactions
  useEffect(() => {
    onFilteredTransactions(filteredTransactions, selectedPreset, dateRange)
  }, [filteredTransactions, selectedPreset, dateRange, onFilteredTransactions])

  // Get data range from transactions
  const transactionDateRange = useMemo(() => {
    const dates = transactions
      .map(t => new Date(t.purchaseDate))
      .filter(d => !isNaN(d.getTime()))
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
    return PRESETS.find(p => p.value === selectedPreset)?.label ?? 'Select Period'
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all ${
            selectedPreset !== 'all'
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
              : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{getDisplayLabel()}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {selectedPreset !== 'all' && (
          <button
            onClick={clearFilter}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Clear filter"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Transaction count indicator */}
        {selectedPreset !== 'all' && (
          <span className="text-sm text-gray-500">
            {filteredTransactions.length} of {transactions.length} transactions
          </span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 min-w-[280px]">
            {/* Presets */}
            <div className="p-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">
                Quick Filters
              </p>
              <div className="grid grid-cols-2 gap-1">
                {PRESETS.filter(p => p.value !== 'custom').map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => handlePresetSelect(preset.value)}
                    className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedPreset === preset.value
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Range */}
            <div className="border-t border-gray-100 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Custom Range
              </p>
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">From</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => {
                      setCustomStart(e.target.value)
                      setSelectedPreset('custom')
                    }}
                    max={customEnd || undefined}
                    min={transactionDateRange ? format(transactionDateRange.start, 'yyyy-MM-dd') : undefined}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">To</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => {
                      setCustomEnd(e.target.value)
                      setSelectedPreset('custom')
                    }}
                    min={customStart || undefined}
                    max={transactionDateRange ? format(transactionDateRange.end, 'yyyy-MM-dd') : undefined}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              {selectedPreset === 'custom' && customStart && customEnd && (
                <button
                  onClick={handleCustomApply}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Apply
                </button>
              )}
            </div>

            {/* Data range info */}
            {transactionDateRange && (
              <div className="border-t border-gray-100 px-3 py-2 bg-gray-50 rounded-b-xl">
                <p className="text-xs text-gray-500">
                  Data range: {format(transactionDateRange.start, 'MMM d, yyyy')} - {format(transactionDateRange.end, 'MMM d, yyyy')}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
