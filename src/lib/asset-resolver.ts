import type { MarketSnapshot } from "./market.functions";
import {
  METALS,
  CRYPTOS,
  STOCKS,
  CURRENCY_NAMES,
  CURRENCY_FLAGS,
  GRAMS_PER_TROY_OUNCE,
  RETAIL_PREMIUM,
  INDIA_GST,
  COUNTRIES,
  type CountryCode,
  type MetalCode,
  type CryptoCode,
} from "./market-config";

export type AssetCategory = "metals" | "crypto" | "stocks" | "fx";

export interface AssetRef {
  key: string; // "<category>:<id>"
  category: AssetCategory;
  label: string;
  emoji: string;
  sub: string;
}

const METAL_EMOJI: Record<MetalCode, string> = { XAU: "🪙", XAG: "🥈", XPT: "⚪" };

/** All instruments searchable/pinnable/alertable for a given country. */
export function buildAssetIndex(country: CountryCode): AssetRef[] {
  const def = COUNTRIES[country];
  const list: AssetRef[] = [];

  METALS.forEach((m) =>
    list.push({ key: `metals:${m.code}`, category: "metals", label: m.name, emoji: METAL_EMOJI[m.code], sub: "Precious metal" }),
  );
  CRYPTOS.forEach((c) =>
    list.push({ key: `crypto:${c.code}`, category: "crypto", label: c.name, emoji: c.icon, sub: "Crypto" }),
  );
  def.stockIndices.forEach((ticker) =>
    list.push({
      key: `stocks:${ticker}`,
      category: "stocks",
      label: STOCKS[ticker]?.name ?? ticker,
      emoji: "📈",
      sub: `${def.name} index`,
    }),
  );
  Object.keys(CURRENCY_NAMES).forEach((code) => {
    if (code === def.currency) return;
    list.push({
      key: `fx:${code}`,
      category: "fx",
      label: `${def.currency}/${code}`,
      emoji: CURRENCY_FLAGS[code] || "💱",
      sub: CURRENCY_NAMES[code] ?? code,
    });
  });

  return list;
}

export interface ResolvedAsset {
  key: string;
  label: string;
  emoji: string;
  changePercent: number;
  /** Current displayed value — same figure shown on that asset's card. Null if unavailable. */
  price: number | null;
  currency: string;
  assetFilter: AssetCategory;
}

/**
 * Resolves a pin/alert/search key against a live snapshot, reproducing the
 * exact same displayed price each card already computes (so alert thresholds
 * and pinned values always match what the user sees elsewhere on the page).
 */
export function resolveAsset(
  key: string,
  data: MarketSnapshot,
  country: CountryCode,
  opts: { toLocal: (usd: number) => number; includeGST: boolean },
): ResolvedAsset | null {
  const def = COUNTRIES[country];
  const sep = key.indexOf(":");
  if (sep === -1) return null;
  const category = key.slice(0, sep) as AssetCategory;
  const id = key.slice(sep + 1);

  if (category === "metals") {
    const code = id as MetalCode;
    const chg = data.metalsChange[code];
    const m = METALS.find((x) => x.code === code);
    const spotUsdOz = data.metals[code];
    if (!chg || !m || !Number.isFinite(spotUsdOz)) return null;
    const spotUsdG = spotUsdOz / GRAMS_PER_TROY_OUNCE;
    const premium = RETAIL_PREMIUM[country]?.[code] ?? 1;
    const gstMul = country === "IN" && opts.includeGST ? 1 + INDIA_GST : 1;
    const price = opts.toLocal(spotUsdG) * premium * gstMul;
    return {
      key,
      label: m.name,
      emoji: METAL_EMOJI[code],
      changePercent: chg.changePercent,
      price,
      currency: def.currency,
      assetFilter: "metals",
    };
  }

  if (category === "crypto") {
    const code = id as CryptoCode;
    const chg = data.cryptoChange[code];
    const c = CRYPTOS.find((x) => x.code === code);
    const usd = data.crypto[code];
    if (!chg || !c || !Number.isFinite(usd)) return null;
    return {
      key,
      label: c.name,
      emoji: c.icon,
      changePercent: chg.changePercent,
      price: opts.toLocal(usd),
      currency: def.currency,
      assetFilter: "crypto",
    };
  }

  if (category === "stocks") {
    const q = data.quotes.find((x) => x.ticker === id);
    if (!q) return null;
    return {
      key,
      label: STOCKS[id]?.name ?? id,
      emoji: "📈",
      changePercent: q.changePercent,
      price: q.price,
      currency: q.currency,
      assetFilter: "stocks",
    };
  }

  if (category === "fx") {
    const ccy = id;
    const baseRate = data.rates.rates[def.currency];
    const baseRateY = data.ratesYesterday.rates[def.currency];
    const rate = data.rates.rates[ccy];
    const rateY = data.ratesYesterday.rates[ccy];
    if (!rate || !rateY || !baseRate || !baseRateY) return null;
    const perBase = rate / baseRate;
    const perBaseY = rateY / baseRateY;
    const changePercent = perBaseY !== 0 ? ((perBase - perBaseY) / perBaseY) * 100 : 0;
    return {
      key,
      label: `${def.currency}/${ccy}`,
      emoji: CURRENCY_FLAGS[ccy] || "💱",
      changePercent,
      price: perBase,
      currency: ccy,
      assetFilter: "fx",
    };
  }

  return null;
}
