import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import type { Transaction, ExpenseReport, CategorySummary, MonthlyAnalysis, Budget, BudgetWithSpending, BudgetStatus } from './types'

export interface TransactionWithCategory extends Transaction {
  manualCategory?: string
}

// Sector-to-category mapping (exact matches)
const SECTOR_CATEGORY_MAP: { [key: string]: string } = {
  // Restaurants & Dining
  'Restaurants': 'Restaurants & Dining',
  'Fast-Food Restaurants': 'Restaurants & Dining',
  'Fast Food Restaurant': 'Restaurants & Dining',
  'Bakeries': 'Restaurants & Dining',
  'Delivery': 'Restaurants & Dining',
  'Caterers': 'Restaurants & Dining',
  
  // Travel
  'Hotels': 'Travel & Accommodation',
  'Hotel Indigo': 'Travel & Accommodation',
  'Travel agencies': 'Travel & Accommodation',
  'Surcharge abroad': 'Travel & Accommodation',
  'Airlines': 'Travel & Accommodation',
  'Cathay': 'Travel & Accommodation',
  'Swiss International Air Lines': 'Travel & Accommodation',
  'United': 'Travel & Accommodation',
  'Rent-a-car': 'Travel & Accommodation',
  'Car Rental Company': 'Travel & Accommodation',
  'Duty free shop': 'Travel & Accommodation',
  
  // Groceries
  'Grocery stores': 'Groceries',
  'Supermarkets': 'Groceries',
  
  // Transportation
  'Commuter transportation': 'Transportation',
  'Public transport': 'Transportation',
  'Taxi services': 'Transportation',
  'Taxicabs': 'Transportation',
  'Parking': 'Transportation',
  'UBER': 'Transportation',
  'Passenger railways': 'Transportation',
  'Gasoline service stations': 'Fuel',
  
  // Shopping
  'Clothing store': 'Shopping',
  'Clothing - sports': 'Shopping',
  'Cosmetic stores': 'Shopping',
  'Department stores': 'Shopping',
  'Retail stores': 'Shopping',
  'Retail business': 'Shopping',
  'Catalog Merchant': 'Shopping',
  'Bike': 'Shopping',
  'Books': 'Shopping',
  'Book stores': 'Shopping',
  'Electronics Stores': 'Shopping',
  'Leather goods': 'Shopping',
  'Shoe stores': 'Shopping',
  'Florists': 'Shopping',
  'Precious metals, Metals, Watches and Jewelry (B2B)': 'Shopping',
  
  // Health & Beauty
  'Pharmacies': 'Health & Beauty',
  'Barber or beauty shops': 'Health & Beauty',
  'Healthcare': 'Health & Beauty',
  'Medical services': 'Health & Beauty',
  'Doctors and Physicians': 'Health & Beauty',
  'Optician': 'Health & Beauty',
  'Wellness': 'Health & Beauty',
  
  // Digital Services
  'Digital goods': 'Digital Services',
  'Subscriptions': 'Digital Services',
  'Online services': 'Digital Services',
  'Software': 'Digital Services',
  'Computer software stores': 'Digital Services',
  'Telegraph services': 'Digital Services',
  'Data processing services': 'Digital Services',
  
  // Insurance & Financial
  'Direct marketing insurance services': 'Insurance & Financial',
  'Insurance': 'Insurance & Financial',
  'Financial services': 'Insurance & Financial',
  'Banking fees': 'Insurance & Financial',
  'Bank interest': 'Insurance & Financial',
  
  // Entertainment
  'Cinema': 'Entertainment',
  
  // Professional Services
  'Repair Shops': 'Professional Services',
  'Government Services': 'Government & Taxes',
  'Advertising services': 'Professional Services',
  'Business services': 'Professional Services',
  'Professional Services - Not Elsewhere Classified': 'Professional Services',
}

