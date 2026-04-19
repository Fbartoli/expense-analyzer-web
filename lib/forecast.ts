import { format, getDaysInMonth, getDate, parse } from 'date-fns'
import { categorizeTransaction } from './analyzer'
import type { Transaction, MonthlyAnalysis } from './types'

export interface MonthForecast {
  monthKey: string
  monthLabel: string
  totalSpent: number
  confidence: 'high' | 'medium' | 'low'
}

export interface CategoryForecast {
  category: string
  projectedSpent: number
  trend: 'up' | 'down' | 'stable'
  percentOfTotal: number
}

export interface ForecastResult {
  monthForecasts: MonthForecast[]
  categoryForecasts: CategoryForecast[]
  historicalMonths: { monthKey: string; monthLabel: string; totalSpent: number }[]
  dataQuality: {
    totalMonths: number
    isCurrentMonthPartial: boolean
    hasEnoughData: boolean
  }
}

const WEIGHTS_3 = [0.5, 0.3, 0.2]
const WEIGHTS_6 = [0.3, 0.25, 0.2, 0.12, 0.08, 0.05]

export function weightedMovingAverage(values: number[]): number {
  if (values.length === 0) return 0

  const weights =
    values.length >= 6
      ? WEIGHTS_6.slice(0, values.length)
      : values.length >= 3
        ? WEIGHTS_3.slice(0, values.length)
        : WEIGHTS_3.slice(0, values.length)

  // Normalize weights to sum to 1
  const weightSum = weights.reduce((a, b) => a + b, 0)
  const normalized = weights.map((w) => w / weightSum)

  // values are ordered most-recent-first
  let result = 0
  for (let i = 0; i < values.length; i++) {
    result += values[i] * (normalized[i] ?? 0)
  }
  return result
}

export function calculateTrend(values: number[]): number {
  if (values.length < 2) return 0

  // values are most-recent-first, reverse to chronological for deltas
  const chronological = [...values].reverse()
  const deltas: number[] = []
  for (let i = 1; i < chronological.length; i++) {
    deltas.push(chronological[i] - chronological[i - 1])
  }

  return deltas.reduce((a, b) => a + b, 0) / deltas.length
}

export function proRateCurrentMonth(
  totalSpent: number,
  monthKey: string,
  today: Date = new Date()
): number {
  const monthDate = parse(monthKey, 'yyyy-MM', new Date())
  const daysInMonth = getDaysInMonth(monthDate)

  // Check if the monthKey matches today's month
  const todayKey = format(today, 'yyyy-MM')
  if (monthKey !== todayKey) return totalSpent

  const daysElapsed = getDate(today)
  if (daysElapsed === 0) return totalSpent

  return (totalSpent * daysInMonth) / daysElapsed
}

function getNextMonthKey(monthKey: string, offset: number): string {
  const date = parse(monthKey, 'yyyy-MM', new Date())
  const nextDate = new Date(date.getFullYear(), date.getMonth() + offset, 1)
  return format(nextDate, 'yyyy-MM')
}

function getMonthLabel(monthKey: string): string {
  const date = parse(monthKey, 'yyyy-MM', new Date())
  return format(date, 'MMM yyyy')
}

function calculateConfidence(monthCount: number, values: number[]): 'high' | 'medium' | 'low' {
  if (monthCount < 3) return 'low'

  // Calculate coefficient of variation
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  if (mean === 0) return 'low'

  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  const cv = Math.sqrt(variance) / mean

  // High variance => low confidence
  if (cv > 0.5) return 'low'

  if (monthCount >= 6 && cv <= 0.3) return 'high'
  if (monthCount >= 3) return 'medium'

  return 'low'
}

