'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useAnnouncer } from '@/lib/use-announcer'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensors,
  useSensor,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { FileUpload } from '@/components/FileUpload'
import { ExpenseSummary } from '@/components/ExpenseSummary'
import { CategoryBreakdown } from '@/components/CategoryBreakdown'
import { MonthlyTrends } from '@/components/MonthlyTrends'
import { TopExpenses } from '@/components/TopExpenses'
import { SpendingForecast } from '@/components/SpendingForecast'
import { RecurringTransactions } from '@/components/RecurringTransactions'
import { SavedAnalyses } from '@/components/SavedAnalyses'
import { ComparisonView } from '@/components/ComparisonView'
import { TransactionHistoryBuilder } from '@/components/TransactionHistoryBuilder'
import { TransactionsTable } from '@/components/TransactionsTable'
import { BudgetManager } from '@/components/BudgetManager'
import { MemberManager } from '@/components/MemberManager'
import { MemberBreakdown } from '@/components/MemberBreakdown'
import { BudgetOverview } from '@/components/BudgetOverview'
import { PeriodFilter, type PeriodPreset } from '@/components/PeriodFilter'
import { BackupRestore } from '@/components/BackupRestore'
import { SortableWidget } from '@/components/SortableWidget'
import { DashboardCustomizer } from '@/components/DashboardCustomizer'
import { ThemeToggle } from '@/components/ThemeToggle'
import { parseCSV } from '@/lib/parser'
import { analyzeExpenses, calculateBudgetStatus } from '@/lib/analyzer'
import { exportTransactionsCsv } from '@/lib/csv-export'
import {
  saveAnalysis,
  getAllBudgets,
  getAllHouseholdMembers,
  getAllManualRecurring,
  saveManualRecurring,
  deleteManualRecurring,
  getDashboardLayout,
  saveDashboardLayout,
  type SavedAnalysis,
} from '@/lib/db'
import type {
  Transaction,
  ExpenseReport,
  Budget,
  BudgetWithSpending,
  HouseholdMember,
  ManualRecurringTransaction,
} from '@/lib/types'
import type { WidgetId, WidgetConfig } from '@/lib/dashboard-types'
import { DEFAULT_WIDGETS, DEFAULT_SIZES } from '@/lib/dashboard-types'
import {
  TrendingUp,
  Save,
  Check,
  GitCompare,
  Shield,
  Loader2,
  Settings,
  Home as HomeIcon,
  MoreHorizontal,
  History,
  Database,
  Download,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

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
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS)
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [savedAnalysesOpen, setSavedAnalysesOpen] = useState(false)
  const [historyBuilderOpen, setHistoryBuilderOpen] = useState(false)
  const [memberManagerOpen, setMemberManagerOpen] = useState(false)
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([])
  const [memberOverrides, setMemberOverrides] = useState<Map<number, string>>(new Map())
  const [manualRecurring, setManualRecurring] = useState<ManualRecurringTransaction[]>([])
  const saveLayoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { announce, AnnouncerRegion } = useAnnouncer()

  const manualRecurringFingerprints = useMemo(
    () => new Set(manualRecurring.map((r) => r.fingerprint)),
    [manualRecurring]
  )

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
        const newReport = analyzeExpenses(filtered, categoryOverrides)
        setFilteredReport(newReport)
      } else {
        setFilteredReport(null)
      }
    },
    [categoryOverrides]
  )

  useEffect(() => {
    async function initialize() {
      try {
        await Promise.all([
          loadBudgets(),
          loadDashboardLayout(),
          loadMembers(),
          loadManualRecurring(),
        ])
      } finally {
        setInitialLoading(false)
      }
    }
    initialize()
    return () => {
      if (saveLayoutTimerRef.current) clearTimeout(saveLayoutTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const txnsToUse = filteredTransactions.length > 0 ? filteredTransactions : transactions
    if (txnsToUse.length > 0 && budgets.length > 0) {
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
      setError('Failed to load budgets')
    }
  }

  async function loadMembers(): Promise<void> {
    try {
      const saved = await getAllHouseholdMembers()
      setHouseholdMembers(saved)
    } catch (err) {
      console.error('Failed to load household members:', err)
    }
  }

  async function loadManualRecurring(): Promise<void> {
    try {
      const saved = await getAllManualRecurring()
      setManualRecurring(saved)
    } catch (err) {
      console.error('Failed to load manual recurring:', err)
    }
  }

  async function loadDashboardLayout(): Promise<void> {
    try {
      const saved = await getDashboardLayout()
      if (saved) {
        const savedIds = new Set(saved.widgets.map((w) => w.id))
        const merged = [
          ...saved.widgets.map((w) => ({
            ...w,
            size: w.size || DEFAULT_SIZES[w.id] || ('full' as const),
          })),
          ...DEFAULT_WIDGETS.filter((w) => !savedIds.has(w.id)),
        ]
        setWidgets(merged)
      }
    } catch (err) {
      console.error('Failed to load dashboard layout:', err)
    }
  }

  function debounceSaveLayout(updatedWidgets: WidgetConfig[]): void {
    if (saveLayoutTimerRef.current) clearTimeout(saveLayoutTimerRef.current)
    saveLayoutTimerRef.current = setTimeout(() => {
      saveDashboardLayout({ widgets: updatedWidgets }).catch((err) =>
        console.error('Failed to save dashboard layout:', err)
      )
    }, 500)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor)
  )

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setWidgets((prev) => {
      const oldIndex = prev.findIndex((w) => w.id === active.id)
      const newIndex = prev.findIndex((w) => w.id === over.id)
      const updated = arrayMove(prev, oldIndex, newIndex)
      debounceSaveLayout(updated)
      return updated
    })
  }

  function handleToggleVisibility(id: WidgetId): void {
    setWidgets((prev) => {
      const updated = prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
      debounceSaveLayout(updated)
      return updated
    })
  }

  function handleReorder(reordered: WidgetConfig[]): void {
    setWidgets(reordered)
    debounceSaveLayout(reordered)
  }

  function handleResetLayout(): void {
    setWidgets(DEFAULT_WIDGETS)
    debounceSaveLayout(DEFAULT_WIDGETS)
  }

  async function handleFileUpload(file: File): Promise<void> {
    setLoading(true)
    setError(null)
    setSaved(false)

    try {
      const parsedTransactions = await parseCSV(file)
      setTransactions(parsedTransactions)
      setCategoryOverrides(new Map())
      setMemberOverrides(new Map())
      setReport(analyzeExpenses(parsedTransactions))
      setFileName(file.name)
      announce(`Analysis loaded: ${parsedTransactions.length} transactions from ${file.name}`)
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

  function handleRestoreComplete(): void {
    loadBudgets()
    loadDashboardLayout()
    loadMembers()
    loadManualRecurring()
    setSavedAnalysesRefreshTrigger((prev) => prev + 1)
    setTransactions([])
    setReport(null)
    setFileName('')
    announce('Backup restored successfully')
  }

  function handleHistoryBuilt(txns: Transaction[]): void {
    setTransactions(txns)
    setReport(analyzeExpenses(txns))
    setFileName('Merged History')
    setSaved(false)
  }

  const handleMarkRecurring = useCallback(
    async (entry: Omit<ManualRecurringTransaction, 'id'>): Promise<void> => {
      try {
        await saveManualRecurring(entry)
        await loadManualRecurring()
      } catch (err) {
        console.error('Failed to save manual recurring:', err)
      }
    },
    []
  )

  const handleRemoveManualRecurring = useCallback(async (id: number): Promise<void> => {
    try {
      await deleteManualRecurring(id)
      await loadManualRecurring()
    } catch (err) {
      console.error('Failed to remove manual recurring:', err)
    }
  }, [])

  function handleReset(): void {
    setTransactions([])
    setReport(null)
    setFilteredTransactions([])
    setFilteredReport(null)
    setPeriodFilter('all')
    setPeriodDateRange(null)
    setFileName('')
    setSaved(false)
    setCategoryOverrides(new Map())
    setMemberOverrides(new Map())
    setError(null)
    setBudgetStatus([])
  }

  const displayReport = periodFilter === 'all' ? report : (filteredReport ?? report)
  const displayTransactions = periodFilter === 'all' ? transactions : filteredTransactions

  const widgetMap = useMemo((): Record<WidgetId, React.ReactNode> | null => {
    if (!displayReport) return null
    return {
      'expense-summary': <ExpenseSummary report={displayReport} />,
      'budget-overview': (
        <BudgetOverview
          budgetStatus={budgetStatus}
          onManageBudgets={() => setBudgetManagerOpen(true)}
        />
      ),
      'category-breakdown': (
        <CategoryBreakdown
          categories={displayReport.categorySummaries}
          budgetStatus={budgetStatus}
          onMarkRecurring={handleMarkRecurring}
          taggedFingerprints={manualRecurringFingerprints}
        />
      ),
      'monthly-trends': <MonthlyTrends transactions={displayTransactions} />,
      'spending-forecast': <SpendingForecast transactions={transactions} report={displayReport} />,
      'recurring-transactions': (
        <RecurringTransactions
          transactions={transactions}
          manualRecurring={manualRecurring}
          onRemoveManualRecurring={handleRemoveManualRecurring}
        />
      ),
      'top-expenses': <TopExpenses transactions={displayReport.topExpenses} />,
      'member-breakdown': (
        <MemberBreakdown
          transactions={displayTransactions}
          members={householdMembers}
          memberOverrides={memberOverrides}
          onMarkRecurring={handleMarkRecurring}
          taggedFingerprints={manualRecurringFingerprints}
        />
      ),
    }
  }, [
    displayReport,
    displayTransactions,
    transactions,
    budgetStatus,
    householdMembers,
    memberOverrides,
    manualRecurring,
    manualRecurringFingerprints,
    handleMarkRecurring,
    handleRemoveManualRecurring,
  ])

  const visibleWidgetIds = widgets.filter((w) => w.visible).map((w) => w.id)

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
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              {report && (
                <Button
                  variant="ghost"
                  onClick={handleReset}
                  className="text-white hover:bg-white/20"
                >
                  <HomeIcon className="mr-2 h-5 w-5" />
                  New Analysis
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        aria-busy={loading || initialLoading}
      >
        {AnnouncerRegion}
        <div className="space-y-8">
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {initialLoading && (
            <div className="flex items-center justify-center py-12" role="status">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
              <span className="sr-only">Loading</span>
            </div>
          )}

          {!initialLoading && report && (
            <div className="space-y-6 duration-500 animate-in fade-in">
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
                    members={householdMembers}
                    memberOverrides={memberOverrides}
                    onUpdateMembers={setMemberOverrides}
                    onMarkRecurring={handleMarkRecurring}
                    taggedFingerprints={manualRecurringFingerprints}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setMemberManagerOpen(true)}
                    className="rounded-xl border-2 px-6 py-3 font-semibold"
                  >
                    <Users className="mr-2 h-5 w-5 text-indigo-600" />
                    Members
                  </Button>
                  <Button
                    variant={isCustomizing ? 'default' : 'outline'}
                    onClick={() => setIsCustomizing((prev) => !prev)}
                    className={`rounded-xl border-2 px-6 py-3 font-semibold ${
                      isCustomizing
                        ? 'border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900'
                        : ''
                    }`}
                  >
                    <Settings className="mr-2 h-5 w-5" />
                    Customize
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="rounded-xl border-2 px-6 py-3 font-semibold"
                      >
                        <MoreHorizontal className="mr-2 h-5 w-5" />
                        More
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setSavedAnalysesOpen(true)}>
                        <Database className="mr-2 h-4 w-4" />
                        Saved Analyses
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setHistoryBuilderOpen(true)}>
                        <History className="mr-2 h-4 w-4" />
                        Build History
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setComparisonOpen(true)}>
                        <GitCompare className="mr-2 h-4 w-4" />
                        Compare Periods
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          exportTransactionsCsv(displayTransactions, categoryOverrides)
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setBackupRestoreOpen(true)}>
                        <Shield className="mr-2 h-4 w-4" />
                        Backup & Restore
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={handleSave}
                    disabled={saved}
                    className={`rounded-xl px-6 py-3 font-semibold shadow-lg ${
                      saved
                        ? 'bg-green-500 hover:bg-green-500'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl'
                    }`}
                  >
                    {saved ? (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        Saved!
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Controlled dialogs (no trigger buttons) */}
              <SavedAnalyses
                onLoad={handleLoadSaved}
                refreshTrigger={savedAnalysesRefreshTrigger}
                open={savedAnalysesOpen}
                onOpenChange={setSavedAnalysesOpen}
              />
              <TransactionHistoryBuilder
                onHistoryBuilt={handleHistoryBuilt}
                open={historyBuilderOpen}
                onOpenChange={setHistoryBuilderOpen}
              />

              {widgetMap && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={visibleWidgetIds} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                      {widgets
                        .filter((w) => w.visible)
                        .map((widget) => (
                          <SortableWidget
                            key={widget.id}
                            id={widget.id}
                            isCustomizing={isCustomizing}
                            label={widget.label}
                            size={widget.size}
                            onHide={handleToggleVisibility}
                          >
                            {widgetMap[widget.id]}
                          </SortableWidget>
                        ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}

          {!initialLoading && !report && !loading && (
            <Card className="border-2 border-gray-50 py-24 text-center shadow-xl dark:border-gray-800">
              <CardContent>
                <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                  <TrendingUp className="h-12 w-12 text-blue-600" />
                </div>
                <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Ready to analyze your UBS statement?
                </h3>
                <p className="mb-8 text-lg text-muted-foreground">
                  Upload a CSV file to get started with powerful insights
                </p>
                <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={() => setUploadModalOpen(true)}
                    className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-semibold shadow-lg hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
                  >
                    Upload CSV File
                  </Button>
                  <SavedAnalyses
                    onLoad={handleLoadSaved}
                    refreshTrigger={savedAnalysesRefreshTrigger}
                  />
                  <Button
                    variant="outline"
                    onClick={() => setBackupRestoreOpen(true)}
                    className="rounded-xl border-2 px-6 py-3 font-semibold"
                  >
                    <Shield className="mr-2 h-5 w-5" />
                    Restore Backup
                  </Button>
                </div>
                <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
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
              </CardContent>
            </Card>
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

      <MemberManager
        isOpen={memberManagerOpen}
        onClose={() => setMemberManagerOpen(false)}
        onMembersChanged={loadMembers}
        transactions={transactions}
      />

      {isCustomizing && (
        <DashboardCustomizer
          widgets={widgets}
          onToggleVisibility={handleToggleVisibility}
          onReorder={handleReorder}
          onResetLayout={handleResetLayout}
          onClose={() => setIsCustomizing(false)}
        />
      )}
    </div>
  )
}
