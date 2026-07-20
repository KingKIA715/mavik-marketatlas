// MarketAtlas — countries, metals, crypto, stock universe, gasoline reference prices.

export type CountryCode = "IN" | "US" | "EU" | "GB" | "AE" | "JP" | "CN";

export interface CountryDef {
  code: CountryCode;
  name: string;
  currency: string;
  symbol: string;
  flag: string;
  locale: string;
  displayCurrencies: string[];
  metalUnit: "gram" | "ounce";
  stockIndices: string[];
  stockBasket: string[]; // for top movers
  /** Fuel/LPG cylinder size used for "per cylinder" headline. */
  fuelVolumeUnit: "L" | "gal";
}

export const COUNTRIES: Record<CountryCode, CountryDef> = {
  IN: {
    code: "IN",
    name: "India",
    currency: "INR",
    symbol: "₹",
    flag: "🇮🇳",
    locale: "en-IN",
    displayCurrencies: ["INR", "USD", "EUR", "GBP", "AED", "JPY", "CNY", "AUD"],
    metalUnit: "gram",
    stockIndices: ["^NSEI", "^BSESN", "^NSEBANK", "^CNXIT", "^CNXAUTO"],
    stockBasket: [
      "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
      "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
      "LT.NS", "AXISBANK.NS",
    ],
    fuelVolumeUnit: "L",
  },
  US: {
    code: "US",
    name: "United States",
    currency: "USD",
    symbol: "$",
    flag: "🇺🇸",
    locale: "en-US",
    displayCurrencies: ["USD", "EUR", "GBP", "JPY", "INR", "CNY", "CAD"],
    metalUnit: "ounce",
    stockIndices: ["^GSPC", "^IXIC", "^DJI", "^VIX"],
    stockBasket: [
      "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
      "JPM", "V", "JNJ", "WMT", "XOM",
    ],
    fuelVolumeUnit: "gal",
  },
  EU: {
    code: "EU",
    name: "Eurozone",
    currency: "EUR",
    symbol: "€",
    flag: "🇪🇺",
    locale: "de-DE",
    displayCurrencies: ["EUR", "USD", "GBP", "CHF", "INR", "JPY"],
    metalUnit: "ounce",
    stockIndices: ["^STOXX50E", "^GDAXI", "^FCHI"],
    stockBasket: [
      "ASML.AS", "SAP.DE", "MC.PA", "OR.PA", "SAN.PA",
      "AIR.PA", "ALV.DE", "BAS.DE", "SIE.DE", "BNP.PA",
    ],
    fuelVolumeUnit: "L",
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    symbol: "£",
    flag: "🇬🇧",
    locale: "en-GB",
    displayCurrencies: ["GBP", "EUR", "USD", "INR", "JPY", "CHF"],
    metalUnit: "ounce",
    stockIndices: ["^FTSE", "^FTMC"],
    stockBasket: [
      "SHEL.L", "AZN.L", "HSBA.L", "ULVR.L", "BP.L",
      "GSK.L", "RIO.L", "LLOY.L", "DGE.L", "BARC.L",
    ],
    fuelVolumeUnit: "L",
  },
  AE: {
    code: "AE",
    name: "United Arab Emirates",
    currency: "AED",
    symbol: "د.إ",
    flag: "🇦🇪",
    locale: "en-AE",
    displayCurrencies: ["AED", "USD", "EUR", "INR", "GBP", "SAR"],
    metalUnit: "gram",
    stockIndices: ["^DFMGI", "^ADI"],
    stockBasket: [
      "EMAAR.AE", "ALDAR.AE", "DEWA.AE", "EMIRATESNBD.AE",
      "FAB.AE", "ADCB.AE",
    ],
    fuelVolumeUnit: "L",
  },
  JP: {
    code: "JP",
    name: "Japan",
    currency: "JPY",
    symbol: "¥",
    flag: "🇯🇵",
    locale: "ja-JP",
    displayCurrencies: ["JPY", "USD", "EUR", "GBP", "CNY", "AUD"],
    metalUnit: "gram",
    stockIndices: ["^N225", "^TPX"],
    stockBasket: [
      "7203.T", "6758.T", "9984.T", "6861.T", "8306.T",
      "9432.T", "7974.T", "6098.T",
    ],
    fuelVolumeUnit: "L",
  },
  CN: {
    code: "CN",
    name: "China",
    currency: "CNY",
    symbol: "¥",
    flag: "🇨🇳",
    locale: "zh-CN",
    displayCurrencies: ["CNY", "USD", "EUR", "JPY", "HKD", "GBP"],
    metalUnit: "gram",
    stockIndices: ["000001.SS", "^HSI"],
    stockBasket: [
      "601398.SS", "601857.SS", "600519.SS", "601318.SS",
      "0700.HK", "9988.HK", "3690.HK", "0939.HK",
    ],
    fuelVolumeUnit: "L",
  },
};

