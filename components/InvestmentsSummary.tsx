'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { TrendingUp, Wallet } from 'lucide-react'
import { format } from 'date-fns'
import type { Transaction } from '@/lib/types'

interface InvestmentsSummaryProps {
  transactions: Transaction[]
}

const PLATFORM_COLORS: Record<string, string> = {
  Coinbase: '#0052FF',
  Kraken: '#5741D9',
  Binance: '#F0B90B',
  Other: '#6B7280',
}

const CHART_COLORS = ['#0052FF', '#5741D9', '#F0B90B', '#10B981', '#EF4444', '#8B5CF6']

export function InvestmentsSummary({ transactions }: InvestmentsSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  // Filter investment transactions
  const investmentData = useMemo(() => {
    const investments = transactions.filter((t) => {
      if ((t.debit || 0) <= 0) return false
      const text = t.bookingText.toUpperCase()
      return (
        text.includes('COINBASE') ||
        text.includes('KRAKEN') ||
        text.includes('BINANCE') ||
        text.includes('CRYPTO') ||
        text.includes('BITCOIN') ||
        text.includes('ETHEREUM')
      )
    })

    // Total invested
    const totalInvested = investments.reduce((sum, t) => sum + (t.debit || 0), 0)

    // Breakdown by platform
    const platformMap = new Map<string, number>()
    investments.forEach((t) => {
      const text = t.bookingText.toUpperCase()
      let platform = 'Other'
      if (text.includes('COINBASE')) platform = 'Coinbase'
      else if (text.includes('KRAKEN')) platform = 'Kraken'
      else if (text.includes('BINANCE')) platform = 'Binance'

      platformMap.set(platform, (platformMap.get(platform) || 0) + (t.debit || 0))
    })

    const platformBreakdown = Array.from(platformMap.entries())
      .map(([platform, amount]) => ({ platform, amount }))
      .sort((a, b) => b.amount - a.amount)

    // Monthly investments
    const monthlyMap = new Map<string, number>()
    investments.forEach((t) => {
      if (!t.purchaseDate || isNaN(t.purchaseDate.getTime())) return
      const monthKey = format(t.purchaseDate, 'yyyy-MM')
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + (t.debit || 0))
    })

    const monthlyInvestments = Array.from(monthlyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([monthKey, amount]) => ({
        month: format(new Date(monthKey + '-01'), 'MMM yyyy'),
        amount,
      }))

    return {
      totalInvested,
      transactionCount: investments.length,
      platformBreakdown,
      monthlyInvestments,
    }
  }, [transactions])

  if (investmentData.totalInvested === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border-2 border-gray-50 bg-white p-8 shadow-xl">
      <div className="mb-8">
        <h2 className="mb-2 text-3xl font-bold text-gray-900">Investments</h2>
        <p className="text-gray-600">Your crypto and investment activity</p>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-lg">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <Wallet className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-wide text-amber-100">
              Total Invested
            </span>
          </div>
          <p className="text-4xl font-bold">{formatCurrency(investmentData.totalInvested)}</p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 p-6 text-white shadow-lg">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2">
              <TrendingUp className="h-6 w-6" />
            </div>
            <span className="text-sm font-semibold uppercase tracking-wide text-purple-100">
              Transactions
            </span>
          </div>
          <p className="text-4xl font-bold">{investmentData.transactionCount}</p>
        </div>
      </div>

      {/* Platform Breakdown */}
      {investmentData.platformBreakdown.length > 0 && (
        <div className="mb-8">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">By Platform</h3>
          <div className="space-y-3">
            {investmentData.platformBreakdown.map((item) => {
              const percentage = (item.amount / investmentData.totalInvested) * 100
              return (
                <div key={item.platform} className="flex items-center gap-4">
                  <div className="w-24 font-medium text-gray-700">{item.platform}</div>
                  <div className="h-8 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: PLATFORM_COLORS[item.platform] || '#6B7280',
                      }}
                    />
                  </div>
                  <div className="w-32 text-right">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Monthly Chart */}
      {investmentData.monthlyInvestments.length > 0 && (
        <div>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Monthly Investments</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={investmentData.monthlyInvestments}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  stroke="#9ca3af"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  stroke="#9ca3af"
                  tickLine={false}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Invested']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {investmentData.monthlyInvestments.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
