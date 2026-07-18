// Provider adapters for metals, currency, stocks, crypto, crude oil + history.
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
  return withRetry("frankfurter", async () => {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD", {
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const json = (await res.json()) as { rates: Record<string, number> };
    return { base: "USD" as const, rates: { ...json.rates, USD: 1 } };
  });
}

async function ratesFromExchangerateHost(): Promise<Rates> {
  return withRetry("exchangerate-api", async () => {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    if (!res.ok) throw new Error(`exchangerate-api ${res.status}`);
    const json = (await res.json()) as { rates: Record<string, number> };
    return { base: "USD" as const, rates: { ...json.rates, USD: 1 } };
  });
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
    codes.map((c) =>
      withRetry(`gold-api:${c}`, async () => {
        const res = await fetch(`https://api.gold-api.com/price/${c}`);
        if (!res.ok) throw new Error(`gold-api ${c} ${res.status}`);
        const json = (await res.json()) as { price: number };
        out[c] = json.price;
      }),
    ),
  );
  return out as MetalPrices;
}

async function metalsFromMetalpriceApi(key: string): Promise<MetalPrices> {
  return withRetry("metalpriceapi", async () => {
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
  });
}

async function metalsFromMetalsDev(key: string): Promise<MetalPrices> {
  return withRetry("metals.dev", async () => {
    const res = await fetch(
      `https://api.metals.dev/v1/latest?api_key=${encodeURIComponent(
        key,
      )}&currency=USD&unit=toz`,
    );
    if (!res.ok) throw new Error(`metals.dev ${res.status}`);
    const json = (await res.json()) as {
      status?: string;
      metals?: { gold?: number; silver?: number; platinum?: number };
    };
    const m = json.metals;
    if (!m || typeof m.gold !== "number") throw new Error("metals.dev: no metals payload");
    return {
      XAU: m.gold,
      XAG: typeof m.silver === "number" ? m.silver : NaN,
      XPT: typeof m.platinum === "number" ? m.platinum : NaN,
    };
  });
}

function pickKeyIndex(day = new Date().getUTCDate()): number {
  if (day <= 10) return 0;
  if (day <= 20) return 1;
  return 2;
}

function getMetalsDevKeys(): string[] {
  return [
    process.env.METALS_DEV_API_KEY,
    process.env.METALS_DEV_API_KEY_2,
    process.env.METALS_DEV_API_KEY_3,
  ].filter((k): k is string => Boolean(k && k.length > 0));
}

function getMetalpriceKeys(): string[] {
  return [
    process.env.METALPRICE_API_KEY,
    process.env.METALPRICE_API_KEY_2,
    process.env.METALPRICE_API_KEY_3,
  ].filter((k): k is string => Boolean(k && k.length > 0));
}

function rotatedOrder<T>(items: T[]): T[] {
  if (items.length === 0) return items;
  const start = Math.min(pickKeyIndex(), items.length - 1);
  const idxOrder = [start, ...items.map((_, i) => i).filter((i) => i !== start)];
  return idxOrder.map((i) => items[i]);
}

export async function fetchMetals(): Promise<{ data: MetalPrices; source: string }> {
  const mdKeys = getMetalsDevKeys();
  for (const key of rotatedOrder(mdKeys)) {
    try {
      const data = await metalsFromMetalsDev(key);
      const slot = mdKeys.indexOf(key) + 1;
      return { data, source: `Metals.dev (key ${slot}/${mdKeys.length})` };
    } catch (e) {
      console.warn(`[metals] metals.dev key slot failed:`, e);
    }
  }

  const mpKeys = getMetalpriceKeys();
  for (const key of rotatedOrder(mpKeys)) {
    try {
      const data = await metalsFromMetalpriceApi(key);
      const slot = mpKeys.indexOf(key) + 1;
      return { data, source: `MetalpriceAPI fallback (key ${slot}/${mpKeys.length})` };
    } catch (e) {
      console.warn(`[metals] metalpriceapi key slot failed:`, e);
    }
  }

  return { data: await metalsFromGoldApi(), source: "gold-api.com" };
}

