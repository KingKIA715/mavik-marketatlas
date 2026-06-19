import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { cached, ONE_HOUR, FIFTEEN_MIN } from "./market-cache.server";
import {
  fetchMetals,
  fetchQuotes,
  fetchRates,
  type MetalPrices,
  type Quote,
  type Rates,
} from "./market-providers.server";

export interface MarketSnapshot {
  fetchedAt: string;
  rates: Rates;
  ratesSource: string;
  metals: MetalPrices;
  metalsSource: string;
  quotes: Quote[];
  quotesSource: string;
}

const TICKERS = [
  "^NSEI",
  "^BSESN",
  "^GSPC",
  "^IXIC",
  "^DJI",
  "^FTSE",
  "^DFMGI",
  "^STOXX50E",
];

export const getMarketSnapshot = createServerFn({ method: "GET" }).handler(
  async (): Promise<MarketSnapshot> => {
    // 1h browser cache too — UI revalidates on focus.
    setResponseHeader(
      "cache-control",
      "public, max-age=3600, stale-while-revalidate=86400",
    );

    const [ratesR, metalsR, quotesR] = await Promise.all([
      cached("rates", ONE_HOUR, fetchRates),
      cached("metals", ONE_HOUR, fetchMetals),
      cached("quotes", FIFTEEN_MIN, () => fetchQuotes(TICKERS)),
    ]);

    return {
      fetchedAt: new Date().toISOString(),
      rates: ratesR.data,
      ratesSource: ratesR.source,
      metals: metalsR.data,
      metalsSource: metalsR.source,
      quotes: quotesR.data,
      quotesSource: quotesR.source,
    };
  },
);
