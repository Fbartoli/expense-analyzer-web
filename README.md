<p align="center">
  <h1 align="center">Expense Analyzer</h1>
  <p align="center">
    A privacy-first expense tracking app that runs entirely in your browser
    <br />
    <strong>No servers. No tracking. Your data stays yours.</strong>
  </p>
</p>

<p align="center">
  <a href="https://github.com/Fbartoli/expense-analyzer-web/actions/workflows/ci.yml">
    <img src="https://github.com/Fbartoli/expense-analyzer-web/actions/workflows/ci.yml/badge.svg" alt="CI Status" />
  </a>
  <a href="https://codecov.io/gh/Fbartoli/expense-analyzer-web">
    <img src="https://codecov.io/gh/Fbartoli/expense-analyzer-web/branch/main/graph/badge.svg" alt="Coverage" />
  </a>
  <img src="https://img.shields.io/badge/tests-115%20passing-brightgreen" alt="Tests" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61dafb?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
  <img src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg" alt="Code Style: Prettier" />
</p>

---

## 🚀 Live Demo

**[Try it now](https://your-demo-link-here.vercel.app)** - Upload a CSV and start analyzing your expenses in seconds. No signup required.

> **Note:** All data stays in your browser. We can't see your transactions even if we wanted to.

---

## 📸 Screenshots

<p align="center">
  <img src="./docs/screenshots/dashboard.png" alt="Dashboard" width="800" />
  <br />
  <em>Main dashboard with categorized expenses and budget overview</em>
</p>

<p align="center">
  <img src="./docs/screenshots/trends.png" alt="Monthly Trends" width="800" />
  <br />
  <em>Interactive monthly spending trends</em>
</p>

<p align="center">
  <img src="./docs/screenshots/backup.png" alt="Encrypted Backup" width="800" />
  <br />
  <em>Encrypted backup with password protection</em>
</p>

---

## Why Use This?

**For Privacy Advocates:**
- Your financial data never leaves your device
- No tracking, no analytics, no telemetry
- No account creation or personal information required
- Open source - verify the code yourself

**For Budget Conscious Users:**
- Free and open source forever
- No subscription fees or premium tiers
- All features available to everyone

**For Swiss Bank Users:**
- Native support for UBS CSV format
- Handles Swiss date format (DD.MM.YYYY)
- Supports Swiss number format (1'234.56)
- Easy to extend for other banks

**For Tech-Savvy Users:**
- Works offline after first load
- Encrypted backups you control
- Export your data anytime
- Modern tech stack (Next.js 16, React 19)

---

## Features

| Feature | Description |
|---------|-------------|
| **CSV Upload** | Drag & drop bank statements (UBS format supported) |
| **Smart Categorization** | 19 categories with sector matching + keyword fallback |
| **Budget Tracking** | Set budgets per category with status indicators |
| **Monthly Trends** | Interactive charts showing spending over time |
| **Encrypted Backups** | AES-256-GCM encrypted export/import |
| **100% Private** | All data stays in your browser (IndexedDB) |
| **Offline Ready** | Works without internet after first load |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Framework** | Next.js 16, React 19 |
| **Language** | TypeScript 5.7 |
| **Styling** | Tailwind CSS |
| **Database** | IndexedDB (via Dexie.js) |
| **Charts** | Recharts |
| **Testing** | Vitest, Testing Library |
| **CI/CD** | GitHub Actions, Codecov |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run test` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | Run TypeScript compiler |
| `npm run validate` | Run all checks (typecheck + lint + test) |

## Project Structure

```
expense-analyzer/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main dashboard
│   ├── layout.tsx         # Root layout
│   └── error.tsx          # Error boundary
├── components/            # React components
│   ├── FileUpload.tsx     # CSV upload handler
│   ├── BackupRestore.tsx  # Encrypted backup/restore
│   ├── BudgetManager.tsx  # Budget CRUD
│   ├── MonthlyTrends.tsx  # Spending charts
│   └── ...
├── lib/                   # Core logic
│   ├── parser.ts          # CSV parsing (Swiss format)
│   ├── analyzer.ts        # Categorization & analysis
│   ├── crypto.ts          # AES-256-GCM encryption
│   ├── db.ts              # IndexedDB operations
│   └── merge.ts           # Transaction deduplication
├── __tests__/             # Test suites
│   ├── unit/lib/          # Unit tests (115 tests)
│   └── fixtures/          # Test data
└── .github/workflows/     # CI/CD pipelines
```

## Test Coverage

```
File          | % Stmts | % Branch | % Funcs | % Lines
--------------|---------|----------|---------|--------
lib/merge.ts  |   100%  |   100%   |   100%  |   100%
lib/crypto.ts |    96%  |    88%   |   100%  |    96%
lib/db.ts     |    90%  |    86%   |    96%  |    90%
lib/analyzer  |    88%  |    84%   |   100%  |    88%
lib/parser.ts |    88%  |    82%   |    83%  |    87%
```

## CSV Format

Supports UBS bank statement format:

```csv
Account number;Card number;Account/Cardholder;Purchase date;Booking text;Sector;Amount;Original currency;Rate;Currency;Debit;Credit;Booked
123456;****1234;John Doe;15.06.2024;COOP Supermarket;Grocery stores;85.50;CHF;;CHF;85.50;;16.06.2024
```

**Supported features:**
- Swiss date format (DD.MM.YYYY)
- Swiss number format (1'234.56)
- Auto-detect delimiter (`;` or `,`)
- Salary/transfer detection

## Categories

Transactions are automatically categorized into 19 categories:

| Category | Sectors/Keywords |
|----------|-----------------|
| Restaurants & Dining | Restaurants, Fast-Food, Uber Eats, Deliveroo |
| Groceries | Grocery stores, Supermarkets |
| Transportation | Public transport, Uber, Taxis, Parking |
| Travel & Accommodation | Hotels, Airlines, Booking.com |
| Shopping | Clothing, Electronics, Department stores |
| Health & Beauty | Pharmacies, Doctors, Opticians |
| Entertainment | Netflix, Spotify, Cinema |
| Crypto & Investments | Coinbase, Kraken, Binance |
| ... | And 11 more categories |

## Security

- **Encryption**: AES-256-GCM with PBKDF2 key derivation (100k iterations)
- **Password Requirements**: 8+ chars, uppercase, lowercase, number
- **Local Storage**: All data in browser IndexedDB
- **No Telemetry**: Zero external requests or tracking

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run validation (`npm run validate`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Setup

```bash
# Install dependencies
npm install

# Run all checks before committing
npm run validate

# Pre-commit hooks run automatically via Husky
```

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with TypeScript, React, and privacy in mind.
</p>
