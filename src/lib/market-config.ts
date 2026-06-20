// MarketAtlas UI config — countries, metals, stock indices.
// Extend by adding entries here; UI picks them up automatically.

export type CountryCode = "IN" | "US" | "AE" | "GB" | "EU";

export interface CountryDef {
  code: CountryCode;
  name: string;
  currency: string;
  symbol: string;
  flag: string;
  displayCurrencies: string[];
  metalUnit: "gram" | "ounce";
  stockIndices: string[];
}

export const COUNTRIES: Record<CountryCode, CountryDef> = {
  IN: {
    code: "IN",
    name: "India",
    currency: "INR",
    symbol: "₹",
    flag: "🇮🇳",
    displayCurrencies: ["INR", "USD", "EUR", "GBP", "AED", "JPY"],
    metalUnit: "gram",
    stockIndices: ["^NSEI", "^BSESN"],
  },
  US: {
    code: "US",
    name: "United States",
    currency: "USD",
    symbol: "$",
    flag: "🇺🇸",
    displayCurrencies: ["USD", "EUR", "GBP", "JPY", "INR"],
    metalUnit: "ounce",
    stockIndices: ["^GSPC", "^IXIC", "^DJI"],
  },
  EU: {
    code: "EU",
    name: "Eurozone",
    currency: "EUR",
    symbol: "€",
    flag: "🇪🇺",
    displayCurrencies: ["EUR", "USD", "GBP", "INR"],
    metalUnit: "ounce",
    stockIndices: ["^STOXX50E"],
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    currency: "GBP",
    symbol: "£",
    flag: "🇬🇧",
    displayCurrencies: ["GBP", "EUR", "USD", "INR"],
    metalUnit: "gram",
    stockIndices: ["^FTSE"],
  },
  AE: {
    code: "AE",
    name: "UAE",
    currency: "AED",
    symbol: "د.إ",
    flag: "🇦🇪",
    displayCurrencies: ["AED", "USD", "EUR", "INR", "GBP"],
    metalUnit: "gram",
    stockIndices: ["^DFMGI"],
  },
};

/**
 * Country-specific retail premiums applied to global spot prices to better
 * reflect local market rates. Indian retail bullion includes ~15% customs
 * duty + 3% GST on gold, and ~10% customs + 3% GST on silver.
 */
export const RETAIL_PREMIUM: Partial<Record<CountryCode, { XAU: number; XAG: number }>> = {
  IN: { XAU: 1.18, XAG: 1.13 },
  AE: { XAU: 1.05, XAG: 1.05 }, // 5% VAT
};

export const GRAMS_PER_KG = 1000;
export const GRAMS_PER_SAVARAN = 8; // 1 Savaran / Pavan ~= 8 g (South India)

export interface MetalDef {
  code: "XAU" | "XAG" | "XPT" | "HG";
  name: string;
  symbol: string;
  karats?: number[]; // gold only
  tint: string; // CSS color token name
}

export const METALS: MetalDef[] = [
  { code: "XAU", name: "Gold", symbol: "Au", karats: [24, 22, 18], tint: "gold" },
  { code: "XAG", name: "Silver", symbol: "Ag", tint: "silver" },
  { code: "XPT", name: "Platinum", symbol: "Pt", tint: "platinum" },
  { code: "HG", name: "Copper", symbol: "Cu", tint: "copper" },
];

export interface StockDef {
  ticker: string;
  name: string;
  exchange: string;
  country: CountryCode;
}

export const STOCKS: Record<string, StockDef> = {
  "^NSEI": { ticker: "^NSEI", name: "Nifty 50", exchange: "NSE", country: "IN" },
  "^BSESN": { ticker: "^BSESN", name: "Sensex", exchange: "BSE", country: "IN" },
  "^GSPC": { ticker: "^GSPC", name: "S&P 500", exchange: "NYSE", country: "US" },
  "^IXIC": { ticker: "^IXIC", name: "NASDAQ", exchange: "NASDAQ", country: "US" },
  "^DJI": { ticker: "^DJI", name: "Dow Jones", exchange: "NYSE", country: "US" },
  "^FTSE": { ticker: "^FTSE", name: "FTSE 100", exchange: "LSE", country: "GB" },
  "^DFMGI": { ticker: "^DFMGI", name: "DFM General", exchange: "DFM", country: "AE" },
  "^STOXX50E": { ticker: "^STOXX50E", name: "Euro Stoxx 50", exchange: "EU", country: "EU" },
};

export const GRAMS_PER_TROY_OUNCE = 31.1034768;

// Gold purity multipliers
export const KARAT_PURITY: Record<number, number> = {
  24: 0.9999,
  22: 22 / 24,
  18: 18 / 24,
};
