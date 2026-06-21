import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { cached, ONE_HOUR, FIFTEEN_MIN } from "./market-cache.server";
import {
  fetchMetals,
  fetchQuotes,
  fetchRates,
  fetchCrude,
  fetchHistory,
  type Crude,
  type HistoryPoint,
  type MetalPrices,
  type Quote,
  type Rates,
} from "./market-providers.server";
import { COUNTRIES } from "./market-config";

export interface MarketSnapshot {
  fetchedAt: string;
  rates: Rates;
  ratesSource: string;
  metals: MetalPrices;
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

export const getMarketSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketSnapshot> => {
    setResponseHeader(
      "cache-control",
      "public, max-age=900, stale-while-revalidate=86400",
    );

    const [ratesR, metalsR, indicesR, basketR, crudeR] = await Promise.all([
      cached("rates", ONE_HOUR, fetchRates),
      cached("metals", ONE_HOUR, fetchMetals),
      cached("indices", FIFTEEN_MIN, () => fetchQuotes(ALL_INDICES)),
      cached("basket", FIFTEEN_MIN, () => fetchQuotes(ALL_BASKET)),
      cached("crude", FIFTEEN_MIN, fetchCrude),
    ]);

    // Group basket results per country
    const baskets: Record<string, Quote[]> = {};
    for (const [code, def] of Object.entries(COUNTRIES)) {
      baskets[code] = basketR.data.filter((q) => def.stockBasket.includes(q.ticker));
    }

    return {
      fetchedAt: new Date().toISOString(),
      rates: ratesR.data,
      ratesSource: ratesR.source,
      metals: metalsR.data,
      metalsSource: metalsR.source,
      quotes: indicesR.data,
      quotesSource: indicesR.source,
      baskets,
      crude: crudeR.data,
      crudeSource: crudeR.source,
    };
  },
);

/* ----------------------------- Metal history (lazy) ----------------------- */

export const getMetalHistory = createServerFn({ method: "GET" })
  .inputValidator((data: { symbol: string }) => {
    if (!/^[A-Z]{1,3}=F$/.test(data.symbol)) {
      throw new Error("Invalid symbol");
    }
    return data;
  })
  .handler(async ({ data }): Promise<{ data: HistoryPoint[]; source: string }> => {
    setResponseHeader("cache-control", "public, max-age=86400, stale-while-revalidate=604800");
    return cached(`hist:${data.symbol}`, 24 * ONE_HOUR, () => fetchHistory(data.symbol, "5y", "1mo"));
  });
