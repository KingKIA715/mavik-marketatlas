// MarketAtlas — countries, metals, stock universe, gasoline reference prices.

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
    stockIndices: ["^NSEI", "^BSESN", "^NSEBANK"],
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
    stockIndices: ["^GSPC", "^IXIC", "^DJI"],
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
};

export const COUNTRY_ORDER: CountryCode[] = ["IN", "US", "EU", "GB", "AE"];

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
  "^GSPC": { ticker: "^GSPC", name: "S&P 500", exchange: "NYSE", country: "US" },
  "^IXIC": { ticker: "^IXIC", name: "NASDAQ Composite", exchange: "NASDAQ", country: "US" },
  "^DJI": { ticker: "^DJI", name: "Dow Jones", exchange: "NYSE", country: "US" },
  "^FTSE": { ticker: "^FTSE", name: "FTSE 100", exchange: "LSE", country: "GB" },
  "^FTMC": { ticker: "^FTMC", name: "FTSE 250", exchange: "LSE", country: "GB" },
  "^DFMGI": { ticker: "^DFMGI", name: "DFM General", exchange: "DFM", country: "AE" },
  "^ADI": { ticker: "^ADI", name: "ADX General", exchange: "ADX", country: "AE" },
  "^STOXX50E": { ticker: "^STOXX50E", name: "Euro Stoxx 50", exchange: "EU", country: "EU" },
  "^GDAXI": { ticker: "^GDAXI", name: "DAX 40", exchange: "XETRA", country: "EU" },
  "^FCHI": { ticker: "^FCHI", name: "CAC 40", exchange: "EPA", country: "EU" },
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
 */
export const FUEL_REFERENCE: Record<CountryCode, FuelReference> = {
  IN: {
    petrol: 100.5,
    diesel: 92.5,
    lpgDomestic: { price: 855, unit: "14.2 kg cylinder" },
    lpgCommercial: { price: 1750, unit: "19 kg cylinder" },
  },
  US: {
    petrol: 3.4,
    diesel: 3.8,
    lpgDomestic: { price: 2.5, unit: "gallon" },
    lpgCommercial: { price: 2.2, unit: "gallon (bulk)" },
  },
  EU: {
    petrol: 1.7,
    diesel: 1.6,
    lpgDomestic: { price: 0.95, unit: "litre" },
    lpgCommercial: { price: 0.85, unit: "litre (bulk)" },
  },
  GB: {
    petrol: 1.45,
    diesel: 1.55,
    lpgDomestic: { price: 0.85, unit: "litre" },
    lpgCommercial: { price: 0.75, unit: "litre (bulk)" },
  },
  AE: {
    petrol: 3.05,
    diesel: 3.2,
    lpgDomestic: { price: 75, unit: "cylinder" },
    lpgCommercial: { price: 290, unit: "cylinder (bulk)" },
  },
};