export const COUNTRY_ORDER: CountryCode[] = ["IN", "US", "GB", "EU", "JP", "CN", "AE"];

export const COUNTRY_SHORT: Record<CountryCode, string> = {
  IN: "IN",
  US: "USA",
  GB: "UK",
  EU: "EU",
  AE: "UAE",
  JP: "JP",
  CN: "CN",
};

/**
 * Country-specific retail premium on global spot metal prices.
 * India: ~15% customs duty on gold, ~10% on silver/platinum (GST applied
 * separately in the UI via a user-toggleable 3% slab).
 * UAE: 5% VAT.
 */
export const RETAIL_PREMIUM: Partial<Record<CountryCode, { XAU: number; XAG: number; XPT: number }>> = {
  IN: { XAU: 1.15, XAG: 1.10, XPT: 1.10 },
  AE: { XAU: 1.05, XAG: 1.05, XPT: 1.05 },
};

/** India GST on bullion (when toggle enabled). */
export const INDIA_GST = 0.03;

export const GRAMS_PER_KG = 1000;
export const GRAMS_PER_SOVEREIGN = 8; // 1 Pavan/Savaran ≈ 8 g (South India standard)
export const GRAMS_PER_TOLA = 11.6638; // 1 Tola — standard unit across India, Pakistan, Gulf gold trade
export const GRAMS_PER_TROY_OUNCE = 31.1034768;

export type MetalCode = "XAU" | "XAG" | "XPT";

export interface MetalDef {
  code: MetalCode;
  name: string;
  symbol: string;
  yahoo: string; // futures symbol for history
  karats?: number[];
}

export const METALS: MetalDef[] = [
  { code: "XAU", name: "Gold", symbol: "Au", yahoo: "GC=F", karats: [24, 22, 18] },
  { code: "XAG", name: "Silver", symbol: "Ag", yahoo: "SI=F" },
  { code: "XPT", name: "Platinum", symbol: "Pt", yahoo: "PL=F" },
];

export const KARAT_PURITY: Record<number, number> = {
  24: 0.9999,
  22: 22 / 24,
  18: 18 / 24,
};

/* ----------------------------------------------------------------- CRYPTO -- */

export type CryptoCode = "BTC" | "ETH" | "SOL";

export interface CryptoDef {
  code: CryptoCode;
  name: string;
  yahoo: string; // Yahoo Finance symbol
  icon: string;
}

export const CRYPTOS: CryptoDef[] = [
  { code: "BTC", name: "Bitcoin", yahoo: "BTC-USD", icon: "₿" },
  { code: "ETH", name: "Ethereum", yahoo: "ETH-USD", icon: "Ξ" },
  { code: "SOL", name: "Solana", yahoo: "SOL-USD", icon: "◎" },
];

/** Crypto 24h change quotes use the same structure as stocks. */
export const CRYPTO_SYMBOLS: Record<CryptoCode, string> = {
  BTC: "BTC-USD",
  ETH: "ETH-USD",
  SOL: "SOL-USD",
};

/* ----------------------------------------------------------------- CURRENCY FLAGS & NAMES -- */

export const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  AED: "🇦🇪",
  INR: "🇮🇳",
  CNY: "🇨🇳",
  AUD: "🇦🇺",
  CAD: "🇨🇦",
  CHF: "🇨🇭",
  SGD: "🇸🇬",
  HKD: "🇭🇰",
  SAR: "🇸🇦",
};

export const CURRENCY_NAMES: Record<string, string> = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  AED: "UAE Dirham",
  INR: "Indian Rupee",
  CNY: "Chinese Yuan",
  AUD: "Australian Dollar",
  CAD: "Canadian Dollar",
  CHF: "Swiss Franc",
  SGD: "Singapore Dollar",
  HKD: "Hong Kong Dollar",
  SAR: "Saudi Riyal",
};

/* ----------------------------------------------------------------- STOCKS -- */

export interface StockDef {
  ticker: string;
  name: string;
  exchange: string;
  country: CountryCode;
}

