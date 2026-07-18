import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { cached, clearCache, ONE_HOUR, FIFTEEN_MIN } from "./market-cache.server";
import {
  fetchMetals,
  fetchQuotes,
  fetchRates,
  fetchRatesYesterday,
  fetchCrude,
  fetchCrypto,
  fetchHistory,
  searchMF,
  fetchMFNav,
  fetchNews,
  type Crude,
  type CryptoPrices,
  type CryptoChange,
  type HistoryPoint,
  type MetalPrices,
  type Quote,
  type Rates,
} from "./market-providers.server";
import { COUNTRIES, type MetalCode, type CryptoCode, type CountryCode } from "./market-config";

export interface MarketSnapshot {
  fetchedAt: string;
  rates: Rates;
  ratesYesterday: Rates;
  ratesSource: string;
  metals: MetalPrices;
  metalsChange: Record<MetalCode, { change: number; changePercent: number }>;
  metalsSource: string;
  crypto: CryptoPrices;
  cryptoChange: CryptoChange;
  cryptoSource: string;
  quotes: Quote[];
  quotesSource: string;
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

    const [ratesR, ratesYR, metalsR, indicesR, basketR, crudeR, metalQuotesR, cryptoR] = await Promise.all([
      cached("rates", ONE_HOUR, fetchRates),
      cached("rates-yesterday", ONE_HOUR, fetchRatesYesterday),
      cached("metals", ONE_HOUR, fetchMetals),
      cached("indices", FIFTEEN_MIN, () => fetchQuotes(ALL_INDICES)),
      cached("basket", FIFTEEN_MIN, () => fetchQuotes(ALL_BASKET)),
      cached("crude", FIFTEEN_MIN, fetchCrude),
      cached("metal-quotes", FIFTEEN_MIN, () => fetchQuotes(Object.values(METAL_SYMBOLS))),
      cached("crypto", FIFTEEN_MIN, fetchCrypto),
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
      crypto: cryptoR.data,
      cryptoChange: cryptoR.changes,
      cryptoSource: cryptoR.source,
      quotes: indicesR.data,
      quotesSource: indicesR.source,
      baskets,
      crude: crudeR.data,
      crudeSource: crudeR.source,
    };
  },
);

export const triggerSync = createServerFn({ method: "POST" }).handler(async () => {
  const startedAt = Date.now();
  const cleared = clearCache();
  try {
    const snap = await getMarketSnapshot();
    return {
      ok: true as const,
      cleared,
      durationMs: Date.now() - startedAt,
      fetchedAt: snap.fetchedAt,
      sources: {
        rates: snap.ratesSource,
        metals: snap.metalsSource,
        crypto: snap.cryptoSource,
        quotes: snap.quotesSource,
        crude: snap.crudeSource,
      },
    };
  } catch (err) {
    return {
      ok: false as const,
      cleared,
      durationMs: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
});

const SYMBOL_RE = /^[\^A-Z0-9.=-]{1,20}$/;
const RANGE_RE = /^(1mo|3mo|6mo|1y|2y|5y|10y|ytd|max)$/;
const INTERVAL_RE = /^(1d|1wk|1mo)$/;
const ALIGN_METALS = ["XAU", "XAG", "XPT"] as const;
type AlignMetal = (typeof ALIGN_METALS)[number];

export const getHistory = createServerFn({ method: "GET" })
  .inputValidator(
    (data: { symbol: string; range?: string; interval?: string; alignMetal?: string }) => {
      if (!SYMBOL_RE.test(data.symbol)) throw new Error("Invalid symbol");
      const range = data.range ?? "5y";
      const interval = data.interval ?? "1mo";
      if (!RANGE_RE.test(range)) throw new Error("Invalid range");
      if (!INTERVAL_RE.test(interval)) throw new Error("Invalid interval");
      const alignMetal =
        data.alignMetal && (ALIGN_METALS as readonly string[]).includes(data.alignMetal)
          ? (data.alignMetal as AlignMetal)
          : undefined;
      return { symbol: data.symbol, range, interval, alignMetal };
    },
  )
  .handler(async ({ data }): Promise<{ data: HistoryPoint[]; source: string }> => {
    setResponseHeader("cache-control", "public, max-age=86400, stale-while-revalidate=604800");
    const base = await cached(
      `hist:${data.symbol}:${data.range}:${data.interval}`,
      24 * ONE_HOUR,
      () => fetchHistory(data.symbol, data.range, data.interval),
    );

    if (!data.alignMetal || base.data.length === 0) return base;
    try {
      const metals = await cached("metals", ONE_HOUR, fetchMetals);
      const spot = metals.data[data.alignMetal];
      const lastClose = base.data[base.data.length - 1].close;
      if (!Number.isFinite(spot) || !Number.isFinite(lastClose) || lastClose <= 0) return base;
      const factor = spot / lastClose;
      if (Math.abs(factor - 1) < 1e-6) {
        return { data: base.data, source: `${base.source} · aligned to ${metals.source}` };
      }
      const rescaled = base.data.map((p) => ({ date: p.date, close: p.close * factor }));
      return {
        data: rescaled,
        source: `${base.source} · aligned to ${metals.source} spot`,
      };
    } catch {
      return base;
    }
  });

const MF_QUERY_RE = /^[a-zA-Z0-9 .&'-]{2,60}$/;

export const searchMutualFunds = createServerFn({ method: "GET" })
  .inputValidator((data: { q: string }) => {
    const q = (data.q ?? "").trim();
    if (!MF_QUERY_RE.test(q)) throw new Error("Invalid query");
    return { q };
  })
  .handler(async ({ data }) => {
    setResponseHeader("cache-control", "public, max-age=3600, stale-while-revalidate=86400");
    return cached(`mf-search:${data.q.toLowerCase()}`, ONE_HOUR, () => searchMF(data.q));
  });

export const getMutualFundNav = createServerFn({ method: "GET" })
  .inputValidator((data: { schemeCode: number }) => {
    const schemeCode = Number(data.schemeCode);
    if (!Number.isInteger(schemeCode) || schemeCode <= 0) throw new Error("Invalid scheme code");
    return { schemeCode };
  })
  .handler(async ({ data }) => {
    setResponseHeader("cache-control", "public, max-age=3600, stale-while-revalidate=86400");
    return cached(`mf-nav:${data.schemeCode}`, ONE_HOUR, () => fetchMFNav(data.schemeCode));
  });

export const getNews = createServerFn({ method: "GET" })
  .inputValidator((data: { country: string }) => {
    const country = data.country as CountryCode;
    if (!(country in COUNTRIES)) throw new Error("Invalid country");
    return { country };
  })
  .handler(async ({ data }) => {
    setResponseHeader("cache-control", "public, max-age=900, stale-while-revalidate=3600");
    return cached(`news:${data.country}`, FIFTEEN_MIN, () => fetchNews(data.country));
  });
