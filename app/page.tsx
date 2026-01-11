'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileUpload } from '@/components/FileUpload'
import { ExpenseSummary } from '@/components/ExpenseSummary'
import { CategoryBreakdown } from '@/components/CategoryBreakdown'
import { MonthlyTrends } from '@/components/MonthlyTrends'
import { TopExpenses } from '@/components/TopExpenses'
import { SavedAnalyses } from '@/components/SavedAnalyses'
import { ComparisonView } from '@/components/ComparisonView'
import { TransactionHistoryBuilder } from '@/components/TransactionHistoryBuilder'
import { TransactionsTable } from '@/components/TransactionsTable'
import { BudgetManager } from '@/components/BudgetManager'
import { BudgetOverview } from '@/components/BudgetOverview'
import { PeriodFilter, type PeriodPreset } from '@/components/PeriodFilter'
import { BackupRestore } from '@/components/BackupRestore'
import { parseCSV } from '@/lib/parser'
import { analyzeExpenses, calculateBudgetStatus } from '@/lib/analyzer'
import { saveAnalysis, getAllBudgets, type SavedAnalysis } from '@/lib/db'
import type { Transaction, ExpenseReport, Budget, BudgetWithSpending } from '@/lib/types'
import { TrendingUp, Save, Check, GitCompare, Shield, Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [report, setReport] = useState<ExpenseReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [saved, setSaved] = useState(false)
  const [categoryOverrides, setCategoryOverrides] = useState<Map<number, string>>(new Map())
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [budgetManagerOpen, setBudgetManagerOpen] = useState(false)
  const [backupRestoreOpen, setBackupRestoreOpen] = useState(false)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [budgetStatus, setBudgetStatus] = useState<BudgetWithSpending[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [filteredReport, setFilteredReport] = useState<ExpenseReport | null>(null)
  const [periodFilter, setPeriodFilter] = useState<PeriodPreset>('all')
  const [periodDateRange, setPeriodDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const [savedAnalysesRefreshTrigger, setSavedAnalysesRefreshTrigger] = useState(0)

  // Handle period filter changes
  const handlePeriodFilterChange = useCallback(
    (
      filtered: Transaction[],
      period: PeriodPreset,
      dateRange: { start: Date; end: Date } | null
    ) => {
      setFilteredTransactions(filtered)
      setPeriodFilter(period)
      setPeriodDateRange(dateRange)

      // Recalculate report for filtered transactions
      if (filtered.length > 0) {
        const newReport = analyzeExpenses(filtered, categoryOverrides)
        setFilteredReport(newReport)
      } else {
        setFilteredReport(null)
      }
    },
    [categoryOverrides]
  )

  // Load budgets on mount
  useEffect(() => {
    async function initialize() {
      try {
        await loadBudgets()
      } finally {
        setInitialLoading(false)
      }
    }
    initialize()
  }, [])

  // Recalculate budget status when filtered transactions or budgets change
  useEffect(() => {
    const txnsToUse = filteredTransactions.length > 0 ? filteredTransactions : transactions
    if (txnsToUse.length > 0 && budgets.length > 0) {
      // Use the period date range if available, otherwise use current month
      const status = calculateBudgetStatus(txnsToUse, budgets, periodDateRange?.start)
      setBudgetStatus(status)
    } else {
      setBudgetStatus([])
    }
  }, [transactions, filteredTransactions, budgets, periodDateRange])

  async function loadBudgets(): Promise<void> {
    try {
      const savedBudgets = await getAllBudgets()
      setBudgets(savedBudgets)
    } catch (err) {
      console.error('Failed to load budgets:', err)
    }
  }

  async function handleFileUpload(file: File): Promise<void> {
    setLoading(true)
    setError(null)
    setSaved(false)

    try {
      const parsedTransactions = await parseCSV(file)
      setTransactions(parsedTransactions)
      setCategoryOverrides(new Map())
      setReport(analyzeExpenses(parsedTransactions))
      setFileName(file.name)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setLoading(false)
    }
  }

  function handleUpdateCategories(overrides: Map<number, string>): void {
    setCategoryOverrides(overrides)
    setReport(analyzeExpenses(transactions, overrides))
    setSaved(false)
  }

  async function handleSave(): Promise<void> {
    if (!report || transactions.length === 0) return

    try {
      await saveAnalysis(fileName, transactions, report)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (_err) {
      setError('Failed to save analysis')
    }
  }

  function handleLoadSaved(analysis: SavedAnalysis): void {
    setTransactions(analysis.transactions)
    setReport(analysis.report)
    setFileName(analysis.fileName)
    setSaved(false)
  }

  function handleRestoreComplete(): void {
    loadBudgets()
    setSavedAnalysesRefreshTrigger((prev) => prev + 1)
    setTransactions([])
    setReport(null)
    setFileName('')
  }

  function handleHistoryBuilt(txns: Transaction[]): void {
    setTransactions(txns)
    setReport(analyzeExpenses(txns))
    setFileName('Merged History')
    setSaved(false)
  }

  const displayReport = periodFilter === 'all' ? report : (filteredReport ?? report)
  const displayTransactions = periodFilter === 'all' ? transactions : filteredTransactions

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/20 p-3 shadow-lg backdrop-blur-sm">
              <TrendingUp className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">UBS CSV Analyzer</h1>
              <p className="mt-1 text-lg text-blue-100">
                Upload your UBS bank statement to unlock financial insights
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}

          {initialLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          {!initialLoading && report && (
            <div className="animate-in fade-in space-y-6 duration-500">
              {/* Top row: Period Filter + Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Period Filter */}
                <PeriodFilter
                  transactions={transactions}
                  onFilteredTransactions={handlePeriodFilterChange}
                />

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <TransactionsTable
                    transactions={periodFilter === 'all' ? transactions : filteredTransactions}
                    onUpdateCategories={handleUpdateCategories}
                  />
                  <SavedAnalyses
                    onLoad={handleLoadSaved}
                    refreshTrigger={savedAnalysesRefreshTrigger}
                  />
                  <TransactionHistoryBuilder onHistoryBuilt={handleHistoryBuilt} />
                  <button
                    onClick={() => setComparisonOpen(true)}
                    className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 transition-all hover:border-purple-300 hover:bg-purple-50"
                  >
                    <GitCompare className="h-5 w-5" />
                    Compare
                  </button>
                  <button
                    onClick={() => setBackupRestoreOpen(true)}
                    className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 transition-all hover:border-slate-400 hover:bg-slate-50"
                  >
                    <Shield className="h-5 w-5" />
                    Backup
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saved}
                    className={`flex items-center gap-2 rounded-xl px-6 py-3 font-semibold shadow-lg transition-all ${
                      saved
                        ? 'bg-green-500 text-white'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-xl'
                    }`}
                  >
                    {saved ? (
                      <>
                        <Check className="h-5 w-5" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        Save
                      </>
                    )}
                  </button>
                </div>
              </div>

              {displayReport && (
                <>
                  <ExpenseSummary report={displayReport} />

                  <BudgetOverview
                    budgetStatus={budgetStatus}
                    onManageBudgets={() => setBudgetManagerOpen(true)}
                  />

                  <CategoryBreakdown
                    categories={displayReport.categorySummaries}
                    budgetStatus={budgetStatus}
                  />

                  <MonthlyTrends transactions={displayTransactions} />

                  <TopExpenses transactions={displayReport.topExpenses} />
                </>
              )}
            </div>
          )}

          {!initialLoading && !report && !loading && (
            <div className="rounded-2xl border-2 border-gray-50 bg-white py-24 text-center shadow-xl">
              <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-purple-50">
                <TrendingUp className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">
                Ready to analyze your UBS statement?
              </h3>
              <p className="mb-8 text-lg text-gray-600">
                Upload a CSV file to get started with powerful insights
              </p>
              <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setUploadModalOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
                >
                  Upload CSV File
                </button>
                <SavedAnalyses
                  onLoad={handleLoadSaved}
                  refreshTrigger={savedAnalysesRefreshTrigger}
                />
                <button
                  onClick={() => setBackupRestoreOpen(true)}
                  className="flex items-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-6 py-3 font-semibold text-gray-700 transition-all hover:border-slate-400 hover:bg-slate-50"
                >
                  <Shield className="h-5 w-5" />
                  Restore Backup
                </button>
              </div>
              <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span>Automatic categorization</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                  <span>Beautiful charts</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>100% private</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <FileUpload
        onFileUpload={handleFileUpload}
        loading={loading}
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />

      <ComparisonView
        isOpen={comparisonOpen}
        onClose={() => setComparisonOpen(false)}
        currentTransactions={transactions}
      />

      <BudgetManager
        isOpen={budgetManagerOpen}
        onClose={() => setBudgetManagerOpen(false)}
        onBudgetsChange={loadBudgets}
      />

      <BackupRestore
        isOpen={backupRestoreOpen}
        onClose={() => setBackupRestoreOpen(false)}
        onRestoreComplete={handleRestoreComplete}
      />
    </div>
  )
}
