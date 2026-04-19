import { describe, it, expect } from 'vitest'
import { categorizeTransaction, analyzeExpenses, calculateBudgetStatus } from '@/lib/analyzer'
import { createMockTransaction, createMockBudget } from '../../fixtures/transactions'

describe('analyzer', () => {
  describe('categorizeTransaction', () => {
    describe('sector-based categorization', () => {
      it('should categorize Restaurants sector', () => {
        const tx = createMockTransaction({ sector: 'Restaurants' })
        expect(categorizeTransaction(tx)).toBe('Restaurants & Dining')
      })

      it('should categorize Fast-Food Restaurants sector', () => {
        const tx = createMockTransaction({ sector: 'Fast-Food Restaurants' })
        expect(categorizeTransaction(tx)).toBe('Restaurants & Dining')
      })

      it('should categorize Hotels sector', () => {
        const tx = createMockTransaction({ sector: 'Hotels' })
        expect(categorizeTransaction(tx)).toBe('Travel & Accommodation')
      })

      it('should categorize Grocery stores sector', () => {
        const tx = createMockTransaction({ sector: 'Grocery stores' })
        expect(categorizeTransaction(tx)).toBe('Groceries')
      })

      it('should categorize Commuter transportation sector', () => {
        const tx = createMockTransaction({ sector: 'Commuter transportation' })
        expect(categorizeTransaction(tx)).toBe('Transportation')
      })

      it('should categorize Pharmacies sector', () => {
        const tx = createMockTransaction({ sector: 'Pharmacies' })
        expect(categorizeTransaction(tx)).toBe('Health & Beauty')
      })
    })

    describe('booking text-based categorization', () => {
      it('should categorize Uber Eats as dining', () => {
        const tx = createMockTransaction({
          bookingText: 'UBER EATS Amsterdam',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Restaurants & Dining')
      })

      it('should categorize Deliveroo as dining', () => {
        const tx = createMockTransaction({
          bookingText: 'Deliveroo Order',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Restaurants & Dining')
      })

      it('should categorize booking.com as travel', () => {
        const tx = createMockTransaction({
          bookingText: 'BOOKING.COM Hotel Reservation',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Travel & Accommodation')
      })

      it('should categorize Netflix as entertainment', () => {
        const tx = createMockTransaction({
          bookingText: 'NETFLIX.COM Monthly',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Entertainment')
      })

      it('should categorize Spotify as entertainment', () => {
        const tx = createMockTransaction({
          bookingText: 'SPOTIFY Premium',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Entertainment')
      })

      it('should categorize Coinbase as crypto', () => {
        const tx = createMockTransaction({
          bookingText: 'COINBASE Purchase',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Crypto & Investments')
      })

      it('should categorize gym as fitness', () => {
        const tx = createMockTransaction({
          bookingText: 'GYM MEMBERSHIP Monthly',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Fitness & Sports')
      })
    })

    describe('manual category override', () => {
      it('should respect manual category override', () => {
        const tx = {
          ...createMockTransaction({ sector: 'Restaurants' }),
          manualCategory: 'Entertainment',
        }
        expect(categorizeTransaction(tx)).toBe('Entertainment')
      })
    })

    describe('fallback categorization', () => {
      it('should return Other for unrecognized transactions', () => {
        const tx = createMockTransaction({
          sector: 'Unknown Sector XYZ',
          bookingText: 'Random Unknown Merchant',
        })
        expect(categorizeTransaction(tx)).toBe('Other')
      })

      it('should return Other for QR PAYMENT sector', () => {
        const tx = createMockTransaction({
          sector: 'QR PAYMENT',
          bookingText: 'Some payment',
        })
        expect(categorizeTransaction(tx)).toBe('Other')
      })

      it('should return Other for empty sector', () => {
        const tx = createMockTransaction({
          sector: '',
          bookingText: 'Unknown thing 12345',
        })
        expect(categorizeTransaction(tx)).toBe('Other')
      })
    })

    describe('all categories — exact sector matches', () => {
      it.each([
        ['Restaurants', 'Restaurants & Dining'],
        ['Fast-Food Restaurants', 'Restaurants & Dining'],
        ['Fast Food Restaurant', 'Restaurants & Dining'],
        ['Bakeries', 'Restaurants & Dining'],
        ['Delivery', 'Restaurants & Dining'],
        ['Caterers', 'Restaurants & Dining'],
        ['Hotels', 'Travel & Accommodation'],
        ['Travel agencies', 'Travel & Accommodation'],
        ['Airlines', 'Travel & Accommodation'],
        ['Rent-a-car', 'Travel & Accommodation'],
        ['Surcharge abroad', 'Travel & Accommodation'],
        ['Grocery stores', 'Groceries'],
        ['Supermarkets', 'Groceries'],
        ['Commuter transportation', 'Transportation'],
        ['Public transport', 'Transportation'],
        ['Taxi services', 'Transportation'],
        ['Parking', 'Transportation'],
        ['UBER', 'Transportation'],
        ['Gasoline service stations', 'Fuel'],
        ['Clothing store', 'Shopping'],
        ['Department stores', 'Shopping'],
        ['Electronics Stores', 'Shopping'],
        ['Book stores', 'Shopping'],
        ['Pharmacies', 'Health & Beauty'],
        ['Barber or beauty shops', 'Health & Beauty'],
        ['Healthcare', 'Health & Beauty'],
        ['Doctors and Physicians', 'Health & Beauty'],
        ['Digital goods', 'Digital Services'],
        ['Subscriptions', 'Digital Services'],
        ['Software', 'Digital Services'],
        ['Data processing services', 'Digital Services'],
        ['Insurance', 'Insurance & Financial'],
        ['Financial services', 'Insurance & Financial'],
        ['Banking fees', 'Insurance & Financial'],
        ['Cinema', 'Entertainment'],
        ['Repair Shops', 'Professional Services'],
        ['Government Services', 'Government & Taxes'],
        ['Advertising services', 'Professional Services'],
      ])('sector "%s" → %s', (sector, expected) => {
        const tx = createMockTransaction({
          sector,
          bookingText: 'Generic merchant',
        })
        expect(categorizeTransaction(tx)).toBe(expected)
      })
    })

    describe('all categories — partial sector matches', () => {
      it.each([
        ['SURCHARGE ABROAD CHF', 'Travel & Accommodation'],
        ['COM/BILL PAYMENT', 'Digital Services'],
        ['APPLE STORE', 'Digital Services'],
        ['RESTAURANT LOCAL', 'Restaurants & Dining'],
        ['FOOD DELIVERY SVC', 'Restaurants & Dining'],
        ['GROCERY MARKET', 'Groceries'],
        ['SUPERMARKET CHAIN', 'Groceries'],
        ['TRANSPORT SERVICE', 'Transportation'],
        ['TAXI METER', 'Transportation'],
        ['HOTEL CHAIN', 'Travel & Accommodation'],
        ['AIRLINE TICKET', 'Travel & Accommodation'],
        ['ENTERTAINMENT VENUE', 'Entertainment'],
        ['CINEMA TICKET', 'Entertainment'],
        ['STREAMING SERVICE', 'Entertainment'],
        ['SHOPPING CENTER', 'Shopping'],
        ['RETAIL OUTLET', 'Shopping'],
        ['HEALTH CLINIC', 'Health & Beauty'],
        ['MEDICAL CENTER', 'Health & Beauty'],
        ['PHARMA DISTRIBUTOR', 'Health & Beauty'],
        ['INSURANCE CO', 'Insurance & Financial'],
      ])('sector containing "%s" → %s', (sector, expected) => {
        const tx = createMockTransaction({
          sector,
          bookingText: 'Generic merchant',
        })
        expect(categorizeTransaction(tx)).toBe(expected)
      })
    })

    describe('all categories — booking text keywords', () => {
      it.each([
        // Crypto & Investments (checked first)
        ['COINBASE Purchase', 'Crypto & Investments'],
        ['KRAKEN Exchange', 'Crypto & Investments'],
        ['BINANCE Trading', 'Crypto & Investments'],
        // Groceries — Swiss chains
        ['MIGROS Zurich', 'Groceries'],
        ['COOP City Basel', 'Groceries'],
        ['ALDI Suisse', 'Groceries'],
        ['LIDL Schweiz', 'Groceries'],
        ['DENNER Aktion', 'Groceries'],
        ['VOLG Dorfmarkt', 'Groceries'],
        // Restaurants & Dining
        ["McDonald's Airport", 'Restaurants & Dining'],
        ['STARBUCKS Coffee', 'Restaurants & Dining'],
        ['Pizzeria Napoli', 'Restaurants & Dining'],
        ['Bäckerei Schmid', 'Restaurants & Dining'],
        ['SV (Schweiz) AG Lunch', 'Restaurants & Dining'],
        // Transportation — Swiss transit
        ['SBB CFF FFS Ticket', 'Transportation'],
        ['ZVV Zurich', 'Transportation'],
        ['UBER Ride', 'Transportation'],
        ['Parking Sihlcity', 'Transportation'],
        ['BOLT Ride Basel', 'Transportation'],
        // Travel & Accommodation
        ['Hotel Schweizerhof', 'Travel & Accommodation'],
        ['AIRBNB Booking', 'Travel & Accommodation'],
        ['EASYJET Flight', 'Travel & Accommodation'],
        ['RYANAIR Ticket', 'Travel & Accommodation'],
        // Housing
        ['Immobilien Verwaltung', 'Housing'],
        ['Miete Wohnung', 'Housing'],
        ['Hypothek Zahlung', 'Housing'],
        // Insurance & Financial
        ['SANITAS Grundversicherung', 'Insurance & Financial'],
        ['SWICA Premium', 'Insurance & Financial'],
        ['HELSANA Zusatz', 'Insurance & Financial'],
        ['UBS Switzerland Card Center', 'Insurance & Financial'],
        ['REVOLUT Transfer', 'Insurance & Financial'],
        // Utilities & Telecom
        ['SWISSCOM Abo', 'Utilities & Telecom'],
        ['SUNRISE Mobile', 'Utilities & Telecom'],
        ['SALT Prepaid', 'Utilities & Telecom'],
        ['EWZ Strom', 'Utilities & Telecom'],
        // Fitness & Sports
        ['ACTIV FITNESS Monthly', 'Fitness & Sports'],
        ['UPDATE FITNESS Abo', 'Fitness & Sports'],
        ['Crossfit Box Zurich', 'Fitness & Sports'],
        ['Yoga Studio Basel', 'Fitness & Sports'],
        // Entertainment
        ['NETFLIX.COM Monthly', 'Entertainment'],
        ['SPOTIFY Premium', 'Entertainment'],
        ['KINO Rex Zurich', 'Entertainment'],
        ['DISNEY+ Streaming', 'Entertainment'],
        ['STEAM Game Purchase', 'Entertainment'],
        // Shopping
        ['IKEA Spreitenbach', 'Shopping'],
        ['DIGITEC Galaxus', 'Shopping'],
        ['MANOR Warenhaus', 'Shopping'],
        ['H&M Fashion', 'Shopping'],
        ['Media Markt Electronics', 'Shopping'],
        // Health & Beauty
        ['Apotheke Bahnhof', 'Health & Beauty'],
        ['Drogerie Mueller', 'Health & Beauty'],
        ['Zahnarzt Dr. Smith', 'Health & Beauty'],
        ['Optik Fielmann', 'Health & Beauty'],
      ])('text "%s" → %s', (bookingText, expected) => {
        const tx = createMockTransaction({
          bookingText,
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe(expected)
      })
    })

    describe('priority ordering', () => {
      it('should prioritize manual override over everything', () => {
        const tx = {
          ...createMockTransaction({
            sector: 'Restaurants',
            bookingText: 'COINBASE Payment',
          }),
          manualCategory: 'Shopping',
        }
        expect(categorizeTransaction(tx)).toBe('Shopping')
      })

      it('should prioritize crypto check over sector match', () => {
        const tx = createMockTransaction({
          sector: 'Digital goods',
          bookingText: 'COINBASE Purchase',
        })
        expect(categorizeTransaction(tx)).toBe('Crypto & Investments')
      })

      it('should prioritize exact sector over booking text', () => {
        const tx = createMockTransaction({
          sector: 'Restaurants',
          bookingText: 'MIGROS Restaurant Zurich',
        })
        expect(categorizeTransaction(tx)).toBe('Restaurants & Dining')
      })

      it('should categorize Uber Eats as dining not transport', () => {
        const tx = createMockTransaction({
          bookingText: 'UBER EATS Delivery',
          sector: 'Other',
        })
        expect(categorizeTransaction(tx)).toBe('Restaurants & Dining')
      })
    })
  })

  describe('categorizeTransaction with custom rules', () => {
    it('should match custom keyword rules after built-in', () => {
      const tx = createMockTransaction({
        bookingText: 'VETCLINIC Pet Care',
        sector: 'Other',
      })
      const customRules = [{ keywords: ['vetclinic', 'pet'], category: 'Pet Care' }]
      expect(categorizeTransaction(tx, customRules)).toBe('Pet Care')
    })

    it('should prefer built-in over custom rules', () => {
      const tx = createMockTransaction({
        bookingText: 'MIGROS Zurich',
        sector: 'Grocery stores',
      })
      const customRules = [{ keywords: ['migros'], category: 'Custom Groceries' }]
      // Built-in exact sector match wins
      expect(categorizeTransaction(tx, customRules)).toBe('Groceries')
    })

    it('should work without custom rules (backward compat)', () => {
      const tx = createMockTransaction({
        bookingText: 'Random',
        sector: 'Restaurants',
      })
      expect(categorizeTransaction(tx)).toBe('Restaurants & Dining')
    })
  })

  describe('analyzeExpenses with options', () => {
    it('should apply resolveCategory to all transactions', () => {
      const transactions = [
        createMockTransaction({ sector: 'Restaurants', debit: 50 }),
        createMockTransaction({ sector: 'Restaurants', debit: 30 }),
      ]
      const resolve = (raw: string) => (raw === 'Restaurants & Dining' ? 'Food & Dining' : raw)

      const report = analyzeExpenses(transactions, undefined, {
        resolveCategory: resolve,
      })

      expect(report.categorySummaries[0].category).toBe('Food & Dining')
    })

    it('should inject custom rules into categorization', () => {
      const transactions = [
        createMockTransaction({
          bookingText: 'VETCLINIC Visit',
          sector: 'Other',
          debit: 100,
        }),
      ]

      const report = analyzeExpenses(transactions, undefined, {
        customRules: [{ keywords: ['vetclinic'], category: 'Pet Care' }],
      })

      expect(report.categorySummaries[0].category).toBe('Pet Care')
    })
  })

  describe('analyzeExpenses', () => {
    it('should calculate total spent correctly', () => {
      const transactions = [
        createMockTransaction({ debit: 100, credit: null }),
        createMockTransaction({ debit: 50, credit: null }),
        createMockTransaction({ debit: null, credit: 200 }),
      ]

      const report = analyzeExpenses(transactions)

      expect(report.totalSpent).toBe(150)
      expect(report.totalIncome).toBe(200)
      expect(report.netBalance).toBe(50)
    })

    it('should count transactions correctly', () => {
      const transactions = [
        createMockTransaction(),
        createMockTransaction(),
        createMockTransaction(),
      ]

      const report = analyzeExpenses(transactions)

      expect(report.transactionCount).toBe(3)
    })

    it('should group by category correctly', () => {
      const transactions = [
        createMockTransaction({ sector: 'Restaurants', debit: 50 }),
        createMockTransaction({ sector: 'Restaurants', debit: 30 }),
        createMockTransaction({ sector: 'Grocery stores', debit: 100 }),
      ]

      const report = analyzeExpenses(transactions)

      const restaurantCategory = report.categorySummaries.find(
        (c) => c.category === 'Restaurants & Dining'
      )
      const groceryCategory = report.categorySummaries.find((c) => c.category === 'Groceries')

      expect(restaurantCategory?.totalSpent).toBe(80)
      expect(restaurantCategory?.count).toBe(2)
      expect(groceryCategory?.totalSpent).toBe(100)
      expect(groceryCategory?.count).toBe(1)
    })

    it('should sort categories by total spent descending', () => {
      const transactions = [
        createMockTransaction({ sector: 'Restaurants', debit: 50 }),
        createMockTransaction({ sector: 'Grocery stores', debit: 200 }),
        createMockTransaction({ sector: 'Hotels', debit: 100 }),
      ]

      const report = analyzeExpenses(transactions)

      expect(report.categorySummaries[0].category).toBe('Groceries')
      expect(report.categorySummaries[1].category).toBe('Travel & Accommodation')
      expect(report.categorySummaries[2].category).toBe('Restaurants & Dining')
    })

    it('should calculate monthly analysis correctly', () => {
      const transactions = [
        createMockTransaction({
          purchaseDate: new Date('2024-06-15'),
          debit: 100,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-06-20'),
          debit: 50,
        }),
        createMockTransaction({
          purchaseDate: new Date('2024-07-05'),
          debit: 75,
        }),
      ]

      const report = analyzeExpenses(transactions)

      expect(report.monthlyAnalysis).toHaveLength(2)
      const june = report.monthlyAnalysis.find((m) => m.monthKey === '2024-06')
      const july = report.monthlyAnalysis.find((m) => m.monthKey === '2024-07')

      expect(june?.totalSpent).toBe(150)
      expect(july?.totalSpent).toBe(75)
    })

    it('should return top 10 expenses sorted by amount', () => {
      const transactions = Array.from({ length: 15 }, (_, i) =>
        createMockTransaction({ debit: (i + 1) * 10 })
      )

      const report = analyzeExpenses(transactions)

      expect(report.topExpenses).toHaveLength(10)
      expect(report.topExpenses[0].debit).toBe(150)
      expect(report.topExpenses[9].debit).toBe(60)
    })

    it('should calculate date range correctly', () => {
      const transactions = [
        createMockTransaction({ purchaseDate: new Date('2024-01-15') }),
        createMockTransaction({ purchaseDate: new Date('2024-06-20') }),
        createMockTransaction({ purchaseDate: new Date('2024-03-10') }),
      ]

      const report = analyzeExpenses(transactions)

      expect(report.dateRange.start.toISOString().split('T')[0]).toBe('2024-01-15')
      expect(report.dateRange.end.toISOString().split('T')[0]).toBe('2024-06-20')
    })

    it('should apply category overrides', () => {
      const transactions = [createMockTransaction({ sector: 'Restaurants', debit: 100 })]
      const overrides = new Map<number, string>()
      overrides.set(0, 'Entertainment')

      const report = analyzeExpenses(transactions, overrides)

      expect(report.categorySummaries[0].category).toBe('Entertainment')
    })

    it('should handle empty transactions array', () => {
      const report = analyzeExpenses([])

      expect(report.totalSpent).toBe(0)
      expect(report.totalIncome).toBe(0)
      expect(report.transactionCount).toBe(0)
      expect(report.categorySummaries).toHaveLength(0)
    })
  })

  describe('calculateBudgetStatus', () => {
    it('should return empty array for no budgets', () => {
      const transactions = [createMockTransaction()]
      const status = calculateBudgetStatus(transactions, [])

      expect(status).toHaveLength(0)
    })

    it('should calculate spending against budget', () => {
      const transactions = [
        createMockTransaction({
          sector: 'Restaurants',
          debit: 100,
          purchaseDate: new Date(),
        }),
        createMockTransaction({
          sector: 'Restaurants',
          debit: 50,
          purchaseDate: new Date(),
        }),
      ]
      const budgets = [createMockBudget({ category: 'Restaurants & Dining', amount: 500 })]

      const status = calculateBudgetStatus(transactions, budgets)

      expect(status).toHaveLength(1)
      expect(status[0].spent).toBe(150)
      expect(status[0].remaining).toBe(350)
      expect(status[0].percentUsed).toBe(30)
    })

    it('should set status to healthy for < 50%', () => {
      const transactions = [
        createMockTransaction({
          sector: 'Restaurants',
          debit: 100,
          purchaseDate: new Date(),
        }),
      ]
      const budgets = [createMockBudget({ category: 'Restaurants & Dining', amount: 500 })]

      const status = calculateBudgetStatus(transactions, budgets)

      expect(status[0].status).toBe('healthy')
    })

    it('should set status to early for 50-74%', () => {
      const transactions = [
        createMockTransaction({
          sector: 'Restaurants',
          debit: 300,
          purchaseDate: new Date(),
        }),
      ]
      const budgets = [createMockBudget({ category: 'Restaurants & Dining', amount: 500 })]

      const status = calculateBudgetStatus(transactions, budgets)

      expect(status[0].status).toBe('early')
    })

    it('should set status to warning for 75-99%', () => {
      const transactions = [
        createMockTransaction({
          sector: 'Restaurants',
          debit: 400,
          purchaseDate: new Date(),
        }),
      ]
      const budgets = [createMockBudget({ category: 'Restaurants & Dining', amount: 500 })]

      const status = calculateBudgetStatus(transactions, budgets)

      expect(status[0].status).toBe('warning')
    })

    it('should set status to over for > 100%', () => {
      const transactions = [
        createMockTransaction({
          sector: 'Restaurants',
          debit: 600,
          purchaseDate: new Date(),
        }),
      ]
      const budgets = [createMockBudget({ category: 'Restaurants & Dining', amount: 500 })]

      const status = calculateBudgetStatus(transactions, budgets)

      expect(status[0].status).toBe('over')
      expect(status[0].remaining).toBe(-100)
    })

    it('should sort by percentUsed descending', () => {
      const transactions = [
        createMockTransaction({
          sector: 'Restaurants',
          debit: 100,
          purchaseDate: new Date(),
        }),
        createMockTransaction({
          sector: 'Grocery stores',
          debit: 400,
          purchaseDate: new Date(),
        }),
      ]
      const budgets = [
        createMockBudget({ category: 'Restaurants & Dining', amount: 500 }),
        createMockBudget({ id: 2, category: 'Groceries', amount: 500 }),
      ]

      const status = calculateBudgetStatus(transactions, budgets)

      expect(status[0].budget.category).toBe('Groceries')
      expect(status[1].budget.category).toBe('Restaurants & Dining')
    })
  })
})