/* --------------------------------------------------------------- CRYPTO -- */

export interface CryptoPrices {
  BTC: number;
  ETH: number;
  SOL: number;
}

export interface CryptoChange {
  BTC: { change: number; changePercent: number };
  ETH: { change: number; changePercent: number };
  SOL: { change: number; changePercent: number };
}

export async function fetchCrypto(): Promise<{
  data: CryptoPrices;
  changes: CryptoChange;
  source: string;
}> {
  const symbols = ["BTC-USD", "ETH-USD", "SOL-USD"];
  const quotes = await fetchQuotes(symbols);

  const find = (sym: string) =>
    quotes.data.find((q) => q.ticker === sym) ?? {
      ticker: sym,
      price: NaN,
      change: 0,
      changePercent: 0,
    };

  const btc = find("BTC-USD");
  const eth = find("ETH-USD");
  const sol = find("SOL-USD");

  return {
    data: {
      BTC: btc.price,
      ETH: eth.price,
      SOL: sol.price,
    },
    changes: {
      BTC: { change: btc.change, changePercent: btc.changePercent },
      ETH: { change: eth.change, changePercent: eth.changePercent },
      SOL: { change: sol.change, changePercent: sol.changePercent },
    },
    source: quotes.source,
  };
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
  return withRetry(`yahoo:${ticker}`, async () => {
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
  });
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
  date: string;
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

/* ----------------------------------------------------- MUTUAL FUNDS (India) --- */
// AMFI mutual fund NAV data via mfapi.in — free, no API key required.

export interface MFSearchResult {
  schemeCode: number;
  schemeName: string;
}

export async function searchMF(query: string): Promise<{ data: MFSearchResult[]; source: string }> {
  try {
    const json = await withRetry("mf-search", async () => {
      const r = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`, {
        headers: { accept: "application/json" },
      });
      if (!r.ok) throw new Error(`mfapi search ${r.status}`);
      return (await r.json()) as unknown;
    });
    const arr = Array.isArray(json) ? json : [];
    const data: MFSearchResult[] = arr
      .slice(0, 15)
      .map((x: { schemeCode?: number | string; schemeName?: string }) => ({
        schemeCode: Number(x.schemeCode),
        schemeName: String(x.schemeName ?? ""),
      }))
      .filter((x) => Number.isFinite(x.schemeCode) && x.schemeName);
    return { data, source: "AMFI via mfapi.in" };
  } catch (e) {
    console.warn("[mf-search] failed:", e);
    return { data: [], source: "unavailable" };
  }
}

export interface MFNav {
  schemeCode: number;
  schemeName: string;
  fundHouse?: string;
  nav: number;
  navDate: string;
  change: number;
  changePercent: number;
}

export async function fetchMFNav(schemeCode: number): Promise<{ data: MFNav | null; source: string }> {
  try {
    const json = await withRetry("mf-nav", async () => {
      const r = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
        headers: { accept: "application/json" },
      });
      if (!r.ok) throw new Error(`mfapi nav ${r.status}`);
      return (await r.json()) as {
        meta?: { scheme_name?: string; fund_house?: string };
        data?: Array<{ date: string; nav: string }>;
      };
    });
    const rows = Array.isArray(json?.data) ? json.data : [];
    if (rows.length === 0) return { data: null, source: "unavailable" };
    const latest = rows[0];
    const prev = rows[1];
    const nav = parseFloat(latest.nav);
    const prevNav = prev ? parseFloat(prev.nav) : NaN;
    const change = Number.isFinite(prevNav) ? nav - prevNav : 0;
    const changePercent = Number.isFinite(prevNav) && prevNav !== 0 ? (change / prevNav) * 100 : 0;
    return {
      data: {
        schemeCode,
        schemeName: json?.meta?.scheme_name ?? String(schemeCode),
        fundHouse: json?.meta?.fund_house,
        nav,
        navDate: latest.date,
        change,
        changePercent,
      },
      source: "AMFI via mfapi.in",
    };
  } catch (e) {
    console.warn("[mf-nav] failed:", e);
    return { data: null, source: "unavailable" };
  }
}