export function categorizeTransaction(transaction: Transaction | TransactionWithCategory): string {
  // Check for manual category override first
  if ('manualCategory' in transaction && transaction.manualCategory) {
    return transaction.manualCategory
  }
  
  const text = transaction.bookingText.toLowerCase()
  const sector = transaction.sector.trim()
  const upperText = transaction.bookingText.toUpperCase()
  const upperSector = sector.toUpperCase()
  
  // Check for crypto investments (special case)
  if (upperText.includes('COINBASE') || upperText.includes('KRAKEN') || upperText.includes('BINANCE')) {
    return 'Crypto & Investments'
  }
  
  // Try exact sector match first (most accurate)
  if (SECTOR_CATEGORY_MAP[sector]) {
    return SECTOR_CATEGORY_MAP[sector]
  }
  
  // Check for Uber Eats before Uber Transportation
  if (text.includes('uber eats') || text.includes('ubereats')) {
    return 'Restaurants & Dining'
  }
  
  // Check for food delivery services
  if (text.includes('deliveroo') || text.includes('just eat') || text.includes('doordash') || text.includes('eat.ch')) {
    return 'Restaurants & Dining'
  }
  
  // Check for hotel bookings
  if (text.includes('booking.com') || text.includes('airbnb') || text.includes('hotels.com') || text.includes('expedia')) {
    return 'Travel & Accommodation'
  }
  
  // Check sector partial matches for common patterns
  if (upperSector.includes('SURCHARGE ABROAD')) {
    return 'Travel & Accommodation'
  }
  
  if (upperSector.includes('COM/BILL') || upperSector.includes('APPLE') || upperSector.includes('ITUNES')) {
    return 'Digital Services'
  }
  
  if (upperSector.includes('RESTAURANT') || upperSector.includes('FOOD')) {
    return 'Restaurants & Dining'
  }
  
  if (upperSector.includes('GROCERY') || upperSector.includes('SUPERMARKET')) {
    return 'Groceries'
  }
  
  if (upperSector.includes('TRANSPORT') || upperSector.includes('TAXI')) {
    return 'Transportation'
  }
  
  if (upperSector.includes('HOTEL') || upperSector.includes('AIRLINE')) {
    return 'Travel & Accommodation'
  }
  
  // Entertainment check (before Shopping to catch entertainment stores)
  if (upperSector.includes('ENTERTAINMENT') || 
      upperSector.includes('CINEMA') || 
      upperSector.includes('THEATER') || 
      upperSector.includes('CONCERT') ||
      upperSector.includes('STREAMING') ||
      upperSector.includes('GAMING') ||
      upperSector.includes('MOVIE')) {
    return 'Entertainment'
  }
  
  if (upperSector.includes('SHOP') || upperSector.includes('RETAIL') || upperSector.includes('STORE')) {
    return 'Shopping'
  }
  
  if (upperSector.includes('HEALTH') || upperSector.includes('MEDICAL') || upperSector.includes('PHARMA')) {
    return 'Health & Beauty'
  }
  
  if (upperSector.includes('INSURANCE')) {
    return 'Insurance & Financial'
  }
  
  // Specific booking text patterns (only as fallback)
  if (text.includes('swisscom') || text.includes('sunrise') || text.includes('salt')) {
    return 'Utilities & Telecom'
  }
  
  // Entertainment keywords (check before Digital Services)
  if (text.includes('cinema') || 
      text.includes('movie') || 
      text.includes('theatre') || 
      text.includes('theater') ||
      text.includes('concert') ||
      text.includes('festival') ||
      text.includes('event') ||
      text.includes('ticket') ||
      text.includes('show') ||
      text.includes('game store') ||
      text.includes('steam') ||
      text.includes('playstation') ||
      text.includes('xbox') ||
      text.includes('nintendo')) {
    return 'Entertainment'
  }
  
  // Digital Services/Subscriptions
  if (text.includes('spotify') || 
      text.includes('netflix') || 
      text.includes('youtube premium') || 
      text.includes('youtube music') ||
      text.includes('disney+') || 
      text.includes('hbo') ||
      text.includes('prime video') ||
      text.includes('apple music') ||
      text.includes('soundcloud')) {
    return 'Entertainment'
  }
  
  if (text.includes('gym') || text.includes('fitness')) {
    return 'Fitness & Sports'
  }
  
  // QR payments and generic transactions
  if (upperSector.includes('QR PAYMENT') || sector === 'A' || sector === '') {
    return 'Other'
  }
  
  // If we get here, it's truly uncategorized
  return 'Other'
}

