'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAnnouncer } from '@/lib/use-announcer'
import { useExpenseAnalysis } from '@/lib/use-expense-analysis'
import { useDashboardLayout } from '@/lib/use-dashboard-layout'
import { usePersistedData } from '@/lib/use-persisted-data'
import { useCategoryConfig } from '@/lib/use-category-config'
import { useBalanceSheet } from '@/lib/use-balance-sheet'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
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
import { NetWorthSummary } from '@/components/NetWorthSummary'
import { NetWorthTrend } from '@/components/NetWorthTrend'
import { BalanceSheetManager } from '@/components/BalanceSheetManager'
import { PeriodFilter } from '@/components/PeriodFilter'
import { MemberFilter } from '@/components/MemberFilter'
import { BackupRestore } from '@/components/BackupRestore'
import { SortableWidget } from '@/components/SortableWidget'
import { DashboardCustomizer } from '@/components/DashboardCustomizer'
import { CategoryManager } from '@/components/CategoryManager'
import { ThemeToggle } from '@/components/ThemeToggle'
import { exportTransactionsCsv } from '@/lib/csv-export'
import type { WidgetId } from '@/lib/dashboard-types'
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
  Tag,
  Landmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  const { announce, AnnouncerRegion } = useAnnouncer()

  const catConfig = useCategoryConfig()
  const balanceSheet = useBalanceSheet()

  const analysis = useExpenseAnalysis(announce, catConfig.config)

  const dashboard = useDashboardLayout({
    setError: (msg) => analysis.setError(msg),
  })

  const persisted = usePersistedData({
    transactions: analysis.transactions,
    filteredTransactions: analysis.filteredTransactions,
    periodDateRange: analysis.periodDateRange,
    setError: analysis.setError,
  })

  // Dialog open states (simple booleans, not worth a separate hook)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [comparisonOpen, setComparisonOpen] = useState(false)
  const [budgetManagerOpen, setBudgetManagerOpen] = useState(false)
  const [backupRestoreOpen, setBackupRestoreOpen] = useState(false)
  const [savedAnalysesOpen, setSavedAnalysesOpen] = useState(false)
  const [historyBuilderOpen, setHistoryBuilderOpen] = useState(false)
  const [memberManagerOpen, setMemberManagerOpen] = useState(false)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [balanceSheetOpen, setBalanceSheetOpen] = useState(false)

  // Orchestration: restore needs to reload all persisted data + dashboard
  function handleRestoreComplete(): void {
    persisted.loadBudgets()
    dashboard.loadDashboardLayout()
    persisted.loadMembers()
    persisted.loadManualRecurring()
    catConfig.reload()
    balanceSheet.reload()
    analysis.bumpSavedAnalysesRefresh()
    analysis.handleReset()
    announce('Backup restored successfully')
  }

  // Initialize dashboard layout alongside persisted data
  const { loadDashboardLayout } = dashboard
  useEffect(() => {
    loadDashboardLayout()
  }, [loadDashboardLayout])

  const { displayReport, displayTransactions } = analysis

  const previousSnapshot = useMemo(() => {
    if (balanceSheet.snapshots.length < 2) return null
    return balanceSheet.snapshots[balanceSheet.snapshots.length - 2]
  }, [balanceSheet.snapshots])

  const widgetMap = useMemo((): Partial<Record<WidgetId, React.ReactNode>> => {
    // Net worth widgets are always available
    const map: Partial<Record<WidgetId, React.ReactNode>> = {
      'net-worth-summary': (
        <NetWorthSummary
          totalAssets={balanceSheet.currentNetWorth.totalAssets}
          totalLiabilities={balanceSheet.currentNetWorth.totalLiabilities}
          netWorth={balanceSheet.currentNetWorth.netWorth}
          previousSnapshot={previousSnapshot}
          onManageAccounts={() => setBalanceSheetOpen(true)}
        />
      ),
      'net-worth-trend': <NetWorthTrend snapshots={balanceSheet.snapshots} />,
    }

    // Expense widgets require a loaded report
    if (displayReport) {
      Object.assign(map, {
        'expense-summary': <ExpenseSummary report={displayReport} />,
        'budget-overview': (
          <BudgetOverview
            budgetStatus={persisted.budgetStatus}
            onManageBudgets={() => setBudgetManagerOpen(true)}
          />
        ),
        'category-breakdown': (
          <CategoryBreakdown
            categories={displayReport.categorySummaries}
            budgetStatus={persisted.budgetStatus}
            onMarkRecurring={persisted.handleMarkRecurring}
            taggedFingerprints={persisted.manualRecurringFingerprints}
            getCategoryColor={catConfig.config.getCategoryColor}
          />
        ),
        'monthly-trends': (
          <MonthlyTrends
            transactions={displayTransactions}
            getCategoryColor={catConfig.config.getCategoryColor}
          />
        ),
        'spending-forecast': (
          <SpendingForecast transactions={analysis.transactions} report={displayReport} />
        ),
        'recurring-transactions': (
          <RecurringTransactions
            transactions={analysis.transactions}
            manualRecurring={persisted.manualRecurring}
            onRemoveManualRecurring={persisted.handleRemoveManualRecurring}
          />
        ),
        'top-expenses': <TopExpenses transactions={displayReport.topExpenses} />,
        'member-breakdown': (
          <MemberBreakdown
            transactions={displayTransactions}
            members={persisted.householdMembers}
            memberOverrides={analysis.memberOverrides}
            onMarkRecurring={persisted.handleMarkRecurring}
            taggedFingerprints={persisted.manualRecurringFingerprints}
          />
        ),
      })
    }

    return map
  }, [
    displayReport,
    displayTransactions,
    analysis.transactions,
    analysis.memberOverrides,
    persisted.budgetStatus,
    persisted.householdMembers,
    persisted.manualRecurring,
    persisted.manualRecurringFingerprints,
    persisted.handleMarkRecurring,
    persisted.handleRemoveManualRecurring,
    catConfig.config.getCategoryColor,
    balanceSheet.currentNetWorth,
    balanceSheet.snapshots,
    previousSnapshot,
  ])

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 shadow-sm">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="font-display text-xl font-semibold tracking-tight">
                Expense Analyzer
              </h1>
              {analysis.fileName && (
                <span className="text-sm text-muted-foreground">/ {analysis.fileName}</span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              {analysis.report && (
                <Button variant="ghost" size="sm" onClick={analysis.handleReset}>
                  <HomeIcon className="mr-1.5 h-4 w-4" />
                  New
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
        aria-busy={analysis.loading || persisted.initialLoading}
      >
        {AnnouncerRegion}
        <div className="space-y-8">
          {analysis.error && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{analysis.error}</AlertDescription>
            </Alert>
          )}

          {persisted.initialLoading && (
            <div className="flex items-center justify-center py-12" role="status">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden="true" />
              <span className="sr-only">Loading</span>
            </div>
          )}

          {!persisted.initialLoading && analysis.report && (
            <div className="space-y-6 duration-500 animate-in fade-in">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PeriodFilter
                    transactions={analysis.transactions}
                    onFilteredTransactions={analysis.handlePeriodFilterChange}
                  />
                  <MemberFilter
                    members={persisted.householdMembers}
                    transactions={
                      analysis.periodFilter === 'all'
                        ? analysis.transactions
                        : analysis.filteredTransactions
                    }
                    memberOverrides={analysis.memberOverrides}
                    onFilter={analysis.handleMemberFilterChange}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <TransactionsTable
                    transactions={
                      analysis.periodFilter === 'all'
                        ? analysis.transactions
                        : analysis.filteredTransactions
                    }
                    onUpdateCategories={analysis.handleUpdateCategories}
                    members={persisted.householdMembers}
                    memberOverrides={analysis.memberOverrides}
                    onUpdateMembers={analysis.setMemberOverrides}
                    onMarkRecurring={persisted.handleMarkRecurring}
                    taggedFingerprints={persisted.manualRecurringFingerprints}
                    allCategories={catConfig.config.allCategories}
                  />
                  <Button variant="outline" size="sm" onClick={() => setCategoryManagerOpen(true)}>
                    <Tag className="mr-1.5 h-4 w-4" />
                    Categories
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setBalanceSheetOpen(true)}>
                    <Landmark className="mr-1.5 h-4 w-4" />
                    Net Worth
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setMemberManagerOpen(true)}>
                    <Users className="mr-1.5 h-4 w-4" />
                    Members
                  </Button>
                  <Button
                    variant={dashboard.isCustomizing ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => dashboard.setIsCustomizing(!dashboard.isCustomizing)}
                    className={
                      dashboard.isCustomizing ? 'bg-amber-500 text-white hover:bg-amber-600' : ''
                    }
                  >
                    <Settings className="mr-1.5 h-4 w-4" />
                    Customize
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault()
                          setSavedAnalysesOpen(true)
                        }}
                      >
                        <Database className="mr-2 h-4 w-4" />
                        Saved Analyses
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault()
                          setHistoryBuilderOpen(true)
                        }}
                      >
                        <History className="mr-2 h-4 w-4" />
                        Build History
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault()
                          setComparisonOpen(true)
                        }}
                      >
                        <GitCompare className="mr-2 h-4 w-4" />
                        Compare Periods
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          exportTransactionsCsv(displayTransactions, analysis.categoryOverrides)
                        }
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault()
                          setBackupRestoreOpen(true)
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Backup & Restore
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={analysis.handleSave}
                    disabled={analysis.saved}
                    size="sm"
                    className={
                      analysis.saved
                        ? 'bg-emerald-600 text-white hover:bg-emerald-600'
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }
                  >
                    {analysis.saved ? (
                      <>
                        <Check className="mr-1.5 h-4 w-4" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="mr-1.5 h-4 w-4" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <SavedAnalyses
                onLoad={analysis.handleLoadSaved}
                refreshTrigger={analysis.savedAnalysesRefreshTrigger}
                open={savedAnalysesOpen}
                onOpenChange={setSavedAnalysesOpen}
              />
              <TransactionHistoryBuilder
                onHistoryBuilt={analysis.handleHistoryBuilt}
                open={historyBuilderOpen}
                onOpenChange={setHistoryBuilderOpen}
              />

              <DndContext
                sensors={dashboard.sensors}
                collisionDetection={closestCenter}
                onDragEnd={dashboard.handleDragEnd}
              >
                <SortableContext items={dashboard.visibleWidgetIds} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {dashboard.widgets
                      .filter((w) => w.visible && widgetMap[w.id])
                      .map((widget) => (
                        <SortableWidget
                          key={widget.id}
                          id={widget.id}
                          isCustomizing={dashboard.isCustomizing}
                          label={widget.label}
                          size={widget.size}
                          onHide={dashboard.handleToggleVisibility}
                        >
                          {widgetMap[widget.id]}
                        </SortableWidget>
                      ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {!persisted.initialLoading && !analysis.report && !analysis.loading && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
              <div className="max-w-md text-center">
                <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10">
                  <TrendingUp className="h-8 w-8 text-amber-500" />
                </div>
                <h2 className="font-display text-3xl font-semibold tracking-tight">
                  Analyze your finances
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Upload a UBS bank statement or credit card CSV to see where your money goes.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Button
                    onClick={() => setUploadModalOpen(true)}
                    className="bg-amber-500 px-6 text-white hover:bg-amber-600"
                  >
                    Upload CSV
                  </Button>
                  <SavedAnalyses
                    onLoad={analysis.handleLoadSaved}
                    refreshTrigger={analysis.savedAnalysesRefreshTrigger}
                  />
                  <Button variant="outline" onClick={() => setBalanceSheetOpen(true)}>
                    <Landmark className="mr-1.5 h-4 w-4" />
                    Net Worth
                  </Button>
                  <Button variant="outline" onClick={() => setBackupRestoreOpen(true)}>
                    <Shield className="mr-1.5 h-4 w-4" />
                    Restore
                  </Button>
                </div>
                <div className="mt-10 flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <span>Auto-categorization</span>
                  <span className="text-border">|</span>
                  <span>Budgets & forecasts</span>
                  <span className="text-border">|</span>
                  <span>100% local</span>
                </div>
              </div>

              {/* Net worth widgets on landing page */}
              {(balanceSheet.accounts.length > 0 || balanceSheet.snapshots.length > 0) && (
                <div className="mt-12 grid w-full max-w-4xl grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="lg:col-span-1">
                    <NetWorthSummary
                      totalAssets={balanceSheet.currentNetWorth.totalAssets}
                      totalLiabilities={balanceSheet.currentNetWorth.totalLiabilities}
                      netWorth={balanceSheet.currentNetWorth.netWorth}
                      previousSnapshot={previousSnapshot}
                      onManageAccounts={() => setBalanceSheetOpen(true)}
                    />
                  </div>
                  {balanceSheet.snapshots.length > 0 && (
                    <div className="lg:col-span-2">
                      <NetWorthTrend snapshots={balanceSheet.snapshots} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <FileUpload
        onFileUpload={analysis.handleFileUpload}
        loading={analysis.loading}
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />

      <ComparisonView
        isOpen={comparisonOpen}
        onClose={() => setComparisonOpen(false)}
        currentTransactions={analysis.transactions}
        resolveCategory={catConfig.config.resolveCategory}
      />

      <BudgetManager
        isOpen={budgetManagerOpen}
        onClose={() => setBudgetManagerOpen(false)}
        onBudgetsChange={persisted.loadBudgets}
        allCategories={catConfig.config.allCategories}
      />

      <CategoryManager
        isOpen={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        config={catConfig.config}
        onAddCustomCategory={catConfig.addCustomCategory}
        onAddAlias={catConfig.addAlias}
        onRemoveConfig={catConfig.removeConfig}
      />

      <BackupRestore
        isOpen={backupRestoreOpen}
        onClose={() => setBackupRestoreOpen(false)}
        onRestoreComplete={handleRestoreComplete}
      />

      <BalanceSheetManager
        isOpen={balanceSheetOpen}
        onClose={() => setBalanceSheetOpen(false)}
        members={persisted.householdMembers}
        accounts={balanceSheet.accounts}
        latestBalances={balanceSheet.latestBalances}
        totalAssets={balanceSheet.currentNetWorth.totalAssets}
        totalLiabilities={balanceSheet.currentNetWorth.totalLiabilities}
        netWorth={balanceSheet.currentNetWorth.netWorth}
        error={balanceSheet.error}
        loading={balanceSheet.loading}
        lastSnapshotDate={
          balanceSheet.snapshots.length > 0
            ? balanceSheet.snapshots[balanceSheet.snapshots.length - 1].date
            : null
        }
        onAddAccount={balanceSheet.addAccount}
        onUpdateBalance={balanceSheet.updateBalance}
        onArchiveAccount={balanceSheet.archiveAccount}
        onTakeSnapshot={balanceSheet.takeSnapshot}
        onLoadBalanceHistory={balanceSheet.getBalanceHistory}
        onClearError={balanceSheet.clearError}
      />

      <MemberManager
        isOpen={memberManagerOpen}
        onClose={() => setMemberManagerOpen(false)}
        onMembersChanged={persisted.loadMembers}
        transactions={analysis.transactions}
      />

      {dashboard.isCustomizing && (
        <DashboardCustomizer
          widgets={dashboard.widgets}
          onToggleVisibility={dashboard.handleToggleVisibility}
          onReorder={dashboard.handleReorder}
          onResetLayout={dashboard.handleResetLayout}
          onClose={() => dashboard.setIsCustomizing(false)}
        />
      )}
    </div>
  )
}
