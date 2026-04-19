import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { parseCSV } from '@/lib/parser'
import { analyzeExpenses, type AnalyzeOptions } from '@/lib/analyzer'
import { saveAnalysis, type SavedAnalysis } from '@/lib/db'
import type { Transaction, ExpenseReport } from '@/lib/types'
import type { PeriodPreset } from '@/components/PeriodFilter'
import type { CategoryConfig } from '@/lib/category-config'

export interface UseExpenseAnalysisReturn {
  /** State */
  transactions: Transaction[]
  report: ExpenseReport | null
  loading: boolean
  error: string | null
  fileName: string
  saved: boolean
  categoryOverrides: Map<number, string>
  memberOverrides: Map<number, string>
  filteredTransactions: Transaction[]
  filteredReport: ExpenseReport | null
  periodFilter: PeriodPreset
  periodDateRange: { start: Date; end: Date } | null
  savedAnalysesRefreshTrigger: number

  memberFilter: string | null

  /** Computed */
  displayReport: ExpenseReport | null
  displayTransactions: Transaction[]

  /** Handlers */
  handleFileUpload: (file: File) => Promise<void>
  handleUpdateCategories: (overrides: Map<number, string>) => void
  handleSave: () => Promise<void>
  handleLoadSaved: (analysis: SavedAnalysis) => void
  handleHistoryBuilt: (txns: Transaction[]) => void
  handlePeriodFilterChange: (
    filtered: Transaction[],
    period: PeriodPreset,
    dateRange: { start: Date; end: Date } | null
  ) => void
  handleMemberFilterChange: (filtered: Transaction[] | null, member: string | null) => void
  handleReset: () => void
  bumpSavedAnalysesRefresh: () => void
  setMemberOverrides: React.Dispatch<React.SetStateAction<Map<number, string>>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
}

/**
 * Core analysis state and handlers extracted from page.tsx.
 *
 * @param announce - Accessibility announcement function
 *   from useAnnouncer
 */
