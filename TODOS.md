# TODOS

## Active — from eng review 2026-04-19 (wealth feature cycle)

### In this PR (wealth)
- [ ] **WEALTH-1:** BalanceSheetManager becomes a pure-UI consumer of
  useBalanceSheet props. Delete its own accounts/latestBalances state,
  loadData, useEffect, saveAccount/saveBalanceEntry/saveNetWorthSnapshot
  imports, and onDataChanged callback. Parent (app/page.tsx) wires the
  hook's addAccount / updateBalance / archiveAccount as props.
  Kills double-fetch-per-mutation and the split-brain auto-snapshot paths.
- [ ] **WEALTH-2:** Remove auto-snapshot from addAccount, updateBalance,
  archiveAccount in use-balance-sheet.ts. Keep takeSnapshot() and expose
  it as a "Take Snapshot" button in BalanceSheetManager. Snapshots become
  intentional markers, not derived cache. balanceEntries stays the
  authoritative per-account history.
- [ ] **WEALTH-3:** Change snapshot dedupe key from `toISOString().slice(0,10)`
  to `format(date, 'yyyy-MM-dd')` (date-fns local date). db.ts:380,383.
- [ ] **WEALTH-4:** Delete components/InvestmentsSummary.tsx (213 LOC
  orphan). The new `investment` AccountCategory supersedes it.
- [ ] **WEALTH-5:** Create lib/format.ts with `formatCHF(amount: number)` and
  `formatLocalDate(date: Date)`. Migrate 3 wealth call sites
  (NetWorthSummary, NetWorthTrend, BalanceSheetManager). Leave the other
  17 non-wealth sites for TODO-MIGRATE-FORMAT.
- [ ] **WEALTH-6:** Collapse duplicate category arrays in lib/net-worth.ts.
  Keep ASSET_CATEGORIES as the only literal. ASSET_CATEGORY_OPTIONS
  re-exports it; LIABILITY_CATEGORY_OPTIONS derives from
  `Object.keys(ACCOUNT_CATEGORY_LABELS).filter(c => !ASSET_CATEGORIES.includes(c))`.
- [ ] **WEALTH-7:** Introduce `type PersistedAccount = Account & { id: number }`.
  getActiveAccounts + related reads return PersistedAccount[].
  computeNetWorth/buildSnapshot accept PersistedAccount[]. Removes all
  `account.id!` non-null assertions (net-worth.ts:75,105,108).
- [ ] **WEALTH-8:** Replace snapshot-dedupe full-scan (db.ts:381) with
  indexed `db.netWorthSnapshots.where('date').between(startOfDay, endOfDay)`.
  Uses the existing date index. Pairs with WEALTH-3.
- [ ] **WEALTH-9:** Add `error: string | null` to UseBalanceSheetReturn.
  Set in each catch block. BalanceSheetManager renders it via existing
  `<Alert>`. Kills silent-failure pattern at use-balance-sheet.ts:82.
- [ ] **WEALTH-10:** Wrap importAllData in `db.transaction('rw', [...allTables],
  async () => {...})`. Test partial-failure rollback by injecting a bulkAdd
  failure and asserting all tables remain empty.
- [ ] **WEALTH-TEST-1:** Full branch tests for lib/net-worth.ts (~12-15 cases).
  `__tests__/unit/lib/net-worth.test.ts`. Covers empty/assets-only/
  liabilities-only/mixed/archived-excluded/no-balance-entry/div-by-zero/
  negative-previous branches.
- [ ] **WEALTH-TEST-2:** Hook tests for useBalanceSheet via renderHook +
  fake-indexeddb. Covers: initial load, load failure → error surfaced,
  addAccount with/without initialBalance, mutation failure → error
  surfaced, archive excludes from currentNetWorth, takeSnapshot writes.
- [ ] **WEALTH-TEST-3:** Component tests for NetWorthSummary — empty /
  positive net worth / negative net worth / change-indicator present vs
  absent. `__tests__/component/NetWorthSummary.test.tsx`. Pure view, no
  Radix Dialog → jsdom-friendly.
- [ ] **WEALTH-TEST-4:** Extend db.test.ts for new snapshot dedupe (local-day
  boundary, indexed query) and import-rollback test.
- [ ] **WEALTH-REVIEW:** After WEALTH-1 lands, re-measure
  BalanceSheetManager.tsx LOC. If >500 or still mixes 3 forms, extract
  AddAccountForm / UpdateBalanceForm / BalanceHistoryList as siblings.

### Deferred (not blocking wealth)

- [ ] **TODO-MIGRATE-FORMAT:** Migrate 17 remaining components to
  `lib/format.ts` helpers.
  - **Why:** DRY, consistent locale/currency, single bug-fix point when
    multi-currency eventually lands.
  - **Sites:** TransactionsTable, TransactionHistoryBuilder, ComparisonView,
    CategoryBreakdown, MonthlyTrends, BudgetManager, TopExpenses,
    SpendingForecast, SavedAnalyses, RecurringTransactions, MemberManager,
    MemberDetails, MemberBreakdown, ExpenseSummary, CategoryDetails,
    BudgetOverview. (InvestmentsSummary deleted per WEALTH-4.)
  - **Depends on:** WEALTH-5 landing the helper.
  - **Approach:** migrate lazily as files are edited, OR bulk in one PR.

