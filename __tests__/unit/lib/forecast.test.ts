import { describe, it, expect } from 'vitest'
import {
  weightedMovingAverage,
  calculateTrend,
  proRateCurrentMonth,
  forecastByCategory,
  generateForecast,
} from '@/lib/forecast'
import { createMockTransaction } from '../../fixtures/transactions'
import type { MonthlyAnalysis } from '@/lib/types'

function makeMonthlyAnalysis(monthKey: string, totalSpent: number): MonthlyAnalysis {
  // monthKey like '2024-06'
  const date = new Date(monthKey + '-01')
  const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return {
    month,
    monthKey,
    totalSpent,
    totalIncome: 5000,
    netFlow: 5000 - totalSpent,
    transactionCount: 10,
  }
}

describe('forecast', () => {
  describe('weightedMovingAverage', () => {
    it('should return 0 for empty values', () => {
      expect(weightedMovingAverage([])).toBe(0)
    })

    it('should compute WMA with 3 values (most recent first)', () => {
      // Weights [0.5, 0.3, 0.2], values = [300, 200, 100]
      // WMA = 300*0.5 + 200*0.3 + 100*0.2 = 150 + 60 + 20 = 230
      const result = weightedMovingAverage([300, 200, 100])
      expect(result).toBeCloseTo(230)
    })

    it('should compute WMA with 6 values using extended weights', () => {
      // Weights [0.30, 0.25, 0.20, 0.12, 0.08, 0.05]
      const values = [600, 500, 400, 300, 200, 100]
      // 600*0.30 + 500*0.25 + 400*0.20 + 300*0.12 + 200*0.08 + 100*0.05
      // = 180 + 125 + 80 + 36 + 16 + 5 = 442
      const result = weightedMovingAverage(values)
      expect(result).toBeCloseTo(442)
    })

    it('should normalize weights for fewer than 3 values', () => {
      // Only 2 values, weights [0.5, 0.3] normalized to [0.625, 0.375]
      const result = weightedMovingAverage([100, 80])
      // 100*0.625 + 80*0.375 = 62.5 + 30 = 92.5
      expect(result).toBeCloseTo(92.5)
    })

    it('should handle equal values', () => {
      const result = weightedMovingAverage([500, 500, 500])
      expect(result).toBeCloseTo(500)
    })

    it('should handle 4 values (uses WEIGHTS_3 truncated, normalized)', () => {
      // 4 values but only 3 weights available from WEIGHTS_3
      const result = weightedMovingAverage([400, 300, 200, 100])
      // weights [0.5, 0.3, 0.2] for first 3, 4th value ignored (no weight index)
      // normalized: sum = 1.0, so same
      // 400*0.5 + 300*0.3 + 200*0.2 + 100*0 = 200 + 90 + 40 = 330
      expect(result).toBeCloseTo(330)
    })
  })

  describe('calculateTrend', () => {
    it('should return 0 for fewer than 2 values', () => {
      expect(calculateTrend([])).toBe(0)
      expect(calculateTrend([100])).toBe(0)
    })

    it('should calculate positive trend (increasing spending)', () => {
      // Most recent first: [300, 200, 100]
      // Chronological: [100, 200, 300]
      // Deltas: [100, 100], average = 100
      expect(calculateTrend([300, 200, 100])).toBeCloseTo(100)
    })

    it('should calculate negative trend (decreasing spending)', () => {
      // Most recent first: [100, 200, 300]
      // Chronological: [300, 200, 100]
      // Deltas: [-100, -100], average = -100
      expect(calculateTrend([100, 200, 300])).toBeCloseTo(-100)
    })

    it('should calculate zero trend for stable spending', () => {
      expect(calculateTrend([500, 500, 500])).toBeCloseTo(0)
    })

    it('should average mixed deltas', () => {
      // Most recent first: [400, 300, 100, 200]
      // Chronological: [200, 100, 300, 400]
      // Deltas: [-100, 200, 100], average = 200/3 ≈ 66.67
      expect(calculateTrend([400, 300, 100, 200])).toBeCloseTo(200 / 3)
    })
  })

  describe('proRateCurrentMonth', () => {
    it('should pro-rate current month spending', () => {
      const today = new Date('2024-06-15')
      // 30 days in June, 15 elapsed
      // 500 * 30 / 15 = 1000
      const result = proRateCurrentMonth(500, '2024-06', today)
      expect(result).toBeCloseTo(1000)
    })

    it('should not pro-rate past months', () => {
      const today = new Date('2024-07-15')
      const result = proRateCurrentMonth(500, '2024-06', today)
      expect(result).toBe(500)
    })

    it('should handle first day of month', () => {
      const today = new Date('2024-06-01')
      // 30 days in June, 1 elapsed
      // 50 * 30 / 1 = 1500
      const result = proRateCurrentMonth(50, '2024-06', today)
      expect(result).toBeCloseTo(1500)
    })

    it('should handle last day of month', () => {
      const today = new Date('2024-06-30')
      // 30 days in June, 30 elapsed
      // 500 * 30 / 30 = 500
      const result = proRateCurrentMonth(500, '2024-06', today)
      expect(result).toBeCloseTo(500)
    })
  })

  describe('generateForecast', () => {
    it('should return hasEnoughData=false with < 3 months', () => {
      const monthly = [makeMonthlyAnalysis('2024-01', 1000), makeMonthlyAnalysis('2024-02', 1200)]
      const result = generateForecast([], monthly, 3, new Date('2024-03-15'))
      expect(result.dataQuality.hasEnoughData).toBe(false)
      expect(result.monthForecasts).toHaveLength(0)
      expect(result.categoryForecasts).toHaveLength(0)
      expect(result.historicalMonths).toHaveLength(2)
    })

    it('should generate 3 monthly forecasts by default', () => {
      const monthly = [
        makeMonthlyAnalysis('2024-01', 1000),
        makeMonthlyAnalysis('2024-02', 1100),
        makeMonthlyAnalysis('2024-03', 1200),
      ]
      const result = generateForecast([], monthly, 3, new Date('2024-04-15'))
      expect(result.dataQuality.hasEnoughData).toBe(true)
      expect(result.monthForecasts).toHaveLength(3)
      expect(result.monthForecasts[0].monthKey).toBe('2024-04')
      expect(result.monthForecasts[1].monthKey).toBe('2024-05')
      expect(result.monthForecasts[2].monthKey).toBe('2024-06')
    })

    it('should clamp projected values to >= 0', () => {
      // Decreasing steeply
      const monthly = [
        makeMonthlyAnalysis('2024-01', 3000),
        makeMonthlyAnalysis('2024-02', 2000),
        makeMonthlyAnalysis('2024-03', 1000),
      ]
      const result = generateForecast([], monthly, 5, new Date('2024-04-15'))
      for (const mf of result.monthForecasts) {
        expect(mf.totalSpent).toBeGreaterThanOrEqual(0)
      }
    })

    it('should detect partial current month', () => {
      const monthly = [
        makeMonthlyAnalysis('2024-01', 1000),
        makeMonthlyAnalysis('2024-02', 1000),
        makeMonthlyAnalysis('2024-03', 500), // partial
      ]
      const today = new Date('2024-03-15')
      const result = generateForecast([], monthly, 3, today)
      expect(result.dataQuality.isCurrentMonthPartial).toBe(true)
      // The forecast should pro-rate March: 500 * 31/15 ≈ 1033
      // So forecasts should be based on ~1000 per month, not 500
      expect(result.monthForecasts[0].totalSpent).toBeGreaterThan(500)
    })

    it('should forecast starting from next month after last data month', () => {
      const monthly = [
        makeMonthlyAnalysis('2024-06', 1000),
        makeMonthlyAnalysis('2024-07', 1000),
        makeMonthlyAnalysis('2024-08', 1000),
      ]
      const result = generateForecast([], monthly, 1, new Date('2024-09-15'))
      expect(result.monthForecasts[0].monthKey).toBe('2024-09')
    })

    it('should handle zero-spend months', () => {
      const monthly = [
        makeMonthlyAnalysis('2024-01', 1000),
        makeMonthlyAnalysis('2024-02', 0),
        makeMonthlyAnalysis('2024-03', 1000),
      ]
      const result = generateForecast([], monthly, 1, new Date('2024-04-15'))
      expect(result.dataQuality.hasEnoughData).toBe(true)
      expect(result.monthForecasts[0].totalSpent).toBeGreaterThanOrEqual(0)
    })

    it('should return historical months in chronological order', () => {
      const monthly = [
        makeMonthlyAnalysis('2024-03', 1200),
        makeMonthlyAnalysis('2024-01', 1000),
        makeMonthlyAnalysis('2024-02', 1100),
      ]
      const result = generateForecast([], monthly, 1, new Date('2024-04-15'))
      expect(result.historicalMonths[0].monthKey).toBe('2024-01')
      expect(result.historicalMonths[1].monthKey).toBe('2024-02')
      expect(result.historicalMonths[2].monthKey).toBe('2024-03')
    })

    it('should assign medium confidence for exactly 3 months', () => {
      const monthly = [
        makeMonthlyAnalysis('2024-01', 1000),
        makeMonthlyAnalysis('2024-02', 1000),
        makeMonthlyAnalysis('2024-03', 1000),
      ]
      const result = generateForecast([], monthly, 1, new Date('2024-04-15'))
      expect(result.monthForecasts[0].confidence).toBe('medium')
    })

    it('should assign high confidence for 6+ months with low variance', () => {
      const monthly = [
        makeMonthlyAnalysis('2024-01', 1000),
        makeMonthlyAnalysis('2024-02', 1020),
        makeMonthlyAnalysis('2024-03', 990),
        makeMonthlyAnalysis('2024-04', 1010),
        makeMonthlyAnalysis('2024-05', 1005),
        makeMonthlyAnalysis('2024-06', 995),
      ]
      const result = generateForecast([], monthly, 1, new Date('2024-07-15'))
      expect(result.monthForecasts[0].confidence).toBe('high')
    })

    it('should assign low confidence for high variance', () => {
      const monthly = [
        makeMonthlyAnalysis('2024-01', 100),
        makeMonthlyAnalysis('2024-02', 5000),
        makeMonthlyAnalysis('2024-03', 200),
      ]
      const result = generateForecast([], monthly, 1, new Date('2024-04-15'))
      expect(result.monthForecasts[0].confidence).toBe('low')
    })
  })

  describe('forecastByCategory', () => {
    it('should return empty array with < 3 months', () => {
      const monthly = [makeMonthlyAnalysis('2024-01', 1000), makeMonthlyAnalysis('2024-02', 1200)]
      const result = forecastByCategory([], monthly, new Date('2024-03-15'))
      expect(result).toHaveLength(0)
    })

    it('should forecast per category from transactions', () => {
      const txns = [
        // Month 1
        createMockTransaction({
          purchaseDate: new Date('2024-01-15'),
          sector: 'Restaurants',
          debit: 200,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-01-15'),
          sector: 'Grocery stores',
          debit: 300,
        }),
        // Month 2
        createMockTransaction({
          purchaseDate: new Date('2024-02-15'),
          sector: 'Restaurants',
          debit: 250,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-02-15'),
          sector: 'Grocery stores',
          debit: 350,
        }),
        // Month 3
        createMockTransaction({
          purchaseDate: new Date('2024-03-15'),
          sector: 'Restaurants',
          debit: 300,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-03-15'),
          sector: 'Grocery stores',
          debit: 400,
        }),
      ]
      const monthly = [
        makeMonthlyAnalysis('2024-01', 500),
        makeMonthlyAnalysis('2024-02', 600),
        makeMonthlyAnalysis('2024-03', 700),
      ]
      const result = forecastByCategory(txns, monthly, new Date('2024-04-15'))

      expect(result.length).toBeGreaterThan(0)
      const groceries = result.find((f) => f.category === 'Groceries')
      const dining = result.find((f) => f.category === 'Restaurants & Dining')
      expect(groceries).toBeDefined()
      expect(dining).toBeDefined()
      expect(groceries!.projectedSpent).toBeGreaterThan(0)
      expect(dining!.projectedSpent).toBeGreaterThan(0)

      // Groceries has higher amounts, so should be ranked first
      expect(result[0].category).toBe('Groceries')
    })

    it('should assign trend direction correctly', () => {
      const txns = [
        // Increasing restaurant spending
        createMockTransaction({
          purchaseDate: new Date('2024-01-15'),
          sector: 'Restaurants',
          debit: 100,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-02-15'),
          sector: 'Restaurants',
          debit: 200,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-03-15'),
          sector: 'Restaurants',
          debit: 300,
        }),
        // Decreasing grocery spending
        createMockTransaction({
          purchaseDate: new Date('2024-01-15'),
          sector: 'Grocery stores',
          debit: 500,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-02-15'),
          sector: 'Grocery stores',
          debit: 400,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-03-15'),
          sector: 'Grocery stores',
          debit: 300,
        }),
      ]
      const monthly = [
        makeMonthlyAnalysis('2024-01', 600),
        makeMonthlyAnalysis('2024-02', 600),
        makeMonthlyAnalysis('2024-03', 600),
      ]
      const result = forecastByCategory(txns, monthly, new Date('2024-04-15'))

      const dining = result.find((f) => f.category === 'Restaurants & Dining')
      const groceries = result.find((f) => f.category === 'Groceries')
      expect(dining!.trend).toBe('up')
      expect(groceries!.trend).toBe('down')
    })

    it('should compute percentOfTotal adding up to 100', () => {
      const txns = [
        createMockTransaction({
          purchaseDate: new Date('2024-01-15'),
          sector: 'Restaurants',
          debit: 100,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-02-15'),
          sector: 'Restaurants',
          debit: 100,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-03-15'),
          sector: 'Restaurants',
          debit: 100,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-01-15'),
          sector: 'Grocery stores',
          debit: 100,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-02-15'),
          sector: 'Grocery stores',
          debit: 100,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-03-15'),
          sector: 'Grocery stores',
          debit: 100,
        }),
      ]
      const monthly = [
        makeMonthlyAnalysis('2024-01', 200),
        makeMonthlyAnalysis('2024-02', 200),
        makeMonthlyAnalysis('2024-03', 200),
      ]
      const result = forecastByCategory(txns, monthly, new Date('2024-04-15'))
      const totalPercent = result.reduce((sum, f) => sum + f.percentOfTotal, 0)
      expect(totalPercent).toBeCloseTo(100)
    })
  })
})
