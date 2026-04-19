export type WidgetId =
  | 'expense-summary'
  | 'budget-overview'
  | 'net-worth-summary'
  | 'net-worth-trend'
  | 'category-breakdown'
  | 'monthly-trends'
  | 'spending-forecast'
  | 'recurring-transactions'
  | 'top-expenses'
  | 'member-breakdown'

export interface WidgetConfig {
  id: WidgetId
  label: string
  visible: boolean
  size: 'full' | 'half'
}

export interface DashboardLayout {
  id?: number
  widgets: WidgetConfig[]
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'expense-summary', label: 'Financial Overview', visible: true, size: 'half' },
  { id: 'budget-overview', label: 'Monthly Budgets', visible: true, size: 'half' },
  { id: 'net-worth-summary', label: 'Net Worth', visible: true, size: 'half' },
  { id: 'net-worth-trend', label: 'Net Worth Trend', visible: true, size: 'full' },
  { id: 'category-breakdown', label: 'Spending by Category', visible: true, size: 'full' },
  { id: 'monthly-trends', label: 'Spending Trends', visible: true, size: 'full' },
  { id: 'spending-forecast', label: 'Spending Forecast', visible: true, size: 'full' },
  { id: 'recurring-transactions', label: 'Recurring Transactions', visible: true, size: 'full' },
  { id: 'top-expenses', label: 'Top 10 Expenses', visible: true, size: 'full' },
  { id: 'member-breakdown', label: 'Member Breakdown', visible: true, size: 'full' },
]

export const DEFAULT_SIZES: Record<WidgetId, 'full' | 'half'> = {
  'expense-summary': 'half',
  'budget-overview': 'half',
  'net-worth-summary': 'half',
  'net-worth-trend': 'full',
  'category-breakdown': 'full',
  'monthly-trends': 'full',
  'spending-forecast': 'full',
  'recurring-transactions': 'full',
  'top-expenses': 'full',
  'member-breakdown': 'full',
}