export function useExpenseAnalysis(
  announce: (message: string) => void,
  categoryConfig?: CategoryConfig
): UseExpenseAnalysisReturn {
  const analyzeOpts = useMemo<AnalyzeOptions | undefined>(
    () =>
      categoryConfig
        ? {
            customRules: categoryConfig.customKeywordRules,
            resolveCategory: categoryConfig.resolveCategory,
          }
        : undefined,
    [categoryConfig]
  )
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [report, setReport] = useState<ExpenseReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>('')
  const [saved, setSaved] = useState(false)
  const [categoryOverrides, setCategoryOverrides] = useState<Map<number, string>>(new Map())
  const [memberOverrides, setMemberOverrides] = useState<Map<number, string>>(new Map())
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [filteredReport, setFilteredReport] = useState<ExpenseReport | null>(null)
  const [periodFilter, setPeriodFilter] = useState<PeriodPreset>('all')
  const [periodDateRange, setPeriodDateRange] = useState<{
    start: Date
    end: Date
  } | null>(null)
  const [savedAnalysesRefreshTrigger, setSavedAnalysesRefreshTrigger] = useState(0)
  const [memberFilter, setMemberFilter] = useState<string | null>(null)
  const [memberFilteredTxns, setMemberFilteredTxns] = useState<Transaction[] | null>(null)

  // Re-analyze when category config changes (new rules, renames, merges)
  // Keep a ref to analyzeOpts so closures always use the latest
  const analyzeOptsRef = useRef(analyzeOpts)
  analyzeOptsRef.current = analyzeOpts

  const configKey =
    JSON.stringify(categoryConfig?.customKeywordRules ?? []) +
    JSON.stringify(categoryConfig?.aliases ?? [])
  const isInitialMount = useRef(true)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (transactions.length > 0) {
      const newReport = analyzeExpenses(transactions, categoryOverrides, analyzeOptsRef.current)
      setTransactions(newReport.categorizedTransactions ?? transactions)
      setReport(newReport)
    }
  }, [configKey]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleFileUpload(file: File): Promise<void> {
    setLoading(true)
    setError(null)
    setSaved(false)

    try {
      const parsedTransactions = await parseCSV(file)
      setCategoryOverrides(new Map())
      setMemberOverrides(new Map())
      const newReport = analyzeExpenses(parsedTransactions, undefined, analyzeOptsRef.current)
      setTransactions(newReport.categorizedTransactions ?? parsedTransactions)
      setReport(newReport)
      setFileName(file.name)
      announce(`Analysis loaded: ${parsedTransactions.length}` + ` transactions from ${file.name}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setLoading(false)
    }
  }

  function handleUpdateCategories(overrides: Map<number, string>): void {
    setCategoryOverrides(overrides)
    const newReport = analyzeExpenses(transactions, overrides, analyzeOptsRef.current)
    setTransactions(newReport.categorizedTransactions ?? transactions)
    setReport(newReport)
    setSaved(false)
  }

  async function handleSave(): Promise<void> {
    if (!report || transactions.length === 0) return

    try {
      await saveAnalysis(fileName, transactions, report)
      setSaved(true)
      announce('Analysis saved')
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
    announce(`Loaded saved analysis: ${analysis.fileName}`)
  }

  function handleHistoryBuilt(txns: Transaction[]): void {
    const newReport = analyzeExpenses(txns, undefined, analyzeOptsRef.current)
    setTransactions(newReport.categorizedTransactions ?? txns)
    setReport(newReport)
    setFileName('Merged History')
    setSaved(false)
  }

  const handlePeriodFilterChange = useCallback(
    (
      filtered: Transaction[],
      period: PeriodPreset,
      dateRange: { start: Date; end: Date } | null
    ) => {
      setFilteredTransactions(filtered)
      setPeriodFilter(period)
      setPeriodDateRange(dateRange)

      if (filtered.length > 0) {
        setFilteredReport(analyzeExpenses(filtered, categoryOverrides, analyzeOptsRef.current))
      } else {
        setFilteredReport(null)
      }
    },
    [categoryOverrides]
  )

  function handleMemberFilterChange(filtered: Transaction[] | null, member: string | null): void {
    setMemberFilter(member)
    setMemberFilteredTxns(filtered)
  }

  function handleReset(): void {
    setTransactions([])
    setReport(null)
    setFilteredTransactions([])
    setFilteredReport(null)
    setPeriodFilter('all')
    setPeriodDateRange(null)
    setMemberFilter(null)
    setMemberFilteredTxns(null)
    setFileName('')
    setSaved(false)
    setCategoryOverrides(new Map())
    setMemberOverrides(new Map())
    setError(null)
  }

  function bumpSavedAnalysesRefresh(): void {
    setSavedAnalysesRefreshTrigger((prev) => prev + 1)
  }

  // Chain filters: period first, then member
  const afterPeriod = periodFilter === 'all' ? transactions : filteredTransactions

  const displayTransactions = memberFilteredTxns ?? afterPeriod

  const displayReport = useMemo(() => {
    if (displayTransactions.length === 0 && transactions.length === 0) {
      return null
    }
    // If any filter is active, re-analyze the filtered set
    if (memberFilter || periodFilter !== 'all') {
      if (displayTransactions.length === 0) return null
      return analyzeExpenses(displayTransactions, categoryOverrides, analyzeOptsRef.current)
    }
    return report
  }, [
    displayTransactions,
    transactions.length,
    memberFilter,
    periodFilter,
    report,
    categoryOverrides,
    configKey,
  ])

  return {
    transactions,
    report,
    loading,
    error,
    fileName,
    saved,
    categoryOverrides,
    memberOverrides,
    filteredTransactions,
    filteredReport,
    periodFilter,
    periodDateRange,
    savedAnalysesRefreshTrigger,
    memberFilter,
    displayReport,
    displayTransactions,
    handleFileUpload,
    handleUpdateCategories,
    handleSave,
    handleLoadSaved,
    handleHistoryBuilt,
    handlePeriodFilterChange,
    handleMemberFilterChange,
    handleReset,
    bumpSavedAnalysesRefresh,
    setMemberOverrides,
    setError,
  }
}