export function analyzeExpenses(transactions: Transaction[], categoryOverrides?: Map<number, string>): ExpenseReport {
  // Apply category overrides if provided
  const transactionsWithOverrides = categoryOverrides 
    ? transactions.map((t, idx) => ({
        ...t,
        manualCategory: categoryOverrides.get(idx)
      } as TransactionWithCategory))
    : transactions

  const expenses = transactionsWithOverrides.filter((t) => (t.debit || 0) > 0)
  const income = transactionsWithOverrides.filter((t) => (t.credit || 0) > 0)

  const totalSpent = expenses.reduce((sum, t) => sum + (t.debit || 0), 0)
  const totalIncome = income.reduce((sum, t) => sum + (t.credit || 0), 0)

  const categoryMap = new Map<string, Transaction[]>()
  expenses.forEach((transaction) => {
    const category = categorizeTransaction(transaction)
    if (!categoryMap.has(category)) {
      categoryMap.set(category, [])
    }
    // Store original transaction without override
    const originalTx = transactions[transactionsWithOverrides.indexOf(transaction)]
    categoryMap.get(category)!.push(originalTx)
  })

  const categorySummaries: CategorySummary[] = Array.from(categoryMap.entries())
    .map(([category, txns]) => {
      const categoryTotalSpent = txns.reduce((sum, t) => sum + (t.debit || 0), 0)
      return {
        category,
        totalSpent: categoryTotalSpent,
        count: txns.length,
        percentage: (categoryTotalSpent / (categoryTotalSpent > 0 ? categoryTotalSpent : 1)) * 100,
        averageTransaction: categoryTotalSpent / txns.length,
        transactions: txns,
      }
    })
    .sort((a, b) => b.totalSpent - a.totalSpent)

  const totalCategorySpent = categorySummaries.reduce((sum, c) => sum + c.totalSpent, 0)
  categorySummaries.forEach((cat) => {
    cat.percentage = totalCategorySpent > 0 ? (cat.totalSpent / totalCategorySpent) * 100 : 0
  })

  const monthlyMap = new Map<string, Transaction[]>()
  transactionsWithOverrides.forEach((transaction, idx) => {
    try {
      if (!transaction.purchaseDate || isNaN(transaction.purchaseDate.getTime())) {
        return
      }
      const monthKey = format(transaction.purchaseDate, 'yyyy-MM')
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, [])
      }
      // Store original transaction
      const originalTx = transactions[idx]
      monthlyMap.get(monthKey)!.push(originalTx)
    } catch (error) {
      console.warn('Invalid date for transaction:', transaction)
    }
  })

  const monthlyAnalysis: MonthlyAnalysis[] = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0])) // Sort by yyyy-MM key (chronological)
    .map(([monthKey, txns]) => {
      const spent = txns
        .filter((t) => (t.debit || 0) > 0)
        .reduce((sum, t) => sum + (t.debit || 0), 0)
      const income = txns
        .filter((t) => (t.credit || 0) > 0)
        .reduce((sum, t) => sum + (t.credit || 0), 0)

      return {
        month: format(new Date(monthKey + '-01'), 'MMM yyyy'),
        monthKey, // yyyy-MM format for sorting
        totalSpent: spent,
        totalIncome: income,
        netFlow: income - spent,
        transactionCount: txns.length,
      }
    })

  const topExpenses = [...expenses]
    .sort((a, b) => (b.debit || 0) - (a.debit || 0))
    .slice(0, 10)

  const dates = transactionsWithOverrides
    .map((t) => t.purchaseDate)
    .filter((d) => d && !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())

  return {
    totalSpent,
    totalIncome,
    netBalance: totalIncome - totalSpent,
    transactionCount: transactions.length,
    dateRange: {
      start: dates.length > 0 ? dates[0] : new Date(),
      end: dates.length > 0 ? dates[dates.length - 1] : new Date(),
    },
    categorySummaries,
    monthlyAnalysis,
    topExpenses,
    largestCategory: categorySummaries[0] || null,
  }
}

/**
 * Calculate budget status by comparing budgets against actual spending
 */
export function calculateBudgetStatus(
  transactions: Transaction[],
  budgets: Budget[],
  month?: Date
): BudgetWithSpending[] {
  if (budgets.length === 0) return []

  // Default to current month if not specified
  const targetMonth = month || new Date()
  const monthStart = startOfMonth(targetMonth)
  const monthEnd = endOfMonth(targetMonth)

  // Filter transactions to the target month
  const monthTransactions = transactions.filter(t => {
    const date = new Date(t.purchaseDate)
    if (isNaN(date.getTime())) return false
    return isWithinInterval(date, { start: monthStart, end: monthEnd })
  })

  // Calculate spending by category
  const categorySpending = new Map<string, number>()
  monthTransactions.forEach(t => {
    if ((t.debit || 0) > 0) {
      const category = categorizeTransaction(t)
      categorySpending.set(category, (categorySpending.get(category) || 0) + (t.debit || 0))
    }
  })

  // Calculate budget status for each budget
  return budgets.map(budget => {
    const spent = categorySpending.get(budget.category) || 0
    const remaining = budget.amount - spent
    const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

    let status: BudgetStatus
    if (percentUsed > 100) {
      status = 'over'
    } else if (percentUsed >= 75) {
      status = 'warning'
    } else if (percentUsed >= 50) {
      status = 'early'
    } else {
      status = 'healthy'
    }

    return {
      budget,
      spent,
      remaining,
      percentUsed,
      status
    }
  }).sort((a, b) => b.percentUsed - a.percentUsed) // Sort by most used first
}