export const STOCKS: Record<string, StockDef> = {
  "^NSEI": { ticker: "^NSEI", name: "Nifty 50", exchange: "NSE", country: "IN" },
  "^BSESN": { ticker: "^BSESN", name: "Sensex", exchange: "BSE", country: "IN" },
  "^NSEBANK": { ticker: "^NSEBANK", name: "Bank Nifty", exchange: "NSE", country: "IN" },
  "^CNXIT": { ticker: "^CNXIT", name: "Nifty IT", exchange: "NSE", country: "IN" },
  "^CNXAUTO": { ticker: "^CNXAUTO", name: "Nifty Auto", exchange: "NSE", country: "IN" },
  "^GSPC": { ticker: "^GSPC", name: "S&P 500", exchange: "NYSE", country: "US" },
  "^IXIC": { ticker: "^IXIC", name: "NASDAQ Composite", exchange: "NASDAQ", country: "US" },
  "^DJI": { ticker: "^DJI", name: "Dow Jones", exchange: "NYSE", country: "US" },
  "^VIX": { ticker: "^VIX", name: "VIX (Volatility Index)", exchange: "CBOE", country: "US" },
  "^FTSE": { ticker: "^FTSE", name: "FTSE 100", exchange: "LSE", country: "GB" },
  "^FTMC": { ticker: "^FTMC", name: "FTSE 250", exchange: "LSE", country: "GB" },
  "^DFMGI": { ticker: "^DFMGI", name: "DFM General", exchange: "DFM", country: "AE" },
  "^ADI": { ticker: "^ADI", name: "ADX General", exchange: "ADX", country: "AE" },
  "^STOXX50E": { ticker: "^STOXX50E", name: "Euro Stoxx 50", exchange: "EU", country: "EU" },
  "^GDAXI": { ticker: "^GDAXI", name: "DAX 40", exchange: "XETRA", country: "EU" },
  "^FCHI": { ticker: "^FCHI", name: "CAC 40", exchange: "EPA", country: "EU" },
  "^N225": { ticker: "^N225", name: "Nikkei 225", exchange: "TSE", country: "JP" },
  "^TPX": { ticker: "^TPX", name: "TOPIX", exchange: "TSE", country: "JP" },
  "000001.SS": { ticker: "000001.SS", name: "Shanghai Composite", exchange: "SSE", country: "CN" },
  "^HSI": { ticker: "^HSI", name: "Hang Seng", exchange: "HKEX", country: "CN" },
};

/** Friendly names for basket tickers (best-effort; falls back to ticker). */
export const STOCK_NAMES: Record<string, string> = {
  "RELIANCE.NS": "Reliance Industries",
  "TCS.NS": "Tata Consultancy",
  "HDFCBANK.NS": "HDFC Bank",
  "INFY.NS": "Infosys",
  "ICICIBANK.NS": "ICICI Bank",
  "HINDUNILVR.NS": "Hindustan Unilever",
  "ITC.NS": "ITC",
  "SBIN.NS": "State Bank of India",
  "BHARTIARTL.NS": "Bharti Airtel",
  "KOTAKBANK.NS": "Kotak Mahindra Bank",
  "LT.NS": "Larsen & Toubro",
  "AXISBANK.NS": "Axis Bank",
  AAPL: "Apple",
  MSFT: "Microsoft",
  GOOGL: "Alphabet",
  AMZN: "Amazon",
  NVDA: "NVIDIA",
  META: "Meta Platforms",
  TSLA: "Tesla",
  JPM: "JPMorgan Chase",
  V: "Visa",
  JNJ: "Johnson & Johnson",
  WMT: "Walmart",
  XOM: "Exxon Mobil",
  "ASML.AS": "ASML Holding",
  "SAP.DE": "SAP",
  "MC.PA": "LVMH",
  "OR.PA": "L'Oréal",
  "SAN.PA": "Sanofi",
  "AIR.PA": "Airbus",
  "ALV.DE": "Allianz",
  "BAS.DE": "BASF",
  "SIE.DE": "Siemens",
  "BNP.PA": "BNP Paribas",
  "SHEL.L": "Shell",
  "AZN.L": "AstraZeneca",
  "HSBA.L": "HSBC",
  "ULVR.L": "Unilever",
  "BP.L": "BP",
  "GSK.L": "GSK",
  "RIO.L": "Rio Tinto",
  "LLOY.L": "Lloyds Banking",
  "DGE.L": "Diageo",
  "BARC.L": "Barclays",
  "EMAAR.AE": "Emaar Properties",
  "ALDAR.AE": "Aldar Properties",
  "DEWA.AE": "DEWA",
  "EMIRATESNBD.AE": "Emirates NBD",
  "FAB.AE": "First Abu Dhabi Bank",
  "ADCB.AE": "ADCB",
  "7203.T": "Toyota Motor",
  "6758.T": "Sony Group",
  "9984.T": "SoftBank Group",
  "6861.T": "Keyence",
  "8306.T": "Mitsubishi UFJ",
  "9432.T": "NTT",
  "7974.T": "Nintendo",
  "6098.T": "Recruit Holdings",
  "601398.SS": "ICBC",
  "601857.SS": "PetroChina",
  "600519.SS": "Kweichow Moutai",
  "601318.SS": "Ping An Insurance",
  "0700.HK": "Tencent",
  "9988.HK": "Alibaba",
  "3690.HK": "Meituan",
  "0939.HK": "China Construction Bank",
};

