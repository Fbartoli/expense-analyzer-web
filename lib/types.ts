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