- [ ] **TODO-GOD-FILES:** Decompose 5 oversized components.
  - **Why:** all cross the 100-line/function limit; mix UI + business
    logic. Hard to test. Listed by worst-first.
  - **Targets:** CategoryManager (985) → 4 sub-components along tab lines;
    MonthlyTrends (757) → extract chart-data aggregation
    (components/MonthlyTrends.tsx:273-387, 115-line function) + zoom
    state machine; TransactionsTable (622) → pagination helper hook;
    ComparisonView (615); MemberManager (611).
  - **Context:** prior review (2026-03-22) split page.tsx using the same
    pattern. One per week is sustainable.
  - **Depends on:** nothing.

- [ ] **TODO-HOOK-TESTS:** Add renderHook + fake-indexeddb tests for the 4
  untested expense-side hooks.
  - **Targets:** useExpenseAnalysis (323 LOC), usePersistedData (169),
    useCategoryConfig (135), useDashboardLayout (150). Total 780 LOC, 0
    coverage.
  - **Why:** testing non-negotiable; state orchestration is exactly where
    persistence bugs hide.
  - **Context:** vitest.setup.ts already has fake-indexeddb, ResizeObserver,
    matchMedia stubs. WEALTH-TEST-2 establishes the reference pattern.
  - **Depends on:** WEALTH-TEST-2 (for template).

- [ ] **TODO-GITIGNORE-GSTACK:** Add `.gstack/` to .gitignore, remove
  current qa-reports/ from working tree.
  - **Why:** browser-test artifacts should not show in git status as
    "untracked abandoned." One-line change.
  - **Depends on:** nothing.

- [ ] **TODO-COMPONENT-TESTS:** Triage + test the 50 untested components.
  - **Why:** 4% component coverage is too much blind spot.
  - **Approach:** categorize each into (a) stateful & jsdom-friendly →
    add unit test, (b) Radix-Dialog-using → cover via /qa only, (c)
    pure presentational (shadcn wrappers, dumb cards) → skip.
  - **Context:** existing FileUpload.test.tsx, SavedAnalyses.test.tsx are
    the templates. Current pattern defers TransactionsTable to /qa.
  - **Depends on:** nothing.

- [ ] **TODO-DB-TEST-REWRITE:** Rewrite db.test.ts (675 LOC) over real-Dexie
  + fake-indexeddb.
  - **Why:** current tests are implementation-mocking (break on schema
    changes, miss real integration bugs). fake-indexeddb is already
    globally configured in vitest.setup.ts.
  - **Context:** this is testing-behavior-not-implementation per
    project standards. One-time rewrite.
  - **Depends on:** nothing; but best done after all wealth db work
    lands so the new surface is covered too.

- [ ] **TODO-UNIFIED-FINANCIAL-HEALTH:** Build a widget that joins expense
  forecast with net-worth trajectory.
  - **Why:** the actual user goal ("track expenses AND wealth"). Currently
    the two halves show side-by-side but don't tell a combined story.
  - **Shape:** monthly savings rate = income − expenses (from analyzer);
    net-worth delta = savings + investment returns (from snapshots
    compared month-over-month); chart both lines.
  - **Dependencies:** wealth PR landed; enough balanceEntry history to
    compute monthly trajectory; probably requires separating income from
    expenses in analyzer (today: all transactions are "expenses" in
    analyzer's mental model — income goes where?).
  - **Product question to answer before building:** how does income enter
    the system? UBS CSVs include credits but current analyzer treats
    them as categorized "other." Need an explicit income channel.

- [ ] **TODO-PERSIST-PATTERN:** Document and normalize hook mutation
  patterns.
  - **Why:** audit flagged 3 different patterns across 7 hooks
    (debounced save, per-mutation save, auto-snapshot). New hooks drift
    further without a canonical reference.
  - **Reference pattern (post-WEALTH-9):** useBalanceSheet. Expose
    `error: string | null`; catches set it; no silent console.error.
  - **Migration targets:** usePersistedData (use-persisted-data.ts:69,79
    swallow errors), useCategoryConfig (same), useExpenseAnalysis.
  - **Depends on:** WEALTH-9.

## Completed

### 2026-03-22 eng review cycle

- [x] **TODO 1:** Extract custom hooks from page.tsx (useExpenseAnalysis,
  useDashboardLayout, usePersistedData). page.tsx: 717 → 458 lines.
- [x] **TODO 2:** Refactor categorizeTransaction to data-driven rules.
  357-line if-else chain → 30-line loop + rules in categorization-rules.ts.
- [x] **TODO 3:** Add category field to Transaction type. Computed once in
  analyzeExpenses, all consumers updated to use tx.category with fallback.
- [x] **TODO 4:** Add comprehensive categorization tests. 117 new test cases
  covering all 19 categories (sector, partial sector, booking text, priority).
- [x] **TODO 5:** DRY fixes — shared CSV row builder, parameterized date
  parser, generic singleton helpers in db.ts.
- [x] **TODO 6:** Add pagination to TransactionsTable (50 rows/page).
- [x] **TODO 7:** Add component tests — FileUpload (5 tests) and
  SavedAnalyses (7 tests). TransactionsTable deferred due to Radix Dialog
  jsdom incompatibility (tested via QA browser tests instead).
- [x] Fixed "Saved Analyses" dialog not opening from More dropdown
  (Radix DropdownMenuItem onClick → onSelect with preventDefault).