/* --------------------------------------------------------------- GASOLINE -- */

export interface FuelReference {
  petrol: number; // per litre or per gallon (per fuelVolumeUnit) in local currency
  diesel: number;
  lpgDomestic: { price: number; unit: string }; // e.g. ₹855 per 14.2 kg cylinder
  lpgCommercial: { price: number; unit: string };
}

/**
 * Indicative retail fuel prices in LOCAL currency. Sourced from public
 * regional averages; refreshed periodically. Use as a reference, not a quote.
 * NOTE: Petrol/diesel values here serve as fallback base prices when crude
 * derivation is unavailable. The UI now derives live fuel prices from WTI crude.
 */
export const FUEL_REFERENCE: Record<CountryCode, FuelReference> = {
  IN: {
    petrol: 102.5,
    diesel: 95.5,
    lpgDomestic: { price: 855, unit: "14.2 kg cylinder" },
    lpgCommercial: { price: 1750, unit: "19 kg cylinder" },
  },
  US: {
    petrol: 3.95,
    diesel: 4.15,
    lpgDomestic: { price: 2.5, unit: "gallon" },
    lpgCommercial: { price: 2.2, unit: "gallon (bulk)" },
  },
  EU: {
    petrol: 1.75,
    diesel: 1.75,
    lpgDomestic: { price: 0.95, unit: "litre" },
    lpgCommercial: { price: 0.85, unit: "litre (bulk)" },
  },
  GB: {
    petrol: 1.51,
    diesel: 1.65,
    lpgDomestic: { price: 0.85, unit: "litre" },
    lpgCommercial: { price: 0.75, unit: "litre (bulk)" },
  },
  AE: {
    petrol: 3.29,
    diesel: 3.6,
    lpgDomestic: { price: 75, unit: "cylinder" },
    lpgCommercial: { price: 290, unit: "cylinder (bulk)" },
  },
  JP: {
    petrol: 170,
    diesel: 158,
    lpgDomestic: { price: 500, unit: "10 kg cylinder" },
    lpgCommercial: { price: 850, unit: "20 kg cylinder" },
  },
  CN: {
    petrol: 7.8,
    diesel: 7.1,
    lpgDomestic: { price: 110, unit: "14.5 kg cylinder" },
    lpgCommercial: { price: 220, unit: "30 kg cylinder" },
  },
};

/**
 * Fuel spread multipliers — retail price = (crude price per litre/gallon) × spread.
 * These approximate refining, distribution, taxes, and dealer margins.
 *
 * Recalibrated against real pump prices (see FUEL_REFERENCE above, sourced
 * mid-to-late July 2026) divided by the crude cost per litre/gallon at a
 * ~$65/barrel WTI reference — the trading range crude had been in for the
 * preceding several weeks, i.e. the environment those retail prices were
 * actually set under (WTI briefly spiked to the $80s on a fresh Iran/Hormuz
 * flare-up right at calibration time; using that spike as the reference
 * instead would have overstated every country's true tax/margin spread).
 * The previous multipliers (~1.1–1.9) were calibrated too low across the
 * board — see HANDOFF.md's "Fuel Cost calculator numbers run below
 * real-world pump prices" note — largely because retail fuel tax is a much
 * bigger share of the pump price than a ~1.1–1.9× multiplier implies,
 * especially in heavily-taxed markets like the UK and EU.
 *
 * Two caveats worth knowing if these ever look off again: (1) the app only
 * fetches WTI, not Brent — European/UK/Japanese pump prices are actually
 * set off Brent-linked refined-product markets, which usually trade a few
 * dollars above WTI, so this will systematically run a little low for
 * those three when the WTI-Brent spread widens; (2) India's pump prices
 * are administratively set by state oil companies and revised in infrequent
 * jumps rather than tracking crude day-to-day, so on any day crude has
 * moved a lot since India's last revision, the derived price will drift
 * from the actual posted price until the next revision catches up.
 * Neither is fixable without pulling in a Brent feed and a real India
 * pump-price API — flagging as a known limitation rather than solving it
 * here.
 */
export const FUEL_SPREAD: Record<CountryCode, { petrol: number; diesel: number }> = {
  IN: { petrol: 2.98, diesel: 2.7 },
  US: { petrol: 2.55, diesel: 2.65 },
  EU: { petrol: 4.65, diesel: 4.65 },
  GB: { petrol: 4.67, diesel: 5.11 },
  AE: { petrol: 2.19, diesel: 2.4 },
  JP: { petrol: 2.77, diesel: 2.58 },
  CN: { petrol: 2.65, diesel: 2.41 },
};
