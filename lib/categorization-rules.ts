/**
 * Data-driven categorization rules for transaction classification.
 *
 * Priority order (first match wins):
 *   1. Manual override (manualCategory on transaction)
 *   2. Crypto special-case (booking text keywords)
 *   3. Exact sector match (SECTOR_CATEGORY_MAP)
 *   4. Booking text — food delivery services
 *   5. Booking text — hotel booking platforms
 *   6. Partial sector matches (SECTOR_PARTIAL_RULES)
 *   7. Booking text keyword matches (BOOKING_TEXT_RULES)
 *   8. QR/empty sector fallback → 'Other'
 */

// --- Exact sector → category (highest priority after crypto) ---
export const SECTOR_CATEGORY_MAP: Record<string, string> = {
  // Restaurants & Dining
  Restaurants: 'Restaurants & Dining',
  'Fast-Food Restaurants': 'Restaurants & Dining',
  'Fast Food Restaurant': 'Restaurants & Dining',
  Bakeries: 'Restaurants & Dining',
  Delivery: 'Restaurants & Dining',
  Caterers: 'Restaurants & Dining',

  // Travel
  Hotels: 'Travel & Accommodation',
  'Hotel Indigo': 'Travel & Accommodation',
  'Travel agencies': 'Travel & Accommodation',
  'Surcharge abroad': 'Travel & Accommodation',
  Airlines: 'Travel & Accommodation',
  Cathay: 'Travel & Accommodation',
  'Swiss International Air Lines': 'Travel & Accommodation',
  United: 'Travel & Accommodation',
  'Rent-a-car': 'Travel & Accommodation',
  'Car Rental Company': 'Travel & Accommodation',
  'Duty free shop': 'Travel & Accommodation',

  // Groceries
  'Grocery stores': 'Groceries',
  Supermarkets: 'Groceries',

  // Transportation
  'Commuter transportation': 'Transportation',
  'Public transport': 'Transportation',
  'Taxi services': 'Transportation',
  Taxicabs: 'Transportation',
  Parking: 'Transportation',
  UBER: 'Transportation',
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
  Bike: 'Shopping',
  Books: 'Shopping',
  'Book stores': 'Shopping',
  'Electronics Stores': 'Shopping',
  'Leather goods': 'Shopping',
  'Shoe stores': 'Shopping',
  Florists: 'Shopping',
  'Precious metals, Metals, Watches and Jewelry (B2B)': 'Shopping',

  // Health & Beauty
  Pharmacies: 'Health & Beauty',
  'Barber or beauty shops': 'Health & Beauty',
  Healthcare: 'Health & Beauty',
  'Medical services': 'Health & Beauty',
  'Doctors and Physicians': 'Health & Beauty',
  Optician: 'Health & Beauty',
  Wellness: 'Health & Beauty',

  // Digital Services
  'Digital goods': 'Digital Services',
  Subscriptions: 'Digital Services',
  'Online services': 'Digital Services',
  Software: 'Digital Services',
  'Computer software stores': 'Digital Services',
  'Telegraph services': 'Digital Services',
  'Data processing services': 'Digital Services',

  // Insurance & Financial
  'Direct marketing insurance services': 'Insurance & Financial',
  Insurance: 'Insurance & Financial',
  'Financial services': 'Insurance & Financial',
  'Banking fees': 'Insurance & Financial',
  'Bank interest': 'Insurance & Financial',

  // Entertainment
  Cinema: 'Entertainment',

  // Professional Services
  'Repair Shops': 'Professional Services',
  'Government Services': 'Government & Taxes',
  'Advertising services': 'Professional Services',
  'Business services': 'Professional Services',
  'Professional Services - Not Elsewhere Classified': 'Professional Services',
}

// --- Crypto keywords (checked on uppercase booking text) ---
export const CRYPTO_KEYWORDS = ['COINBASE', 'KRAKEN', 'BINANCE']

// --- Early booking-text rules (checked before sector partials) ---
export interface BookingTextRule {
  keywords: string[]
  category: string
}

export const EARLY_TEXT_RULES: BookingTextRule[] = [
  // Food delivery (before generic Uber → Transport)
  {
    keywords: ['uber eats', 'ubereats'],
    category: 'Restaurants & Dining',
  },
  {
    keywords: ['deliveroo', 'just eat', 'doordash', 'eat.ch'],
    category: 'Restaurants & Dining',
  },
  // Hotel booking platforms
  {
    keywords: ['booking.com', 'airbnb', 'hotels.com', 'expedia'],
    category: 'Travel & Accommodation',
  },
]

// --- Partial sector matches (checked on uppercase sector) ---
export interface SectorPartialRule {
  patterns: string[]
  category: string
}

