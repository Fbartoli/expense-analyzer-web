export interface Transaction {
  accountNumber: string
  cardNumber: string
  accountHolder: string
  purchaseDate: Date
  bookingText: string
  sector: string
  amount: number
  originalCurrency: string
  rate: number | null
  currency: string
  debit: number | null
  credit: number | null
  bookedDate: Date
  category?: string
}

export interface CategorySummary {
  category: string
  totalSpent: number
  count: number
  percentage: number
  averageTransaction: number
  transactions: Transaction[]
}

export interface MonthlyAnalysis {
  month: string
  monthKey: string // yyyy-MM format for sorting
  totalSpent: number
  totalIncome: number
  netFlow: number
  transactionCount: number
}

export interface ExpenseReport {
  totalSpent: number
  totalIncome: number
  netBalance: number
  transactionCount: number
  dateRange: {
    start: Date
    end: Date
  }
  categorySummaries: CategorySummary[]
  monthlyAnalysis: MonthlyAnalysis[]
  topExpenses: Transaction[]
  largestCategory: CategorySummary | null
  /** Transactions with category field stamped from analysis */
  categorizedTransactions?: Transaction[]
}

// Budget types
export interface Budget {
  id?: number
  category: string
  amount: number
  createdDate: Date
}

export type BudgetStatus = 'healthy' | 'early' | 'warning' | 'over'

export interface BudgetWithSpending {
  budget: Budget
  spent: number
  remaining: number
  percentUsed: number
  status: BudgetStatus
}

// Household member types
export interface HouseholdMember {
  id?: number
  name: string
  cardNumbers: string[]
  color: string
}

export interface MemberSummary {
  memberName: string
  total: number
  count: number
  percentage: number
  color: string
  transactions: Transaction[]
}

// Custom category config types
export interface CustomCategory {
  id?: number
  type: 'custom'
  name: string
  color: string
  keywords: string[]
}

export interface CategoryAlias {
  id?: number
  type: 'alias'
  from: string
  to: string
}

export type CategoryConfigRecord = CustomCategory | CategoryAlias

export interface ManualRecurringTransaction {
  id?: number
  fingerprint: string
  merchantName: string
  bookingText: string
  category: string
  frequency: 'weekly' | 'monthly' | 'quarterly'
  amount: number
  currency: string
  createdDate: Date
}

// Balance sheet types
export type AccountType = 'asset' | 'liability'

export type AccountCategory =
  | 'cash'
  | 'checking'
  | 'savings'
  | 'investment'
  | 'property'
  | 'vehicle'
  | 'other-asset'
  | 'credit-card'
  | 'loan'
  | 'mortgage'
  | 'student-loan'
  | 'other-liability'

export interface Account {
  id?: number
  name: string
  type: AccountType
  category: AccountCategory
  currency: string
  notes: string
  createdDate: Date
  archived: boolean
  memberId?: number
}

/** An Account returned from the DB — id is guaranteed present. */
export type PersistedAccount = Account & { id: number }

export interface BalanceEntry {
  id?: number
  accountId: number
  amount: number
  date: Date
  notes: string
}

export interface NetWorthSnapshot {
  id?: number
  date: Date
  totalAssets: number
  totalLiabilities: number
  netWorth: number
  accountBalances: Array<{
    accountId: number
    accountName: string
    type: AccountType
    amount: number
  }>
}
