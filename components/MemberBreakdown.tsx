'use client'

import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Users, ChevronRight } from 'lucide-react'
import { useChartTheme } from '@/lib/use-chart-theme'
import { calculateMemberSummaries, detectCards } from '@/lib/members'
import { MemberDetails } from './MemberDetails'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
  Transaction,
  HouseholdMember,
  MemberSummary,
  ManualRecurringTransaction,
} from '@/lib/types'

interface MemberBreakdownProps {
  transactions: Transaction[]
  members: HouseholdMember[]
  memberOverrides: Map<number, string>
  onMarkRecurring?: (entry: Omit<ManualRecurringTransaction, 'id'>) => void
  taggedFingerprints?: Set<string>
}

export function MemberBreakdown({
  transactions,
  members,
  memberOverrides,
  onMarkRecurring,
  taggedFingerprints,
}: MemberBreakdownProps) {
  const chartTheme = useChartTheme()
  const [selectedMember, setSelectedMember] = useState<MemberSummary | null>(null)

  const summaries = useMemo(
    () => calculateMemberSummaries(transactions, members, memberOverrides),
    [transactions, members, memberOverrides]
  )

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CH', {
      style: 'currency',
      currency: 'CHF',
    }).format(amount)
  }

  const chartData = summaries.map((s) => ({
    name: s.memberName,
    value: s.total,
    percentage: s.percentage,
  }))

  const chartAriaLabel = useMemo(() => {
    const parts = summaries
      .slice(0, 3)
      .map((s) => `${s.memberName} ${s.percentage.toFixed(0)}%`)
      .join(', ')
    return `Pie chart showing spending by household member. ${parts}`
  }, [summaries])

  const hasDetectedCards = useMemo(() => detectCards(transactions).length > 0, [transactions])

  if (members.length === 0) {
    return (
      <Card className="border-2 border-gray-50 shadow-xl dark:border-gray-800">
        <CardContent className="py-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          {hasDetectedCards ? (
            <>
              <p className="font-medium text-gray-600 dark:text-gray-400">
                Cards detected in your data
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Open Members to name your detected cards
              </p>
            </>
          ) : (
            <>
              <p className="font-medium text-gray-600 dark:text-gray-400">
                No debit card transactions detected
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Card numbers are extracted from bank statement transactions
              </p>
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {selectedMember && (
        <MemberDetails
          memberName={selectedMember.memberName}
          transactions={selectedMember.transactions}
          color={selectedMember.color}
          onClose={() => setSelectedMember(null)}
          onMarkRecurring={onMarkRecurring}
          taggedFingerprints={taggedFingerprints}
        />
      )}

      <Card className="border-2 border-gray-50 shadow-xl dark:border-gray-800">
        <CardHeader>
          <h2 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            Member Breakdown
          </h2>
          <p className="text-muted-foreground">
            Spending allocated per household member. Click a member to explore transactions.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div
                className="flex h-[400px] items-center justify-center"
                role="img"
                aria-label={chartAriaLabel}
              >
                <ResponsiveContainer width="100%" height="100%" aria-hidden="true">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ cx, cy, midAngle, outerRadius, percent, name }) => {
                        if (percent < 0.08) return null
                        const RADIAN = Math.PI / 180
                        const radius = outerRadius * 1.25
                        const x = cx + radius * Math.cos(-midAngle * RADIAN)
                        const y = cy + radius * Math.sin(-midAngle * RADIAN)
                        return (
                          <text
                            x={x}
                            y={y}
                            fill={chartTheme.axisFill}
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            fontSize={11}
                            fontWeight={600}
                          >
                            {`${name}: ${(percent * 100).toFixed(0)}%`}
                          </text>
                        )
                      }}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {summaries.map((s, index) => (
                        <Cell key={`cell-${index}`} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [formatCurrency(value), name]}
                      contentStyle={{
                        backgroundColor: chartTheme.tooltipBg,
                        border: `2px solid ${chartTheme.tooltipBorder}`,
                        borderRadius: '12px',
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: chartTheme.tooltipText,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <ScrollArea className="h-[400px] lg:col-span-2">
              <div className="space-y-2">
                {summaries.map((summary) => (
                  <button
                    key={summary.memberName}
                    onClick={() => setSelectedMember(summary)}
                    className="group flex w-full items-center justify-between rounded-xl border-2 border-transparent p-4 transition-all hover:border-gray-200 hover:bg-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-5 w-5 flex-shrink-0 rounded-lg shadow-sm"
                        style={{ backgroundColor: summary.color }}
                        aria-hidden="true"
                      />
                      <div className="text-left">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          {summary.memberName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {summary.count} transactions &bull; {summary.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrency(summary.total)}
                      </p>
                      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 dark:text-gray-500" />
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
