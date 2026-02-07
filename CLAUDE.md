# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Privacy-first expense analyzer that runs entirely in the browser. Parses UBS bank statement and credit card CSV files (Swiss formats), categorizes transactions into 19 categories, and provides budgeting, forecasting, and recurring transaction detection. All data stays local in IndexedDB — no servers, no tracking.

## Commands

```bash
npm run dev              # Start dev server on port 3010
npm run build            # Production build
npm run lint             # ESLint (max 10 warnings allowed)
npm run lint:fix         # ESLint with auto-fix
npm run format           # Prettier write
npm run format:check     # Prettier check
npm run typecheck        # tsc --noEmit
npm run test             # Vitest in watch mode
npm run test:run         # Vitest single run
npm run test:coverage    # Vitest with v8 coverage
npm run validate         # typecheck + lint + test:run (full CI check locally)

# Run a single test file
npx vitest run __tests__/unit/lib/parser.test.ts

# Run tests matching a pattern
npx vitest run -t "parseCSV"
```

## Architecture

**Single-page client-side app** built with Next.js App Router. The entire app is one `'use client'` page (`app/page.tsx`) with all state managed via `useState`/`useCallback` in the root `Home` component. No server components are used for data fetching.

### Data Flow

1. CSV upload → `lib/parser.ts` (auto-detects credit card vs bank statement format, Swiss date/number formats, delimiter)
2. Parsing → `lib/analyzer.ts` (categorizes transactions via sector + keyword matching into 19 categories, produces `ExpenseReport`)
3. Report rendered across dashboard widget components
4. Persisted to IndexedDB via Dexie.js (`lib/db.ts`, 4 tables: analyses, budgets, chartPreferences, dashboardLayout)
5. Encrypted backup/restore via AES-256-GCM (`lib/crypto.ts`)

### Key Modules

- **`lib/parser.ts`** — Two CSV formats: UBS credit card (`;`-delimited, `DD.MM.YYYY` dates, Swiss number format `1'234.56`) and UBS bank statement (ISO dates, metadata header rows, negative debits)
- **`lib/analyzer.ts`** — Transaction categorization (19 categories), expense analysis, budget status calculation (`healthy`/`early`/`warning`/`over`)
- **`lib/forecast.ts`** — Weighted moving average spending forecast with trend calculation and per-category breakdown
- **`lib/recurring.ts`** — Recurring transaction detection (weekly/monthly/quarterly) with merchant normalization and price change tracking
- **`lib/db.ts`** — All IndexedDB CRUD via Dexie.js, backup/restore (format version 2)
- **`lib/types.ts`** — Core interfaces: `Transaction`, `ExpenseReport`, `CategorySummary`, `MonthlyAnalysis`, `Budget`, `BudgetWithSpending`

### Components

- `components/ui/` — shadcn/ui primitives (new-york style, Radix-based)
- `components/*.tsx` — Business components, all `'use client'`, function components with typed props
- Dashboard widgets are configurable (visibility, order, size) via `DashboardCustomizer` with `@dnd-kit` drag-and-drop, layout persisted to IndexedDB

## Code Conventions

- **No semicolons**, single quotes, 100-char line width, trailing commas (Prettier)
- **Path alias:** `@/*` maps to project root (e.g., `@/lib/parser`, `@/components/ui/button`)
- **Named exports** for all components and functions (default exports only for Next.js pages/layouts)
- **Unused variables** prefixed with `_` (configured in ESLint)
- **Currency formatting:** `Intl.NumberFormat('en-CH', { style: 'currency', currency: 'CHF' })` throughout
- **`no-console`** rule: `console.warn` and `console.error` allowed, `console.log` warns
- **PascalCase** for component files, **camelCase** for lib files

## Testing

Vitest with jsdom environment. Tests are unit tests for `lib/` modules only (no component tests). Test timeout: 10s. Coverage target: 80%.

- **Setup (`vitest.setup.ts`):** `@testing-library/jest-dom` matchers, `fake-indexeddb/auto` for IndexedDB, stubs for `ResizeObserver`/`matchMedia`/`URL.createObjectURL`
- **Fixtures:** `__tests__/fixtures/transactions.ts` has factory functions (`createMockTransaction`, `createMockBudget`, `createMockReport`) with partial override pattern
- **CSV fixtures:** `__tests__/fixtures/csv-samples.ts` has sample strings for both formats
- **File mocks:** `test-utils/mock-file.ts` has `createMockFile`, `createMockCSVFile`, `createMockJSONFile`

## Git Hooks

- **Pre-commit:** lint-staged runs ESLint fix + Prettier on staged `.ts`/`.tsx` files
- **Pre-push:** typecheck + test:run must pass
