import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { cached, ONE_HOUR, FIFTEEN_MIN } from "./market-cache.server";
import {
  fetchMetals,
  fetchQuotes,
  fetchRates,
  fetchRatesYesterday,
  fetchCrude,
  fetchHistory,
  type Crude,
  type HistoryPoint,
  type MetalPrices,
  type Quote,
  type Rates,
} from "./market-providers.server";
import { COUNTRIES, type MetalCode } from "./market-config";

export interface MarketSnapshot {
  fetchedAt: string;
  rates: Rates;
  ratesYesterday: Rates;
  ratesSource: string;
  metals: MetalPrices;
  /** 24h change for each metal (percent) derived from Yahoo futures. */
  metalsChange: Record<MetalCode, { change: number; changePercent: number }>;
  metalsSource: string;
  /** Major indices (one fetch shared across countries). */
  quotes: Quote[];
  quotesSource: string;
  /** Per-country basket quotes for top gainers/losers. */
  baskets: Record<string, Quote[]>;
  crude: Crude;
  crudeSource: string;
}

const ALL_INDICES = Array.from(
  new Set(Object.values(COUNTRIES).flatMap((c) => c.stockIndices)),
);

const ALL_BASKET = Array.from(
  new Set(Object.values(COUNTRIES).flatMap((c) => c.stockBasket)),
);

const METAL_SYMBOLS: Record<MetalCode, string> = {
  XAU: "GC=F",
  XAG: "SI=F",
  XPT: "PL=F",
};

export const getMarketSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketSnapshot> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=900, stale-while-revalidate=86400",
    );

    const [ratesR, ratesYR, metalsR, indicesR, basketR, crudeR, metalQuotesR] = await Promise.all([
      cached("rates", ONE_HOUR, fetchRates),
      cached("rates-yesterday", ONE_HOUR, fetchRatesYesterday),
      cached("metals", ONE_HOUR, fetchMetals),
      cached("indices", FIFTEEN_MIN, () => fetchQuotes(ALL_INDICES)),
      cached("basket", FIFTEEN_MIN, () => fetchQuotes(ALL_BASKET)),
      cached("crude", FIFTEEN_MIN, fetchCrude),
      cached("metal-quotes", FIFTEEN_MIN, () => fetchQuotes(Object.values(METAL_SYMBOLS))),
    ]);

    const baskets: Record<string, Quote[]> = {};
    for (const [code, def] of Object.entries(COUNTRIES)) {
      baskets[code] = basketR.data.filter((q) => def.stockBasket.includes(q.ticker));
    }

    const metalsChange = {} as Record<MetalCode, { change: number; changePercent: number }>;
    (Object.keys(METAL_SYMBOLS) as MetalCode[]).forEach((code) => {
      const q = metalQuotesR.data.find((x) => x.ticker === METAL_SYMBOLS[code]);
      metalsChange[code] = q
        ? { change: q.change, changePercent: q.changePercent }
        : { change: 0, changePercent: 0 };
    });

    return {
      fetchedAt: new Date().toISOString(),
      rates: ratesR.data,
      ratesYesterday: ratesYR,
      ratesSource: ratesR.source,
      metals: metalsR.data,
      metalsChange,
      metalsSource: metalsR.source,
      quotes: indicesR.data,
      quotesSource: indicesR.source,
      baskets,
      crude: crudeR.data,
      crudeSource: crudeR.source,
    };
  },
);

/* ----------------------------- History (lazy) ---------------------------- */

// Allow Yahoo symbols for futures (GC=F), indices (^GSPC, ^NSEI, 000001.SS),
// equities (AAPL, RELIANCE.NS, 7203.T), and FX pairs (EURUSD=X).
const SYMBOL_RE = /^[\^A-Z0-9.=-]{1,16}$/;
const RANGE_RE = /^(1mo|3mo|6mo|1y|2y|5y|10y|ytd|max)$/;
const INTERVAL_RE = /^(1d|1wk|1mo)$/;

export const getHistory = createServerFn({ method: "GET" })
  .inputValidator((data: { symbol: string; range?: string; interval?: string }) => {
    if (!SYMBOL_RE.test(data.symbol)) throw new Error("Invalid symbol");
    const range = data.range ?? "5y";
    const interval = data.interval ?? "1mo";
    if (!RANGE_RE.test(range)) throw new Error("Invalid range");
    if (!INTERVAL_RE.test(interval)) throw new Error("Invalid interval");
    return { symbol: data.symbol, range, interval };
  })
  .handler(async ({ data }): Promise<{ data: HistoryPoint[]; source: string }> => {
    setResponseHeader("cache-control", "public, max-age=86400, stale-while-revalidate=604800");
    return cached(
      `hist:${data.symbol}:${data.range}:${data.interval}`,
      24 * ONE_HOUR,
      () => fetchHistory(data.symbol, data.range, data.interval),
    );
  });

