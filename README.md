# Expense Analyzer Web Interface

A modern, beautiful web interface for analyzing your financial expenses built with Next.js, React, and TypeScript.

## Features

- 📊 **Interactive Dashboard** - Real-time expense analytics with beautiful visualizations
- 📁 **CSV Upload** - Drag & drop or browse to upload your bank statement CSV files
- 💾 **In-Browser Database** - Save analyses locally, access them anytime without re-uploading
- ✏️ **Edit Categories** - Manually fix or customize transaction categories (NEW!)
- 💰 **Financial Overview** - See total spent, income, net balance, and transaction count at a glance
- 📈 **Category Breakdown** - Visual pie chart showing spending by category with **drill-down** capability
- 🔍 **Category Explorer** - Click any category to see all transactions in that category
- 📉 **Monthly Trends** - Line chart tracking spending, income, and net flow over time
- 🏆 **Top Expenses** - Detailed table of your highest transactions
- 🎨 **Modern UI** - Clean, responsive design with Tailwind CSS
- ⚡ **Fast & Secure** - All processing happens in your browser, no data sent to servers
- 🏷️ **19 Smart Categories** - Intelligent categorization using exact sector matching
- 🔒 **100% Private** - Data stored locally in your browser using IndexedDB

## Tech Stack

- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Data visualization
- **PapaParse** - CSV parsing
- **Lucide React** - Beautiful icons
- **date-fns** - Date manipulation

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Build for Production

```bash
npm run build
npm start
```

## CSV Format

The application expects a CSV file with the following columns:

- Account number
- Card number
- Account/Cardholder
- Purchase date (DD.MM.YYYY)
- Booking text
- Sector
- Amount
- Original currency
- Rate
- Currency
- Debit
- Credit
- Booked (DD.MM.YYYY)

Example CSV format:
```csv
Account number,Card number,Account/Cardholder,Purchase date,Booking text,Sector,Amount,Original currency,Rate,Currency,Debit,Credit,Booked
123456,7890,John Doe,01.01.2025,COOP Supermarket,Grocery,85.50,CHF,,CHF,85.50,,02.01.2025
```

## Usage

1. **Upload Your CSV**
   - Click the upload area or drag & drop your bank statement CSV file
   - The file will be processed instantly in your browser

2. **View Your Analysis**
   - **Financial Overview**: See key metrics in summary cards
   - **Category Breakdown**: Understand where your money goes with a pie chart
   - **Monthly Trends**: Track your spending patterns over time
   - **Top Expenses**: Review your largest transactions in detail

3. **Gain Insights**
   - Identify your top spending category
   - Track monthly spending trends
   - Monitor your net balance
   - Discover opportunities to save

## Features in Detail

### Financial Overview Cards
- Total Spent (red)
- Total Income (green)
- Net Balance (green/red based on positive/negative)
- Transaction Count (blue)
- Largest Spending Category highlight

### Category Breakdown
- Interactive pie chart with percentage labels
- Color-coded categories
- Top 5 categories with transaction counts
- Hover for detailed amounts

### Monthly Trends
- Multi-line chart showing:
  - Spending (red line)
  - Income (green line)
  - Net flow (blue line)
- Interactive tooltips with exact values

### Top Expenses Table
- Date and description
- Category tags
- Amount highlighting
- Sortable by default (highest first)

## Categories

Transactions are automatically categorized using **exact sector field matching** (like the CLI version) into 17+ categories:

- 🍽️ **Restaurants & Dining** - Restaurants, fast food, bakeries, delivery, caterers
- 🛒 **Groceries** - Grocery stores, supermarkets
- 🚗 **Transportation** - Public transport, taxis, Uber, parking, railways
- ✈️ **Travel & Accommodation** - Hotels, airlines, travel agencies, car rentals, duty free
- 🛍️ **Shopping** - Clothing, cosmetics, department stores, retail, books, electronics, flowers
- 🏥 **Health & Beauty** - Pharmacies, doctors, opticians, wellness, barber shops
- 💻 **Digital Services** - Subscriptions (Netflix, Spotify), software, online services, Apple, iTunes
- 💼 **Insurance & Financial** - Insurance payments, banking fees, financial services
- 🎬 **Entertainment** - Cinema, concerts, events
- ⛽ **Fuel** - Gasoline service stations
- 🏋️ **Fitness & Sports** - Gym memberships, sports activities
- 📞 **Utilities & Telecom** - Swisscom, Sunrise, Salt, internet, phone
- 🔧 **Professional Services** - Repair shops, business services, advertising
- 🏛️ **Government & Taxes** - Government services, taxes
- ₿ **Crypto & Investments** - Coinbase, Kraken, Binance, crypto exchanges
- 📦 **Other** - QR payments, generic payments, truly uncategorized items

**How it works:**
1. **Exact sector matching** - The app first checks the CSV "Sector" field for exact matches
2. **Keyword fallback** - Only if no exact match, it looks for keywords in the booking text
3. **Smart separation** - Uber Eats → Dining, Regular Uber → Transportation

**Click any category** to explore all transactions within it!

## Privacy & Security

- ✅ **All CSV processing** happens entirely in your browser
- ✅ **No data sent to servers** - Everything stays on your device
- ✅ **Local storage only** - Saved analyses use IndexedDB in your browser
- ✅ **No tracking** - No analytics, no cookies, no external requests
- ✅ **Offline capable** - Works without internet after first load
- ✅ **You control your data** - Delete anytime from the app or browser settings

Your financial information remains completely private and secure!

## License

MIT
