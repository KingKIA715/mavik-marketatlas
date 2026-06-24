// Provider adapters for metals, currency, stocks, crude oil + history.
// All raw values are USD; UI converts to display currency.

/* ----------------------------------------------------------- HELPERS ----- */

/** Retry an async op with exponential backoff. */
async function withRetry<T>(
  label: string,
  op: () => Promise<T>,
  { tries = 3, baseMs = 250 }: { tries?: number; baseMs?: number } = {},
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await op();
    } catch (err) {
      lastErr = err;
      if (i === tries - 1) break;
      const delay = baseMs * 2 ** i + Math.floor(Math.random() * 100);
      console.warn(`[${label}] attempt ${i + 1} failed, retrying in ${delay}ms:`, err);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}


/* ----------------------------------------------------------- CURRENCY -- */

export interface Rates {
  base: "USD";
  rates: Record<string, number>;
}

async function ratesFromFrankfurter(): Promise<Rates> {
  const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
  const json = (await res.json()) as { rates: Record<string, number> };
  return { base: "USD", rates: { ...json.rates, USD: 1 } };
}

async function ratesFromExchangerateHost(): Promise<Rates> {
  const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
  if (!res.ok) throw new Error(`exchangerate-api ${res.status}`);
  const json = (await res.json()) as { rates: Record<string, number> };
  return { base: "USD", rates: { ...json.rates, USD: 1 } };
}

export async function fetchRates(): Promise<{ data: Rates; source: string }> {
  const [primary, backup] = await Promise.allSettled([
    ratesFromFrankfurter(),
    ratesFromExchangerateHost(),
  ]);
  if (primary.status === "fulfilled" && backup.status === "fulfilled") {
    return {
      data: { base: "USD", rates: { ...backup.value.rates, ...primary.value.rates } },
      source: "Frankfurter + ExchangeRate-API",
    };
  }
  if (primary.status === "fulfilled") return { data: primary.value, source: "Frankfurter (ECB)" };
  if (backup.status === "fulfilled") return { data: backup.value, source: "ExchangeRate-API" };
  throw new Error("All FX providers failed");
}

/** Yesterday's USD rates (most recent business day before today) for 24h FX change. */
export async function fetchRatesYesterday(): Promise<Rates> {
  // Frankfurter "?base=USD" without a date returns latest; using a date in URL.
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const iso = d.toISOString().slice(0, 10);
  try {
    const res = await fetch(`https://api.frankfurter.dev/v1/${iso}?base=USD`);
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const json = (await res.json()) as { rates: Record<string, number> };
    return { base: "USD", rates: { ...json.rates, USD: 1 } };
  } catch {
    return { base: "USD", rates: { USD: 1 } };
  }
}

/* -------------------------------------------------------------- METALS -- */

export interface MetalPrices {
  XAU: number; // USD/oz
  XAG: number;
  XPT: number;
}

async function metalsFromGoldApi(): Promise<MetalPrices> {
  const codes = ["XAU", "XAG", "XPT"] as const;
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
    )}&base=USD&currencies=XAU,XAG,XPT`,
  );
  if (!res.ok) throw new Error(`metalpriceapi ${res.status}`);
  const json = (await res.json()) as { rates?: Record<string, number> };
  if (!json.rates) throw new Error("metalpriceapi: no rates");
  const inv = (v: number) => (v > 0 ? 1 / v : NaN);
  return { XAU: inv(json.rates.XAU), XAG: inv(json.rates.XAG), XPT: inv(json.rates.XPT) };
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

/* --------------------------------------------------------------- YAHOO --- */

const YAHOO_HEADERS = {
  "user-agent": "Mozilla/5.0 (compatible; MarketAtlas/1.0; +https://lovable.dev)",
  accept: "application/json",
};

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
  const res = await fetch(url, { headers: YAHOO_HEADERS });
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

export async function fetchQuotes(tickers: string[]): Promise<{ data: Quote[]; source: string }> {
  const settled = await Promise.allSettled(tickers.map(quoteFromYahoo));
  const data = settled
    .filter((s): s is PromiseFulfilledResult<Quote> => s.status === "fulfilled")
    .map((s) => s.value);
  return { data, source: "Yahoo Finance" };
}

/* ----------------------------------------------------------- CRUDE OIL --- */

export interface Crude {
  pricePerBarrelUSD: number;
  change: number;
  changePercent: number;
}

export async function fetchCrude(): Promise<{ data: Crude; source: string }> {
  try {
    const q = await quoteFromYahoo("CL=F");
    return {
      data: { pricePerBarrelUSD: q.price, change: q.change, changePercent: q.changePercent },
      source: "Yahoo Finance (CL=F)",
    };
  } catch (e) {
    console.warn("[crude] failed:", e);
    return { data: { pricePerBarrelUSD: NaN, change: 0, changePercent: 0 }, source: "unavailable" };
  }
}

/* ----------------------------------------------------------- HISTORY ----- */

export interface HistoryPoint {
  date: string; // ISO yyyy-mm-dd
  close: number;
}

export async function fetchHistory(
  yahooSymbol: string,
  range = "5y",
  interval = "1mo",
): Promise<{ data: HistoryPoint[]; source: string }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    yahooSymbol,
  )}?interval=${interval}&range=${range}`;
  const res = await fetch(url, { headers: YAHOO_HEADERS });
  if (!res.ok) throw new Error(`yahoo history ${yahooSymbol} ${res.status}`);
  const json = (await res.json()) as {
    chart: {
      result?: Array<{
        timestamp: number[];
        indicators: { quote: Array<{ close: (number | null)[] }> };
      }>;
    };
  };
  const r = json.chart.result?.[0];
  if (!r) throw new Error(`yahoo history ${yahooSymbol}: no result`);
  const closes = r.indicators.quote[0].close;
  const data: HistoryPoint[] = [];
  for (let i = 0; i < r.timestamp.length; i++) {
    const c = closes[i];
    if (c == null) continue;
    data.push({
      date: new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10),
      close: c,
    });
  }
  return { data, source: "Yahoo Finance" };
}