export function forecastByCategory(
  transactions: Transaction[],
  monthlyAnalysis: MonthlyAnalysis[],
  today: Date = new Date()
): CategoryForecast[] {
  if (monthlyAnalysis.length < 3) return []

  // Group transactions by month+category (debit only)
  const monthCategoryMap = new Map<string, Map<string, number>>()

  for (const tx of transactions) {
    if (!tx.purchaseDate || isNaN(tx.purchaseDate.getTime())) continue
    if ((tx.debit || 0) <= 0) continue

    const monthKey = format(tx.purchaseDate, 'yyyy-MM')
    const category = tx.category || categorizeTransaction(tx)

    if (!monthCategoryMap.has(monthKey)) {
      monthCategoryMap.set(monthKey, new Map())
    }
    const catMap = monthCategoryMap.get(monthKey)!
    catMap.set(category, (catMap.get(category) || 0) + (tx.debit || 0))
  }

  // Get sorted month keys
  const sortedMonths = Array.from(monthCategoryMap.keys()).sort()

  // Pro-rate current month if partial
  const todayKey = format(today, 'yyyy-MM')
  const lastMonth = sortedMonths[sortedMonths.length - 1]
  const isCurrentMonthPartial = lastMonth === todayKey

  if (isCurrentMonthPartial && monthCategoryMap.has(todayKey)) {
    const catMap = monthCategoryMap.get(todayKey)!
    for (const [cat, amount] of catMap) {
      catMap.set(cat, proRateCurrentMonth(amount, todayKey, today))
    }
  }

  // Collect all categories
  const allCategories = new Set<string>()
  for (const catMap of monthCategoryMap.values()) {
    for (const cat of catMap.keys()) {
      allCategories.add(cat)
    }
  }

  // Forecast per category
  const forecasts: CategoryForecast[] = []
  let totalProjected = 0

  for (const category of allCategories) {
    // Most recent first
    const values = sortedMonths.map((mk) => monthCategoryMap.get(mk)?.get(category) || 0).reverse()

    const wma = weightedMovingAverage(values)
    const trendSlope = calculateTrend(values)
    const projected = Math.max(0, wma + trendSlope)

    // Determine trend direction
    const trendThreshold = wma * 0.05
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (trendSlope > trendThreshold) trend = 'up'
    else if (trendSlope < -trendThreshold) trend = 'down'

    forecasts.push({
      category,
      projectedSpent: projected,
      trend,
      percentOfTotal: 0, // filled in below
    })
    totalProjected += projected
  }

  // Fill in percentOfTotal
  if (totalProjected > 0) {
    for (const f of forecasts) {
      f.percentOfTotal = (f.projectedSpent / totalProjected) * 100
    }
  }

  // Sort by projected amount desc
  forecasts.sort((a, b) => b.projectedSpent - a.projectedSpent)

  return forecasts
}

export function generateForecast(
  transactions: Transaction[],
  monthlyAnalysis: MonthlyAnalysis[],
  forecastMonths: number = 3,
  today: Date = new Date()
): ForecastResult {
  // Sort monthly analysis chronologically
  const sorted = [...monthlyAnalysis].sort((a, b) => a.monthKey.localeCompare(b.monthKey))

  const todayKey = format(today, 'yyyy-MM')
  const lastMonth = sorted.length > 0 ? sorted[sorted.length - 1].monthKey : ''
  const isCurrentMonthPartial = lastMonth === todayKey

  // Build spending values (most-recent-first), pro-rating if needed
  const spendingValues: number[] = []
  const historicalMonths: ForecastResult['historicalMonths'] = []

  for (let i = sorted.length - 1; i >= 0; i--) {
    const m = sorted[i]
    let spent = m.totalSpent
    if (i === sorted.length - 1 && isCurrentMonthPartial) {
      spent = proRateCurrentMonth(spent, m.monthKey, today)
    }
    spendingValues.push(spent)
    historicalMonths.unshift({
      monthKey: m.monthKey,
      monthLabel: m.month,
      totalSpent: m.totalSpent,
    })
  }

  const hasEnoughData = spendingValues.length >= 3

  if (!hasEnoughData) {
    return {
      monthForecasts: [],
      categoryForecasts: [],
      historicalMonths,
      dataQuality: {
        totalMonths: spendingValues.length,
        isCurrentMonthPartial,
        hasEnoughData: false,
      },
    }
  }

  const wmaBase = weightedMovingAverage(spendingValues)
  const trendSlope = calculateTrend(spendingValues)
  const confidence = calculateConfidence(spendingValues.length, spendingValues)

  // Last month key from sorted data
  const lastMonthKey = sorted[sorted.length - 1].monthKey

  const monthForecasts: MonthForecast[] = []
  for (let k = 1; k <= forecastMonths; k++) {
    const mk = getNextMonthKey(lastMonthKey, k)
    const projected = Math.max(0, wmaBase + k * trendSlope)
    monthForecasts.push({
      monthKey: mk,
      monthLabel: getMonthLabel(mk),
      totalSpent: projected,
      confidence,
    })
  }

  const categoryForecasts = forecastByCategory(transactions, monthlyAnalysis, today)

  return {
    monthForecasts,
    categoryForecasts,
    historicalMonths,
    dataQuality: {
      totalMonths: spendingValues.length,
      isCurrentMonthPartial,
      hasEnoughData: true,
    },
  }
}
