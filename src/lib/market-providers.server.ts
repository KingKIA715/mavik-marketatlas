// Provider adapters for metals, currency, stocks — with primary/backup failover.
// All return USD-denominated raw values; UI converts to display currency.

/* ----------------------------------------------------------- CURRENCY -- */

export interface Rates {
  base: "USD";
  rates: Record<string, number>; // 1 USD = rates[CCY]
}

async function ratesFromFrankfurter(): Promise<Rates> {
  const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
  const json = (await res.json()) as { base: string; rates: Record<string, number> };
  return { base: "USD", rates: { ...json.rates, USD: 1 } };
}

async function ratesFromExchangerateHost(): Promise<Rates> {
  const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
  if (!res.ok) throw new Error(`exchangerate-api ${res.status}`);
  const json = (await res.json()) as { rates: Record<string, number> };
  return { base: "USD", rates: { ...json.rates, USD: 1 } };
}

export async function fetchRates(): Promise<{ data: Rates; source: string }> {
  // Frankfurter (ECB) is authoritative but omits pegged currencies like AED.
  // ExchangeRate-API covers AED + many emerging-market currencies.
  // Run both in parallel and merge — Frankfurter wins for overlapping codes.
  const [primary, backup] = await Promise.allSettled([
    ratesFromFrankfurter(),
    ratesFromExchangerateHost(),
  ]);

  if (primary.status === "fulfilled" && backup.status === "fulfilled") {
    return {
      data: {
        base: "USD",
        rates: { ...backup.value.rates, ...primary.value.rates },
      },
      source: "Frankfurter + ExchangeRate-API",
    };
  }
  if (primary.status === "fulfilled") {
    return { data: primary.value, source: "Frankfurter (ECB)" };
  }
  if (backup.status === "fulfilled") {
    return { data: backup.value, source: "ExchangeRate-API" };
  }
  throw new Error("All FX providers failed");
}

/* -------------------------------------------------------------- METALS -- */

export interface MetalPrices {
  // USD per troy ounce
  XAU: number;
  XAG: number;
  XPT: number;
  HG: number; // copper — per pound from most APIs; we normalize to per-ounce equivalent
}

async function metalsFromGoldApi(): Promise<MetalPrices> {
  // gold-api.com — free, no key. One request per metal.
  const codes = ["XAU", "XAG", "XPT", "HG"] as const;
  const out: Partial<MetalPrices> = {};
  await Promise.all(
    codes.map(async (c) => {
      const res = await fetch(`https://api.gold-api.com/price/${c}`);
      if (!res.ok) throw new Error(`gold-api ${c} ${res.status}`);
      const json = (await res.json()) as { price: number };
      out[c] = json.price;
    }),
  );
  return out as MetalPrices;
}

async function metalsFromMetalpriceApi(key: string): Promise<MetalPrices> {
  const res = await fetch(
    `https://api.metalpriceapi.com/v1/latest?api_key=${encodeURIComponent(
      key,
    )}&base=USD&currencies=XAU,XAG,XPT,HG`,
  );
  if (!res.ok) throw new Error(`metalpriceapi ${res.status}`);
  const json = (await res.json()) as { success?: boolean; rates?: Record<string, number> };
  if (!json.rates) throw new Error("metalpriceapi: no rates");
  // rates are quoted as 1 USD = X metal — invert to USD/oz
  const inv = (v: number) => (v > 0 ? 1 / v : NaN);
  return {
    XAU: inv(json.rates.XAU),
    XAG: inv(json.rates.XAG),
    XPT: inv(json.rates.XPT),
    HG: inv(json.rates.HG),
  };
}

export async function fetchMetals(): Promise<{ data: MetalPrices; source: string }> {
  const key = process.env.METALPRICE_API_KEY;
  if (key) {
    try {
      return { data: await metalsFromMetalpriceApi(key), source: "MetalpriceAPI" };
    } catch (e) {
      console.warn("[metals] primary failed:", e);
    }
  }
  return { data: await metalsFromGoldApi(), source: "gold-api.com" };
}

/* -------------------------------------------------------------- STOCKS -- */

export interface Quote {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  previousClose: number;
}

async function quoteFromYahoo(ticker: string): Promise<Quote> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker,
  )}?interval=1d&range=5d`;
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; MarketAtlas/1.0; +https://lovable.dev)",
      accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`yahoo ${ticker} ${res.status}`);
  const json = (await res.json()) as {
    chart: {
      result?: Array<{
        meta: {
          regularMarketPrice: number;
          previousClose?: number;
          chartPreviousClose?: number;
          currency: string;
        };
      }>;
      error?: { description?: string } | null;
    };
  };
  const r = json.chart.result?.[0];
  if (!r) throw new Error(`yahoo ${ticker}: no result`);
  const price = r.meta.regularMarketPrice;
  const prev = r.meta.previousClose ?? r.meta.chartPreviousClose ?? price;
  const change = price - prev;
  return {
    ticker,
    price,
    previousClose: prev,
    change,
    changePercent: prev ? (change / prev) * 100 : 0,
    currency: r.meta.currency,
  };
}

export async function fetchQuotes(
  tickers: string[],
): Promise<{ data: Quote[]; source: string }> {
  const settled = await Promise.allSettled(tickers.map(quoteFromYahoo));
  const data = settled
    .filter((s): s is PromiseFulfilledResult<Quote> => s.status === "fulfilled")
    .map((s) => s.value);
  return { data, source: "Yahoo Finance" };
}