export const SECTOR_PARTIAL_RULES: SectorPartialRule[] = [
  {
    patterns: ['SURCHARGE ABROAD'],
    category: 'Travel & Accommodation',
  },
  {
    patterns: ['COM/BILL', 'APPLE', 'ITUNES'],
    category: 'Digital Services',
  },
  {
    patterns: ['RESTAURANT', 'FOOD'],
    category: 'Restaurants & Dining',
  },
  { patterns: ['GROCERY', 'SUPERMARKET'], category: 'Groceries' },
  { patterns: ['TRANSPORT', 'TAXI'], category: 'Transportation' },
  { patterns: ['HOTEL', 'AIRLINE'], category: 'Travel & Accommodation' },
  // Entertainment before Shopping (catches entertainment stores)
  {
    patterns: ['ENTERTAINMENT', 'CINEMA', 'THEATER', 'CONCERT', 'STREAMING', 'GAMING', 'MOVIE'],
    category: 'Entertainment',
  },
  { patterns: ['SHOP', 'RETAIL', 'STORE'], category: 'Shopping' },
  {
    patterns: ['HEALTH', 'MEDICAL', 'PHARMA'],
    category: 'Health & Beauty',
  },
  { patterns: ['INSURANCE'], category: 'Insurance & Financial' },
]

// --- Booking text keyword rules (checked on lowercase text) ---
export const BOOKING_TEXT_RULES: BookingTextRule[] = [
  {
    keywords: [
      'migros',
      'coop',
      'aldi',
      'lidl',
      'denner',
      'spar',
      'volg',
      'manor food',
      'grocery',
      'supermarket',
    ],
    category: 'Groceries',
  },
  {
    keywords: [
      'restaurant',
      'pizzeria',
      'mcdonald',
      'burger king',
      'starbucks',
      'cafe',
      'café',
      'coffee',
      'bakery',
      'bäckerei',
      'backerei',
      'conditorei',
      'confiserie',
      'kebab',
      'sushi',
      'bistro',
      'trattoria',
      'osteria',
      'brasserie',
      'restorant',
      'joe the juice',
      'juice',
      'panada',
      'sv (schweiz)',
      'selecta',
      'uber eats',
      'ubereats',
      'deliveroo',
      'just eat',
      'doordash',
      'eat.ch',
    ],
    category: 'Restaurants & Dining',
  },
  {
    keywords: [
      'sbb',
      'cff',
      'ffs',
      'zvv',
      'bvb',
      'vbz',
      'tpg',
      'bernmobil',
      'postauto',
      'flixbus',
      'uber',
      'taxi',
      'bolt',
      'parking',
      'parkhaus',
      'tankstelle',
      'gas station',
      'shell',
      'bp ',
    ],
    category: 'Transportation',
  },
  {
    keywords: [
      'hotel',
      'hostel',
      'airbnb',
      'booking.com',
      'hotels.com',
      'expedia',
      'airline',
      'swiss air',
      'easyjet',
      'ryanair',
      'lufthansa',
      'duty free',
    ],
    category: 'Travel & Accommodation',
  },
  {
    keywords: [
      'immobilien',
      'miete',
      'rent',
      'wohnung',
      'hypothek',
      'mortgage',
      'standing order',
      'merbag',
    ],
    category: 'Housing',
  },
  {
    keywords: [
      'sanitas',
      'css',
      'swica',
      'helsana',
      'concordia',
      'assura',
      'groupe mutuel',
      'visana',
      'atupri',
      'insurance',
      'versicherung',
      'grundversicherung',
      'ubs switzerland',
      'card center',
      'revolut',
      'wise.com',
      'bank charge',
      'bank fee',
      'bankgebühr',
      'balance closing',
      'service prices',
    ],
    category: 'Insurance & Financial',
  },
  {
    keywords: [
      'swisscom',
      'sunrise',
      'salt',
      'yallo',
      'wingo',
      'ewz',
      'ewb',
      'energie',
      'elektrizität',
      'strom',
      'gas ',
    ],
    category: 'Utilities & Telecom',
  },
  {
    keywords: ['gym', 'fitness', 'movemi', 'activ fitness', 'update fitness', 'crossfit', 'yoga'],
    category: 'Fitness & Sports',
  },
  {
    keywords: [
      'cinema',
      'kino',
      'movie',
      'theatre',
      'theater',
      'concert',
      'festival',
      'spa',
      'aqua',
      'eisweg',
      'game store',
      'steam',
      'playstation',
      'xbox',
      'nintendo',
      'spotify',
      'netflix',
      'youtube premium',
      'youtube music',
      'disney+',
      'hbo',
      'prime video',
      'apple music',
      'soundcloud',
    ],
    category: 'Entertainment',
  },
  {
    keywords: [
      'kiosk',
      'orell füssli',
      'orell fussli',
      'manor',
      'globus',
      'ikea',
      'h&m',
      'zara',
      'media markt',
      'interdiscount',
      'digitec',
      'galaxus',
      'book',
      'shop',
    ],
    category: 'Shopping',
  },
  {
    keywords: [
      'apotheke',
      'pharmacy',
      'drogerie',
      'arzt',
      'doctor',
      'zahnarzt',
      'dentist',
      'optik',
      'optician',
    ],
    category: 'Health & Beauty',
  },
]
