import { METALS, CRYPTOS, STOCKS, STOCK_NAMES } from "./market-config";

export type HistoryCategory = "metals" | "crypto" | "stocks" | "fx";

export interface HistoryAssetConfig {
  /** The exact Yahoo symbol used to fetch history (e.g. "GC=F", "^NSEI", "USDINR=X"). */
  symbol: string;
  title: string;
  category: HistoryCategory;
  /** Shown as the Y-axis / stat unit — "USD per troy oz", "INR per share", "points", "JPY per 1 USD", etc. */
  unitLabel: string;
  /** Prefixed before numbers when it's a real currency (omitted for index "points" and bare ratios). */
  currency?: string;
  tint: string;
  /** Rescales Yahoo futures history so the last point matches live spot (metals only). */
  alignMetal?: "XAU" | "XAG" | "XPT";
  /** Hand-written context paragraphs — only exists for the handful of flagship assets worth unique SEO copy. */
  about?: string[];
  /** Default zoom range for the chart. */
  defaultRange: "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "10y";
}

const SUFFIX_CURRENCY: Record<string, string> = {
  ".NS": "INR",
  ".BO": "INR",
  ".HK": "HKD",
  ".SS": "CNY",
  ".SZ": "CNY",
  ".T": "JPY",
  ".PA": "EUR",
  ".DE": "EUR",
  ".AS": "EUR",
  ".L": "GBP",
  ".AE": "AED",
};

const METAL_ABOUT: Record<string, string[]> = {
  XAU: [
    "Gold has served as a monetary asset for thousands of years and remains a benchmark store of value in modern portfolios. Long-run price history reflects the interplay of real interest rates, the US dollar, central bank purchases, jewellery and industrial demand, and safe-haven flows during geopolitical or financial stress.",
    "For a live view converted to your local currency, including karat and duty breakdowns, use the dashboard's Gold card instead — this page tracks the raw underlying futures market (COMEX GC=F), which is the reference price every retail quote is built from.",
  ],
  XAG: [
    "Silver trades as both a monetary metal and an industrial input — solar panels, electronics, and electrical contacts consume a large and growing share of annual supply, which makes silver's price history more cyclical than gold's.",
    "For a live view converted to your local currency, use the dashboard's Silver card. This page tracks the raw underlying futures market (COMEX SI=F).",
  ],
  XPT: [
    "Platinum is overwhelmingly an industrial metal — autocatalysts for diesel vehicles and hydrogen fuel-cell technology are its largest demand drivers, which ties its price history closely to the auto industry's cycles rather than to monetary/safe-haven flows the way gold's is.",
    "For a live view converted to your local currency, use the dashboard's Platinum card. This page tracks the raw underlying futures market (NYMEX PL=F).",
  ],
};

const CRYPTO_ABOUT: Record<string, string[]> = {
  BTC: [
    "Bitcoin is the original cryptocurrency and the largest by market capitalization. Its price history is markedly more volatile than traditional assets, shaped by four-year halving cycles, regulatory developments, and shifting institutional adoption.",
  ],
  ETH: [
    "Ethereum is the leading smart-contract platform; its price reflects both its role as a speculative asset and demand for block space from decentralized finance, NFTs, and other on-chain applications built on it.",
  ],
  SOL: [
    "Solana is a high-throughput smart-contract platform positioned as a faster, cheaper alternative to Ethereum. Its price history has been particularly volatile, including a sharp 2022 drawdown tied to the FTX collapse and a strong subsequent recovery.",
  ],
};

function fxLabel(symbol: string): { title: string; unitLabel: string } {
  const m = symbol.match(/^([A-Z]{3})([A-Z]{3})=X$/);
  if (!m) return { title: symbol, unitLabel: symbol };
  const [, base, quote] = m;
  return { title: `${base} / ${quote}`, unitLabel: `${quote} per 1 ${base}` };
}

function currencyForTicker(ticker: string): string | undefined {
  for (const [suffix, ccy] of Object.entries(SUFFIX_CURRENCY)) {
    if (ticker.endsWith(suffix)) return ccy;
  }
  if (ticker.startsWith("^")) return undefined; // index — no currency, just "points"
  return "USD";
}

/** Resolves any Yahoo symbol this app links to into full display config for the history page. */
export function resolveHistoryAsset(symbol: string): HistoryAssetConfig {
  const metal = METALS.find((m) => m.yahoo === symbol);
  if (metal) {
    return {
      symbol,
      title: metal.name,
      category: "metals",
      unitLabel: "USD per troy oz",
      currency: "USD",
      tint: metal.code === "XAU" ? "#d97706" : metal.code === "XAG" ? "#64748b" : "#475569",
      alignMetal: metal.code,
      about: METAL_ABOUT[metal.code],
      defaultRange: "10y",
    };
  }

  const crypto = CRYPTOS.find((c) => c.yahoo === symbol);
  if (crypto) {
    return {
      symbol,
      title: crypto.name,
      category: "crypto",
      unitLabel: "USD",
      currency: "USD",
      tint: crypto.code === "BTC" ? "#f97316" : crypto.code === "ETH" ? "#6366f1" : "#14b8a6",
      about: CRYPTO_ABOUT[crypto.code],
      defaultRange: "5y",
    };
  }

  const stock = STOCKS[symbol];
  if (stock) {
    const ccy = currencyForTicker(symbol);
    return {
      symbol,
      title: stock.name,
      category: "stocks",
      unitLabel: ccy ? `${ccy} per share` : "points",
      currency: ccy,
      tint: "#16a34a",
      defaultRange: "5y",
    };
  }

  if (symbol in STOCK_NAMES) {
    const ccy = currencyForTicker(symbol);
    return {
      symbol,
      title: STOCK_NAMES[symbol],
      category: "stocks",
      unitLabel: ccy ? `${ccy} per share` : "points",
      currency: ccy,
      tint: "#16a34a",
      defaultRange: "5y",
    };
  }

  if (/^[A-Z]{3}[A-Z]{3}=X$/.test(symbol)) {
    const { title, unitLabel } = fxLabel(symbol);
    return {
      symbol,
      title,
      category: "fx",
      unitLabel,
      tint: "#0891b2",
      defaultRange: "5y",
    };
  }

  // Unknown symbol — still render something sensible rather than erroring.
  return {
    symbol,
    title: symbol,
    category: "stocks",
    unitLabel: "USD",
    currency: "USD",
    tint: "#16a34a",
    defaultRange: "5y",
  };
}
