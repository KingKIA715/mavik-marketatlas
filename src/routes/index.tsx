import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  COUNTRIES,
  COUNTRY_ORDER,
  COUNTRY_SHORT,
  FUEL_REFERENCE,
  FUEL_SPREAD,
  GRAMS_PER_KG,
  GRAMS_PER_SOVEREIGN,
  GRAMS_PER_TROY_OUNCE,
  INDIA_GST,
  KARAT_PURITY,
  METALS,
  RETAIL_PREMIUM,
  STOCKS,
  STOCK_NAMES,
  CRYPTOS,
  CURRENCY_FLAGS,
  CURRENCY_NAMES,
  type CountryCode,
  type MetalCode,
  type CryptoCode,
} from "@/lib/market-config";
import { getMarketSnapshot, triggerSync, getNews, type MarketSnapshot } from "@/lib/market.functions";
import { useAutoScroll } from "@/lib/use-auto-scroll";
import { MarqueeRow } from "@/components/MarqueeRow";
import { usePinned, usePriceAlerts, type PriceAlert } from "@/lib/use-watchlist";
import { buildAssetIndex, resolveAsset, type AssetRef } from "@/lib/asset-resolver";
import { fmtCurrency, fmtNumber, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { HistoryDialog } from "@/components/HistoryDialog";
import { GoldDutyCalculator } from "@/components/GoldDutyCalculator";
import { MobileNav } from "@/components/MobileNav";
import {
  LineChart as LineChartIcon,
  TrendingDown,
  TrendingUp,
  Fuel,
  Calculator,
  X,
  Newspaper,
  ExternalLink,
  Star,
  Search as SearchIcon,
  Bell,
  Plus,
  Trash2,
} from "lucide-react";

import {
  MetalRowSkeleton,
  IndexCardSkeleton,
  MoversListSkeleton,
  FuelTileSkeleton,
  CurrencyTileSkeleton,
  CryptoCardSkeleton,
} from "@/components/SkeletonLoaders";
import { Header, Footer } from "@/components/Layout";

const snapshotQuery = (fetcher: () => Promise<MarketSnapshot>, refetchIntervalMs: number | false = false) =>
  queryOptions({
    queryKey: ["market-snapshot"],
    queryFn: fetcher,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: refetchIntervalMs,
  });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarketAtlas — Global Financial Hub for Common People" },
      {
        name: "description",
        content:
          "Live gold, silver, platinum, crypto prices, stock indices, fuel rates and currency exchange across India, US, Europe, UK, Japan,China and UAE. refreshed hourly.",
      },
      { property: "og:title", content: "MarketAtlas — Global Financial Hub for Common People" },
      {
        property: "og:description",
        content:
          "Live gold, silver, platinum, crypto prices, stock indices, fuel rates and currency exchange across India, US, Europe, UK, Japan,China and UAE. refreshed hourly.",
      },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(snapshotQuery(getMarketSnapshot)),
  component: Dashboard,
});

/* =====================================================================
 * MAIN DASHBOARD
 * ===================================================================== */

function Dashboard() {
  const fetcher = useServerFn(getMarketSnapshot);
  const { alerts, add: addAlert, remove: removeAlert, markFired } = usePriceAlerts();
  const hasActiveAlerts = alerts.some((a) => !a.firedAt);
  const { data, isLoading } = useSuspenseQuery(snapshotQuery(fetcher, hasActiveAlerts ? 5 * 60 * 1000 : false));
  const { pinned, toggle: togglePinned, isPinned } = usePinned();
  const [country, setCountry] = useState<CountryCode>("IN");
  const [selectedAsset, setSelectedAsset] = useState<"metals" | "crypto" | "stocks" | "crude" | "fx" | null>(null);
  const [includeGST, setIncludeGST] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const p = params.get("country")?.toUpperCase();
    if (p && p in COUNTRIES) {
      if (p !== country) setCountry(p as CountryCode);
      return;
    }
    // No explicit ?country= — guess a sensible default from the visitor's locale/timezone
    // rather than always opening on India.
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const lang = (navigator.language || "").toLowerCase();
      let guess: CountryCode | null = null;
      if (tz.startsWith("America/") || lang.endsWith("-us")) guess = "US";
      else if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta" || lang.endsWith("-in")) guess = "IN";
      if (guess && guess !== country) setCountry(guess);
    } catch {
      // Intl/navigator unavailable — keep the default.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("country") !== country) {
      url.searchParams.set("country", country);
      window.history.replaceState({}, "", url.toString());
    }
  }, [country]);

  const def = COUNTRIES[country];
  const usdTo = (ccy: string) => data.rates.rates[ccy] ?? NaN;
  const fx = usdTo(def.currency);
  const toLocal = (usd: number) => usd * fx;

  // Check active alerts against the latest snapshot and fire a local
  // notification when a threshold is crossed. This only works while the app
  // has been opened recently enough for a refresh to run — there's no
  // server-side push infrastructure behind this (no persistence layer
  // exists in this app), so it's not a true "notify me even when closed"
  // push alert.
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    for (const alert of alerts) {
      if (alert.firedAt) continue;
      const resolved = resolveAsset(alert.assetKey, data, country, { toLocal, includeGST });
      if (!resolved || resolved.price == null) continue;
      const crossed =
        alert.condition === "above" ? resolved.price >= alert.threshold : resolved.price <= alert.threshold;
      if (!crossed) continue;
      try {
        navigator.serviceWorker?.ready.then((reg) => {
          reg.showNotification(`${alert.label} ${alert.condition === "above" ? "crossed above" : "dropped below"} ${fmtCurrency(alert.threshold, alert.currency, { maximumFractionDigits: 2 })}`, {
            body: `Now ${fmtCurrency(resolved.price!, resolved.currency, { maximumFractionDigits: 2 })}`,
            icon: "/icons/icon-192.png",
          });
        }).catch(() => {
          new Notification(`${alert.label} alert`, {
            body: `Now ${fmtCurrency(resolved.price!, resolved.currency, { maximumFractionDigits: 2 })}`,
          });
        });
      } catch {
        // Notification dispatch failed — still mark fired so we don't retry forever
      }
      markFired(alert.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, alerts, country, includeGST]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header fetchedAt={data.fetchedAt} locale={def.locale} showBackLink="resources" />

      <TodaySnapshot data={data} country={country} onJump={setSelectedAsset} />

      <SearchAndAlerts
        country={country}
        data={data}
        toLocal={toLocal}
        includeGST={includeGST}
        alerts={alerts}
        onAddAlert={(a) => {
          addAlert(a);
          if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
          }
        }}
        onRemoveAlert={removeAlert}
        onJump={setSelectedAsset}
      />

      {pinned.length > 0 ? (
        <PinnedBar pinned={pinned} data={data} country={country} toLocal={toLocal} includeGST={includeGST} onUnpin={togglePinned} onJump={setSelectedAsset} />
      ) : null}

      <CountryTiles country={country} onChange={setCountry} />

      <AssetTiles selectedAsset={selectedAsset} onChange={setSelectedAsset} />

      <main
        suppressHydrationWarning
        className="mx-auto max-w-6xl space-y-12 px-4 pb-16 pt-6 sm:px-6 sm:pt-8"
      >
        {(!selectedAsset || selectedAsset === "metals") && (
          <PreciousMetals
            country={country}
            metals={data.metals}
            metalsChange={data.metalsChange}
            toLocal={toLocal}
            fx={fx}
            currency={def.currency}
            includeGST={includeGST}
            onGSTChange={setIncludeGST}
            isLoading={isLoading}
            usdRates={data.rates.rates}
            isPinned={isPinned}
            onTogglePin={togglePinned}
          />
        )}
        {(!selectedAsset || selectedAsset === "stocks") && (
          <StockMarket
            country={country}
            quotes={data.quotes}
            basket={data.baskets[country] ?? []}
            isLoading={isLoading}
            isPinned={isPinned}
            onTogglePin={togglePinned}
          />
        )}
        {(!selectedAsset || selectedAsset === "crypto") && (
          <CryptoSection
            crypto={data.crypto}
            cryptoChange={data.cryptoChange}
            toLocal={toLocal}
            currency={def.currency}
            isLoading={isLoading}
            isPinned={isPinned}
            onTogglePin={togglePinned}
          />
        )}
        {(!selectedAsset || selectedAsset === "fx") && (
          <Currencies
            rates={data.rates.rates}
            ratesYesterday={data.ratesYesterday.rates}
            base={def.currency}
            currency={def.currency}
            isLoading={isLoading}
            isPinned={isPinned}
            onTogglePin={togglePinned}
          />
        )}
        {(!selectedAsset || selectedAsset === "crude") && (
          <Gasoline
            country={country}
            crude={data.crude}
            toLocal={toLocal}
            currency={def.currency}
            isLoading={isLoading}
          />
        )}

        {!selectedAsset ? <NewsTeaser country={country} /> : null}

        <Footer sources={{
          metals: data.metalsSource,
          rates: data.ratesSource,
          crypto: data.cryptoSource,
          quotes: data.quotesSource,
          crude: data.crudeSource,
        }} />
      </main>

      <MobileNav currentPath="/" />
    </div>
  );
}

/* =====================================================================
 * COUNTRY TILES
 * ===================================================================== */

/* ------------------------------ Today's Snapshot --------------------------- */

interface Mover {
  key: string;
  label: string;
  changePercent: number;
  assetFilter: "metals" | "crypto" | "stocks" | "crude" | "fx";
  emoji: string;
}

function TodaySnapshot({
  data,
  country,
  onJump,
}: {
  data: MarketSnapshot;
  country: CountryCode;
  onJump: (asset: "metals" | "crypto" | "stocks" | "crude" | "fx") => void;
}) {
  const def = COUNTRIES[country];

  const movers = useMemo<Mover[]>(() => {
    const pick = (candidates: Mover[]): Mover | null => {
      const valid = candidates.filter((m) => Number.isFinite(m.changePercent) && m.changePercent !== 0);
      if (valid.length === 0) return null;
      return valid.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0];
    };

    // Gold
    const goldChg = data.metalsChange.XAU;
    const gold: Mover | null =
      goldChg && Number.isFinite(goldChg.changePercent) && goldChg.changePercent !== 0
        ? { key: "XAU", label: "Gold", changePercent: goldChg.changePercent, assetFilter: "metals", emoji: "🪙" }
        : null;

    // Silver
    const silverChg = data.metalsChange.XAG;
    const silver: Mover | null =
      silverChg && Number.isFinite(silverChg.changePercent) && silverChg.changePercent !== 0
        ? { key: "XAG", label: "Silver", changePercent: silverChg.changePercent, assetFilter: "metals", emoji: "🥈" }
        : null;

    // Markets — biggest mover among this country's own stock indices
    const marketCandidates: Mover[] = def.stockIndices
      .map((ticker): Mover | null => {
        const q = data.quotes.find((x) => x.ticker === ticker);
        if (!q) return null;
        const name = STOCKS[ticker]?.name ?? ticker;
        return { key: ticker, label: name, changePercent: q.changePercent, assetFilter: "stocks", emoji: "📈" };
      })
      .filter((m): m is Mover => m !== null);
    const markets = pick(marketCandidates);

    // Crypto — biggest mover among tracked coins
    const cryptoCandidates: Mover[] = CRYPTOS.map((c): Mover | null => {
      const chg = data.cryptoChange[c.code];
      if (!chg) return null;
      return { key: c.code, label: c.name, changePercent: chg.changePercent, assetFilter: "crypto", emoji: c.icon };
    }).filter((m): m is Mover => m !== null);
    const crypto = pick(cryptoCandidates);

    // Crude
    const crude: Mover | null =
      Number.isFinite(data.crude.changePercent) && data.crude.changePercent !== 0
        ? { key: "crude", label: "Crude Oil", changePercent: data.crude.changePercent, assetFilter: "crude", emoji: "🛢️" }
        : null;

    // FX — biggest mover among featured pairs vs the current base currency
    const baseRate = data.rates.rates[def.currency];
    const baseRateY = data.ratesYesterday.rates[def.currency];
    const featuredFx = ["USD", "EUR", "GBP", "JPY", "AED", "INR", "CNY"].filter((c) => c !== def.currency);
    const fxCandidates: Mover[] = featuredFx
      .map((ccy): Mover | null => {
        const rate = data.rates.rates[ccy];
        const rateY = data.ratesYesterday.rates[ccy];
        if (!rate || !rateY || !baseRate || !baseRateY) return null;
        const perBase = rate / baseRate;
        const perBaseY = rateY / baseRateY;
        if (!Number.isFinite(perBase) || !Number.isFinite(perBaseY) || perBaseY === 0) return null;
        const changePercent = ((perBase - perBaseY) / perBaseY) * 100;
        return {
          key: ccy,
          label: `${def.currency}/${ccy}`,
          changePercent,
          assetFilter: "fx",
          emoji: CURRENCY_FLAGS[ccy] || "💱",
        };
      })
      .filter((m): m is Mover => m !== null);
    const fx = pick(fxCandidates);

    return [gold, silver, markets, crypto, crude, fx].filter((m): m is Mover => m !== null);
  }, [data, def]);

  if (movers.length === 0) return null;

  const gainer = movers.filter((m) => m.changePercent > 0).sort((a, b) => b.changePercent - a.changePercent)[0];
  const loser = movers.filter((m) => m.changePercent < 0).sort((a, b) => a.changePercent - b.changePercent)[0];

  let headline = "";
  if (gainer && loser) {
    headline = `${gainer.label} leads today, up ${fmtNumber(gainer.changePercent, 1)}% — ${loser.label} is the biggest faller, down ${fmtNumber(Math.abs(loser.changePercent), 1)}%.`;
  } else if (gainer) {
    headline = `${gainer.label} leads today, up ${fmtNumber(gainer.changePercent, 1)}%.`;
  } else if (loser) {
    headline = `${loser.label} is today's biggest faller, down ${fmtNumber(Math.abs(loser.changePercent), 1)}%.`;
  }

  return (
    <div className="border-b border-border bg-gradient-to-b from-surface-alt to-background">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
        {headline ? (
          <p className="mb-3 text-sm font-medium text-foreground sm:text-base">
            <span className="mr-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Today
            </span>
            {headline}
          </p>
        ) : null}
        <MarqueeRow
          items={movers}
          keyOf={(m) => m.key}
          renderItem={(m) => {
            const up = m.changePercent >= 0;
            return (
              <button
                type="button"
                onClick={() => onJump(m.assetFilter)}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium shadow-sm transition-colors hover:bg-surface-alt"
              >
                <span aria-hidden>{m.emoji}</span>
                <span className="text-foreground">{m.label}</span>
                <span
                  className="font-mono font-semibold"
                  style={{ color: up ? "var(--positive)" : "var(--negative)" }}
                >
                  {up ? "▲" : "▼"} {fmtNumber(Math.abs(m.changePercent), 1)}%
                </span>
              </button>
            );
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------- Favorite button ---------------------------- */

function FavoriteButton({
  pinned,
  onToggle,
  dark = false,
}: {
  pinned: boolean;
  onToggle: () => void;
  dark?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={pinned ? "Remove from pinned" : "Add to pinned"}
      aria-pressed={pinned}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
        dark
          ? pinned
            ? "text-amber-400"
            : "text-white/50 hover:text-white/80"
          : pinned
            ? "text-amber-500"
            : "text-muted-foreground hover:bg-surface-alt hover:text-foreground",
      )}
    >
      <Star className={cn("h-4 w-4", pinned && (dark ? "fill-amber-400" : "fill-amber-500"))} />
    </button>
  );
}

/* --------------------------------- Pinned bar -------------------------------- */

function PinnedBar({
  pinned,
  data,
  country,
  toLocal,
  includeGST,
  onUnpin,
  onJump,
}: {
  pinned: string[];
  data: MarketSnapshot;
  country: CountryCode;
  toLocal: (usd: number) => number;
  includeGST: boolean;
  onUnpin: (key: string) => void;
  onJump: (asset: "metals" | "crypto" | "stocks" | "crude" | "fx") => void;
}) {
  const scrollRef = useAutoScroll<HTMLDivElement>();

  const resolved = pinned
    .map((key) => resolveAsset(key, data, country, { toLocal, includeGST }))
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (resolved.length === 0) return null;

  return (
    <div className="border-b border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
          Pinned
        </div>
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {resolved.map((r) => {
            const up = r.changePercent >= 0;
            return (
              <div
                key={r.key}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card py-1.5 pl-3 pr-1.5 text-xs font-medium shadow-sm"
              >
                <button type="button" onClick={() => onJump(r.assetFilter)} className="flex items-center gap-1.5">
                  <span aria-hidden>{r.emoji}</span>
                  <span className="text-foreground">{r.label}</span>
                  {r.changePercent !== 0 ? (
                    <span
                      className="font-mono font-semibold"
                      style={{ color: up ? "var(--positive)" : "var(--negative)" }}
                    >
                      {up ? "▲" : "▼"} {fmtNumber(Math.abs(r.changePercent), 1)}%
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => onUnpin(r.key)}
                  aria-label={`Unpin ${r.label}`}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-alt hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Search + Alerts bar --------------------------- */

function SearchAndAlerts({
  country,
  data,
  toLocal,
  includeGST,
  alerts,
  onAddAlert,
  onRemoveAlert,
  onJump,
}: {
  country: CountryCode;
  data: MarketSnapshot;
  toLocal: (usd: number) => number;
  includeGST: boolean;
  alerts: PriceAlert[];
  onAddAlert: (a: Omit<PriceAlert, "id" | "firedAt">) => void;
  onRemoveAlert: (id: string) => void;
  onJump: (asset: "metals" | "crypto" | "stocks" | "crude" | "fx") => void;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const index = useMemo(() => buildAssetIndex(country), [country]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return index.filter((a) => a.label.toLowerCase().includes(q)).slice(0, 8);
  }, [query, index]);

  const activeAlertCount = alerts.filter((a) => !a.firedAt).length;

  const selectResult = (a: AssetRef) => {
    setQuery("");
    setFocused(false);
    onJump(a.category);
  };

  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search gold, BTC, Nifty, EUR..."
            className="h-10 pl-9"
          />
          {focused && results.length > 0 ? (
            <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
              {results.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onMouseDown={() => selectResult(r)}
                  className="flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-surface-alt"
                >
                  <span aria-hidden>{r.emoji}</span>
                  <span className="text-foreground">{r.label}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{r.sub}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setAlertsOpen(true)}
          className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-surface-alt"
          aria-label="Price alerts"
        >
          <Bell className="h-4 w-4" />
          {activeAlertCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[color:var(--brand)] text-[9px] font-bold text-white">
              {activeAlertCount}
            </span>
          ) : null}
        </button>
      </div>

      <AlertsDialog
        open={alertsOpen}
        onOpenChange={setAlertsOpen}
        country={country}
        data={data}
        toLocal={toLocal}
        includeGST={includeGST}
        alerts={alerts}
        onAdd={onAddAlert}
        onRemove={onRemoveAlert}
      />
    </div>
  );
}

function AlertsDialog({
  open,
  onOpenChange,
  country,
  data,
  toLocal,
  includeGST,
  alerts,
  onAdd,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  country: CountryCode;
  data: MarketSnapshot;
  toLocal: (usd: number) => number;
  includeGST: boolean;
  alerts: PriceAlert[];
  onAdd: (a: Omit<PriceAlert, "id" | "firedAt">) => void;
  onRemove: (id: string) => void;
}) {
  const index = useMemo(() => buildAssetIndex(country), [country]);
  const [assetKey, setAssetKey] = useState<string>(index[0]?.key ?? "");
  const [condition, setCondition] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState("");

  const selectedRef = index.find((a) => a.key === assetKey);
  const resolved = selectedRef ? resolveAsset(assetKey, data, country, { toLocal, includeGST }) : null;

  const submit = () => {
    const num = Number(threshold);
    if (!selectedRef || !Number.isFinite(num) || num <= 0) return;
    onAdd({
      assetKey,
      label: selectedRef.label,
      condition,
      threshold: num,
      currency: resolved?.currency ?? "",
    });
    setThreshold("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Price Alerts</DialogTitle>
          <DialogDescription>
            Local notifications only — these fire while you have this app open (or installed) recently
            enough for it to refresh. There's no server sending these to you if the app has been fully
            closed for a long time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-alt px-3 py-2 text-sm"
                >
                  <span className={cn(a.firedAt && "text-muted-foreground line-through")}>
                    {a.label} {a.condition === "above" ? "≥" : "≤"}{" "}
                    {fmtCurrency(a.threshold, a.currency, { maximumFractionDigits: 2 })}
                    {a.firedAt ? " · fired" : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(a.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                    aria-label={`Remove alert for ${a.label}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No alerts yet.</p>
          )}

          <div className="space-y-3 rounded-xl border border-border p-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Asset</Label>
              <Select value={assetKey} onValueChange={setAssetKey}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {index.map((a) => (
                    <SelectItem key={a.key} value={a.key}>
                      {a.emoji} {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {resolved?.price != null ? (
                <p className="text-[11px] text-muted-foreground">
                  Current: {fmtCurrency(resolved.price, resolved.currency, { maximumFractionDigits: 2 })}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Condition</Label>
                <Select value={condition} onValueChange={(v) => setCondition(v as "above" | "below")}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Goes above</SelectItem>
                    <SelectItem value="below">Goes below</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Threshold</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="0.00"
                  className="h-9"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={submit}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[color:var(--brand)] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Add alert
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CountryTiles({
  country,
  onChange,
}: {
  country: CountryCode;
  onChange: (c: CountryCode) => void;
}) {
  return (
    <div className="border-b border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-4">
        <MarqueeRow
          items={COUNTRY_ORDER}
          keyOf={(c) => c}
          secondsPerItem={2.5}
          renderItem={(c) => {
            const cd = COUNTRIES[c];
            const active = c === country;
            return (
              <button
                type="button"
                onClick={() => onChange(c)}
                className={cn(
                  "flex shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2 py-1.5 text-center transition-colors min-w-[68px] sm:min-w-[92px] sm:px-4 sm:py-2.5 sm:gap-1",
                  active
                    ? "border-[color:var(--brand)] bg-[color:var(--brand)]/10 shadow-sm"
                    : "border-border bg-background hover:bg-surface-alt",
                )}
              >
                <span className="text-lg leading-none sm:text-2xl" aria-hidden>{cd.flag}</span>
                <span className={cn("text-[10px] font-semibold leading-tight sm:text-[11px]", active ? "text-[color:var(--brand)]" : "text-foreground")}>
                  {cd.name}
                </span>
                <span className="font-mono text-[9px] text-muted-foreground sm:text-[10px]">
                  {cd.symbol} {cd.currency}
                </span>
              </button>
            );
          }}
        />
      </div>
    </div>
  );
}

/* =====================================================================
 * ASSET TILES
 * ===================================================================== */

function AssetTiles({
  selectedAsset,
  onChange,
}: {
  selectedAsset: string | null;
  onChange: (asset: "metals" | "crypto" | "stocks" | "crude" | "fx" | null) => void;
}) {
  const assets = [
    { id: "metals", label: "Metals", icon: "🪙" },
    { id: "stocks", label: "Stock Market", icon: "📈" },
    { id: "crypto", label: "Crypto", icon: "₿" },
    { id: "fx", label: "FX", icon: "💱" },
    { id: "crude", label: "Crude", icon: "🛢️" },
  ];

  const scrollRef = useAutoScroll<HTMLDivElement>();

  return (
    <div className="border-b border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-4">
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-1 sm:gap-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {assets.map((asset) => {
            const active = selectedAsset === asset.id;
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => onChange(active ? null : (asset.id as any))}
                aria-pressed={active}
                title={active ? `Showing ${asset.label} only — tap to show all` : `Show ${asset.label} only`}
                className={cn(
                  "flex w-20 shrink-0 flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center transition-colors sm:w-24 sm:gap-1.5 sm:px-3 sm:py-3",
                  active
                    ? "border-[color:var(--brand)] bg-[color:var(--brand)]/10 shadow-sm"
                    : "border-border bg-background hover:bg-surface-alt",
                )}
              >
                <span className="text-base sm:text-xl" aria-hidden>{asset.icon}</span>
                <span className={cn("text-[10px] font-semibold leading-tight sm:text-xs", active ? "text-[color:var(--brand)]" : "text-foreground")}>
                  {asset.label}
                </span>
              </button>
            );
          })}
        </div>
        {selectedAsset ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mx-auto mt-2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Show all markets
          </button>
        ) : null}
      </div>
    </div>
  );
}

/* =====================================================================
 * LOADING STATES
 * ===================================================================== */

function SectionLoadingState({ type }: { type: "metals" | "crypto" | "stocks" | "fuel" | "currencies" }) {
  if (type === "metals") {
    return (
      <section>
        <SectionHeaderSkeleton />
        <div className="space-y-4">
          <MetalRowSkeleton />
          <MetalRowSkeleton />
          <MetalRowSkeleton />
        </div>
      </section>
    );
  }
  if (type === "crypto") {
    return (
      <section>
        <SectionHeaderSkeleton />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <CryptoCardSkeleton />
          <CryptoCardSkeleton />
          <CryptoCardSkeleton />
        </div>
      </section>
    );
  }
  if (type === "stocks") {
    return (
      <section>
        <SectionHeaderSkeleton />
        <div className="grid gap-3 sm:grid-cols-3">
          <IndexCardSkeleton />
          <IndexCardSkeleton />
          <IndexCardSkeleton />
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          <MoversListSkeleton />
          <MoversListSkeleton />
        </div>
      </section>
    );
  }
  if (type === "fuel") {
    return (
      <section>
        <SectionHeaderSkeleton />
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <FuelTileSkeleton />
          </div>
          <FuelTileSkeleton />
          <FuelTileSkeleton />
          <FuelTileSkeleton />
          <FuelTileSkeleton />
        </div>
      </section>
    );
  }
  return (
    <section>
      <SectionHeaderSkeleton />
      <div className="rounded-2xl bg-slate-900 p-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 11 }).map((_, i) => (
            <CurrencyTileSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeaderSkeleton() {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-1 h-3 w-56" />
      </div>
    </div>
  );
}

function ChangeBadge({
  change,
  changePercent,
  currency,
  digits = 2,
}: {
  change: number;
  changePercent: number;
  currency?: string;
  digits?: number;
}) {
  if (!Number.isFinite(changePercent) || (change === 0 && changePercent === 0)) {
    return (
      <div suppressHydrationWarning className="font-mono text-[12px] text-muted-foreground/70">— 24h</div>
    );
  }
  const up = changePercent >= 0;
  const arrow = up ? "▲" : "▼";
  const sign = up ? "+" : "-";
  const absChange = Math.abs(change);
  const valueStr = currency
    ? fmtCurrency(absChange, currency, { maximumFractionDigits: digits })
    : fmtNumber(absChange, digits);
  return (
    <div
      suppressHydrationWarning
      className="font-mono text-[12px] font-semibold tabular"
      style={{ color: up ? "var(--positive)" : "var(--negative)" }}
    >
      {arrow} {sign}
      {valueStr} ({fmtPct(changePercent)})
    </div>
  );
}

/* =====================================================================
 * SECTION HEADER
 * ===================================================================== */

function SectionHeader({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
        {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

/* =====================================================================
 * 1) PRECIOUS METALS
 * ===================================================================== */

function PreciousMetals({
  country,
  metals,
  metalsChange,
  toLocal,
  fx,
  currency,
  includeGST,
  onGSTChange,
  isLoading,
  usdRates,
  isPinned,
  onTogglePin,
}: {
  country: CountryCode;
  metals: MarketSnapshot["metals"];
  metalsChange: MarketSnapshot["metalsChange"];
  toLocal: (usd: number) => number;
  fx: number;
  currency: string;
  includeGST: boolean;
  onGSTChange: (v: boolean) => void;
  isLoading: boolean;
  usdRates: Record<string, number>;
  isPinned: (key: string) => boolean;
  onTogglePin: (key: string) => void;
}) {
  const def = COUNTRIES[country];
  const premium = RETAIL_PREMIUM[country];
  const gstMul = country === "IN" && includeGST ? 1 + INDIA_GST : 1;

  const localPerGram = (code: MetalCode) => {
    const spotUsdOz = metals[code];
    const spotUsdG = spotUsdOz / GRAMS_PER_TROY_OUNCE;
    const prem = premium?.[code] ?? 1;
    return toLocal(spotUsdG) * prem * gstMul;
  };

  if (isLoading) {
    return <SectionLoadingState type="metals" />;
  }

  return (
    <section>
      <SectionHeader
        title="Precious Metals"
        hint={`Live spot prices · ${def.currency} · ${
          premium ? "incl. import duty" : "global spot"
        }${country === "IN" && includeGST ? " + 3% GST" : ""}`}
      >
        {country === "IN" ? (
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
            <Switch id="gst" checked={includeGST} onCheckedChange={onGSTChange} />
            <Label htmlFor="gst" className="cursor-pointer text-xs font-medium">
              Include 3% GST
            </Label>
          </div>
        ) : null}
      </SectionHeader>
      
      <div className="space-y-4">
        {METALS.map((m) => (
          <MetalRow
            key={m.code}
            metalCode={m.code}
            metalName={m.name}
            yahooSymbol={m.yahoo}
            karats={m.karats}
            perGram={localPerGram(m.code)}
            changePercent={metalsChange[m.code]?.changePercent ?? 0}
            currency={currency}
            country={country}
            fx={fx}
            spotUsdOz={metals[m.code]}
            usdRates={usdRates}
            isPinned={isPinned(`metals:${m.code}`)}
            onTogglePin={() => onTogglePin(`metals:${m.code}`)}
          />
        ))}
      </div>
    </section>
  );
}

const METAL_TINT: Record<MetalCode, string> = {
  XAU: "bg-amber-50 text-amber-700 ring-amber-200",
  XAG: "bg-slate-100 text-slate-700 ring-slate-200",
  XPT: "bg-zinc-100 text-zinc-700 ring-zinc-300",
};
const METAL_DOT_GRADIENT: Record<MetalCode, string> = {
  XAU: "from-amber-300 via-yellow-400 to-amber-600",
  XAG: "from-slate-200 via-slate-300 to-slate-400",
  XPT: "from-zinc-200 via-zinc-300 to-zinc-400",
};

function MetalRow({
  metalCode,
  metalName,
  yahooSymbol,
  karats,
  perGram,
  changePercent,
  currency,
  country,
  fx,
  spotUsdOz,
  usdRates,
  isPinned,
  onTogglePin,
}: {
  metalCode: MetalCode;
  metalName: string;
  yahooSymbol: string;
  karats?: number[];
  perGram: number;
  changePercent: number;
  currency: string;
  country: CountryCode;
  fx: number;
  spotUsdOz: number;
  usdRates: Record<string, number>;
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [historyKarat, setHistoryKarat] = useState<number | null>(null);
  const [calcOpen, setCalcOpen] = useState(false);
  const def = COUNTRIES[country];
  const valid = Number.isFinite(perGram) && perGram > 0;

  const showPerGram = def.metalUnit === "gram" || metalCode === "XAU";
  const showPerOunce = def.metalUnit === "ounce";
  const isGold = metalCode === "XAU";
  const perOunce = perGram * GRAMS_PER_TROY_OUNCE;
  const perKg = perGram * GRAMS_PER_KG;

  const chg = (price: number) => ({
    change: (price * changePercent) / 100,
    changePercent,
  });

  return (
    <>
      <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
       <header className="flex items-center justify-between gap-3 border-b border-border bg-surface-alt px-4 py-3">
  <div className="flex items-center gap-2.5">
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
        METAL_TINT[metalCode],
      )}
    >
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full bg-gradient-to-br shadow-sm ring-1 ring-black/10",
          METAL_DOT_GRADIENT[metalCode],
        )}
        aria-hidden
      />
      {metalName}
    </span>
    <span className="font-mono text-[10px] text-muted-foreground">
      Spot {yahooSymbol}
    </span>
  </div>

  <div className="flex items-center gap-1.5">
    <FavoriteButton pinned={isPinned} onToggle={onTogglePin} />
    {isGold ? (
      <button
        onClick={() => setCalcOpen(true)}
        aria-label="Gold duty calculator"
        title="Gold duty calculator"
        className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-alt sm:px-3"
      >
        <Calculator className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Duty calculator</span>
      </button>
    ) : null}
     <button
            onClick={() => setOpen(true)}
            aria-label="5-year price history"
            title="5-year price history"
            className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-alt sm:px-3"
          >
            <LineChartIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">5y history</span>
          </button>
  </div>
        </header>

        <div className="p-4">
          {!valid ? (
            <div className="text-sm text-muted-foreground">Price unavailable</div>
          ) : isGold && karats ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {karats.map((k) => {
                const gramPrice = perGram * KARAT_PURITY[k];
                const sovPrice = gramPrice * GRAMS_PER_SOVEREIGN;
                const ozPrice = gramPrice * GRAMS_PER_TROY_OUNCE;
                const display = showPerOunce ? ozPrice : gramPrice;
                const c = chg(display);
                return (
                  <div key={k} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {k}K Gold
                      </div>
                      <button
                        onClick={() => setHistoryKarat(k)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground transition-colors hover:bg-surface-alt"
                        aria-label={`Show 5 year price history for ${k}K gold`}
                      >
                        <LineChartIcon className="h-2.5 w-2.5" />
                        5y
                      </button>
                    </div>
                    <div className="font-mono text-xl font-bold tabular text-foreground">
                      {fmtCurrency(display, currency, { maximumFractionDigits: 2 })}
                      <span className="ml-1 text-[10px] font-medium uppercase text-muted-foreground">
                        /{showPerOunce ? "oz" : "g"}
                      </span>
                    </div>
                    <ChangeBadge {...c} currency={currency} />
                    <div className="font-mono text-[11px] text-muted-foreground">
                      1 sovereign (8 g) ·{" "}
                      <span className="font-semibold text-foreground">
                        {fmtCurrency(sovPrice, currency, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {showPerGram ? (
                <PriceCell
                  label="Per gram"
                  value={perGram}
                  currency={currency}
                  digits={2}
                  change={chg(perGram)}
                />
              ) : null}
              {showPerOunce ? (
                <PriceCell
                  label="Per ounce"
                  value={perOunce}
                  currency={currency}
                  digits={2}
                  change={chg(perOunce)}
                />
              ) : null}
              <PriceCell
                label="Per kg"
                value={perKg}
                currency={currency}
                digits={0}
                change={chg(perKg)}
              />
            </div>
          )}
        </div>
      </article>

      <HistoryDialog
        open={open}
        onOpenChange={setOpen}
        title={metalName}
        symbol={yahooSymbol}
        currency={currency}
        scale={(def.metalUnit === "gram" ? fx / GRAMS_PER_TROY_OUNCE : fx)}
        unitLabel={`per ${def.metalUnit === "gram" ? "g" : "oz"}`}
        tint={metalCode === "XAU" ? "#d97706" : metalCode === "XAG" ? "#64748b" : "#475569"}
        alignMetal={metalCode}
      />
      {isGold && historyKarat !== null ? (
        <HistoryDialog
          open={historyKarat !== null}
          onOpenChange={(o) => !o && setHistoryKarat(null)}
          title={`${historyKarat}K Gold`}
          symbol={yahooSymbol}
          currency={currency}
          scale={
            (def.metalUnit === "gram" ? fx / GRAMS_PER_TROY_OUNCE : fx) *
            (KARAT_PURITY[historyKarat] ?? 1)
          }
          unitLabel={`per ${def.metalUnit === "gram" ? "g" : "oz"} · ${historyKarat}K`}
          tint="#d97706"
          alignMetal="XAU"
        />
      ) : null}
      {isGold ? (
        <GoldDutyCalculator
          open={calcOpen}
          onOpenChange={setCalcOpen}
          spotUsdOz={spotUsdOz}
          usdRates={usdRates}
          defaultCountry={country}
        />
      ) : null}
    </>
  );
}

function PriceCell({
  label,
  value,
  currency,
  digits,
  change,
}: {
  label: string;
  value: number;
  currency: string;
  digits: number;
  change?: { change: number; changePercent: number };
}) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-lg font-bold tabular text-foreground">
        {fmtCurrency(value, currency, { maximumFractionDigits: digits })}
      </div>
      {change ? <ChangeBadge {...change} currency={currency} digits={digits} /> : null}
    </div>
  );
}

/* =====================================================================
 * 2) CRYPTO SECTION
 * ===================================================================== */

function CryptoSection({
  crypto,
  cryptoChange,
  toLocal,
  currency,
  isLoading,
  isPinned,
  onTogglePin,
}: {
  crypto: MarketSnapshot["crypto"];
  cryptoChange: MarketSnapshot["cryptoChange"];
  toLocal: (usd: number) => number;
  currency: string;
  isLoading: boolean;
  isPinned: (key: string) => boolean;
  onTogglePin: (key: string) => void;
}) {
  if (isLoading) {
    return <SectionLoadingState type="crypto" />;
  }

  return (
    <section>
      <SectionHeader
        title="Cryptocurrency"
        hint={`Live prices · ${currency} · 24h change`}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {CRYPTOS.map((c) => (
          <CryptoCard
            key={c.code}
            cryptoDef={c}
            price={toLocal(crypto[c.code])}
            change={cryptoChange[c.code]}
            currency={currency}
            toLocal={toLocal}
            isPinned={isPinned(`crypto:${c.code}`)}
            onTogglePin={() => onTogglePin(`crypto:${c.code}`)}
          />

        ))}
      </div>
    </section>
  );
}

function CryptoCard({
  cryptoDef,
  price,
  change,
  currency,
  toLocal,
  isPinned,
  onTogglePin,
}: {
  cryptoDef: { code: CryptoCode; name: string; yahoo: string; icon: string };
  price: number;
  change: { change: number; changePercent: number };
  currency: string;
  toLocal: (usd: number) => number;
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  const [open, setOpen] = useState(false);
  const valid = Number.isFinite(price) && price > 0;

  const CRYPTO_TINT: Record<CryptoCode, { bg: string; text: string; ring: string }> = {
    BTC: { bg: "bg-orange-50", text: "text-orange-700", ring: "ring-orange-200" },
    ETH: { bg: "bg-indigo-50", text: "text-indigo-700", ring: "ring-indigo-200" },
    SOL: { bg: "bg-teal-50", text: "text-teal-700", ring: "ring-teal-200" },
  };
  const tint = CRYPTO_TINT[cryptoDef.code];

  return (
    <>
      <article className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ring-1",
                tint.bg,
                tint.text,
                tint.ring,
              )}
            >
              {cryptoDef.icon}
            </span>
            <div>
              <div className="text-sm font-bold text-foreground">{cryptoDef.name}</div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {cryptoDef.code}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <FavoriteButton pinned={isPinned} onToggle={onTogglePin} />
            <button
              onClick={() => setOpen(true)}
              className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface-alt"
            >
              <LineChartIcon className="h-3.5 w-3.5" />
              History
            </button>
          </div>
        </div>

        {valid ? (
          <>
            <div className="mt-3 font-mono text-xl font-bold tabular text-foreground">
              {fmtCurrency(price, currency, { maximumFractionDigits: 0 })}
            </div>
            <ChangeBadge
              change={toLocal(change.change)}
              changePercent={change.changePercent}
              currency={currency}
              digits={0}
            />
          </>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">Price unavailable</div>
        )}
      </article>

      <HistoryDialog
        open={open}
        onOpenChange={setOpen}
        title={cryptoDef.name}
        symbol={cryptoDef.yahoo}
        currency={currency}
        tint={cryptoDef.code === "BTC" ? "#f97316" : cryptoDef.code === "ETH" ? "#6366f1" : "#14b8a6"}
        unitLabel={currency}
      />
    </>
  );
}

/* =====================================================================
 * 3) STOCK MARKET
 * ===================================================================== */

function StockMarket({
  country,
  quotes,
  basket,
  isLoading,
  isPinned,
  onTogglePin,
}: {
  country: CountryCode;
  quotes: MarketSnapshot["quotes"];
  basket: MarketSnapshot["quotes"];
  isLoading: boolean;
  isPinned: (key: string) => boolean;
  onTogglePin: (key: string) => void;
}) {
  const def = COUNTRIES[country];

  const localIndices = useMemo(
    () => quotes.filter((q) => def.stockIndices.includes(q.ticker)),
    [quotes, def.stockIndices],
  );

  const validBasket = useMemo(() =>
    basket.filter((q) => Number.isFinite(q.changePercent)),
    [basket]
  );

  const gainers = useMemo(() =>
    validBasket
      .filter((q) => q.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 5),
    [validBasket]
  );

  const losers = useMemo(() =>
    validBasket
      .filter((q) => q.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 5),
    [validBasket]
  );

  if (isLoading) {
    return <SectionLoadingState type="stocks" />;
  }

  return (
    <section>
      <SectionHeader
        title="Stock Market"
        hint={`${def.flag} ${def.name} · indices and large-cap movers`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {localIndices.length === 0 ? (
          <div className="col-span-full rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Indices currently unavailable for {def.name}.
          </div>
        ) : (
          localIndices.map((q) => (
            <IndexCard
              key={q.ticker}
              quote={q}
              isPinned={isPinned(`stocks:${q.ticker}`)}
              onTogglePin={() => onTogglePin(`stocks:${q.ticker}`)}
            />
          ))
        )}
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <MoversList title="Top Gainers" icon="up" rows={gainers} />
        <MoversList title="Top Losers" icon="down" rows={losers} />
      </div>
    </section>
  );
}

function IndexCard({
  quote,
  isPinned,
  onTogglePin,
}: {
  quote: MarketSnapshot["quotes"][number];
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  const def = STOCKS[quote.ticker];
  const up = quote.change >= 0;
  const accent = up ? "var(--positive)" : "var(--negative)";
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-bold text-foreground">{def?.name ?? quote.ticker}</div>
        <div className="flex items-center gap-1">
          <FavoriteButton pinned={isPinned} onToggle={onTogglePin} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-surface-alt"
          >
            <LineChartIcon className="h-3.5 w-3.5" />
            History
          </button>
        </div>
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {def?.exchange}
      </div>
      <div className="mt-2 font-mono text-xl font-bold tabular text-foreground">
        {fmtNumber(quote.price, 2)}
        <span className="ml-1 text-[10px] font-medium uppercase text-muted-foreground">
          {quote.currency}
        </span>
      </div>
      <div className="mt-0.5 font-mono text-[11px] font-semibold" style={{ color: accent }}>
        {up ? "▲ +" : "▼ "}
        {fmtNumber(Math.abs(quote.change), 2)} · {fmtPct(quote.changePercent)}
      </div>
      <HistoryDialog
        open={open}
        onOpenChange={setOpen}
        title={def?.name ?? quote.ticker}
        symbol={quote.ticker}
        tint={up ? "#16a34a" : "#dc2626"}
        unitLabel={quote.currency}
      />
    </div>
  );
}

function MoversList({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: "up" | "down";
  rows: MarketSnapshot["quotes"];
}) {
  const isUp = icon === "up";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        {isUp ? (
          <TrendingUp className="h-4 w-4 text-[color:var(--positive)]" />
        ) : (
          <TrendingDown className="h-4 w-4 text-[color:var(--negative)]" />
        )}
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">No data</div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((q) => {
            const up = q.changePercent >= 0;
            return (
              <li key={q.ticker} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-foreground">
                    {STOCK_NAMES[q.ticker] ?? q.ticker}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground">{q.ticker}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-xs font-bold tabular text-foreground">
                    {fmtNumber(q.price, 2)}
                  </div>
                  <div
                    className="font-mono text-[10px] font-semibold tabular"
                    style={{ color: up ? "var(--positive)" : "var(--negative)" }}
                  >
                    {fmtPct(q.changePercent)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* =====================================================================
 * 4) GASOLINE
 * ===================================================================== */

function Gasoline({
  country,
  crude,
  toLocal,
  currency,
  isLoading,
}: {
  country: CountryCode;
  crude: MarketSnapshot["crude"];
  toLocal: (usd: number) => number;
  currency: string;
  isLoading: boolean;
}) {
  const def = COUNTRIES[country];
  const fuel = FUEL_REFERENCE[country];
  const crudeLocal = toLocal(crude.pricePerBarrelUSD);
  const up = crude.change >= 0;

  const spread = FUEL_SPREAD[country];
  const crudePerUnit = def.fuelVolumeUnit === "gal"
    ? crudeLocal / 42
    : crudeLocal / 159;

  const derivedPetrol = Number.isFinite(crudePerUnit) && crudePerUnit > 0
    ? crudePerUnit * spread.petrol
    : NaN;
  const derivedDiesel = Number.isFinite(crudePerUnit) && crudePerUnit > 0
    ? crudePerUnit * spread.diesel
    : NaN;

  const petrolPrice = Number.isFinite(derivedPetrol) && derivedPetrol > 0
    ? derivedPetrol
    : fuel.petrol;
  const dieselPrice = Number.isFinite(derivedDiesel) && derivedDiesel > 0
    ? derivedDiesel
    : fuel.diesel;

  if (isLoading) {
    return <SectionLoadingState type="fuel" />;
  }

  return (
    <section>
      <SectionHeader
        title="Gasoline & Fuel"
        hint={`Live crude oil + indicative retail prices in ${def.name}`}
      />

      <div className="grid gap-3 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-2">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Crude Oil (WTI) · live
            </h3>
          </div>
          {Number.isFinite(crude.pricePerBarrelUSD) ? (
            <>
              <div className="mt-2 font-mono text-2xl font-bold tabular text-foreground">
                {fmtCurrency(crudeLocal, currency, { maximumFractionDigits: 2 })}
                <span className="ml-1 text-[11px] font-medium uppercase text-muted-foreground">
                  /barrel
                </span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                ${fmtNumber(crude.pricePerBarrelUSD, 2)} USD ·{" "}
                <span style={{ color: up ? "var(--positive)" : "var(--negative)" }}>
                  {up ? "▲ +" : "▼ "}
                  {fmtPct(crude.changePercent)}
                </span>
              </div>
            </>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">Unavailable</div>
          )}
        </div>

        <FuelTile
          label="Petrol"
          value={petrolPrice}
          unit={`per ${def.fuelVolumeUnit}`}
          currency={currency}
          changePercent={crude.changePercent}
          derived={Number.isFinite(derivedPetrol) && derivedPetrol > 0}
        />
        <FuelTile
          label="Diesel"
          value={dieselPrice}
          unit={`per ${def.fuelVolumeUnit}`}
          currency={currency}
          changePercent={crude.changePercent}
          derived={Number.isFinite(derivedDiesel) && derivedDiesel > 0}
        />
        <FuelTile
          label="LPG (Domestic)"
          value={fuel.lpgDomestic.price}
          unit={`per ${fuel.lpgDomestic.unit}`}
          currency={currency}
        />
        <FuelTile
          label="LPG (Commercial)"
          value={fuel.lpgCommercial.price}
          unit={`per ${fuel.lpgCommercial.unit}`}
          currency={currency}
        />
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Retail petrol/diesel are derived from live WTI crude with regional refining spreads. LPG prices are indicative regional references and vary by city, dealer, and date.
      </p>
    </section>
  );
}

function FuelTile({
  label,
  value,
  unit,
  currency,
  changePercent,
  derived,
}: {
  label: string;
  value: number;
  unit: string;
  currency: string;
  changePercent?: number;
  derived?: boolean;
}) {
  const hasChange = typeof changePercent === "number" && Number.isFinite(changePercent);
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {derived ? (
          <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 ring-1 ring-emerald-200">
            live
          </span>
        ) : null}
      </div>
      <div className="mt-1.5 font-mono text-lg font-bold tabular text-foreground">
        {fmtCurrency(value, currency, { maximumFractionDigits: 2 })}
      </div>
      <div className="font-mono text-[10px] text-muted-foreground">{unit}</div>
      {hasChange ? (
        <div className="mt-1">
          <ChangeBadge
            change={(value * (changePercent as number)) / 100}
            changePercent={changePercent as number}
            currency={currency}
          />
        </div>
      ) : null}
    </div>
  );
}

/* =====================================================================
 * 5) CURRENCIES
 * ===================================================================== */

/* --------------------------------- News Teaser ------------------------------ */

function NewsTeaser({ country }: { country: CountryCode }) {
  const fetcher = useServerFn(getNews);
  const [items, setItems] = useState<{ title: string; link: string; pubDate: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetcher({ data: { country } })
      .then((res) => {
        if (!cancelled) setItems(res.data.slice(0, 3));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country, fetcher]);

  if (!loading && items.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Financial News" hint={`${COUNTRIES[country].flag} ${COUNTRIES[country].name} headlines`}>
        <a
          href={`/news?country=${country}`}
          className="text-xs font-medium text-[color:var(--brand)] hover:underline"
        >
          See all
        </a>
      </SectionHeader>
      <div className="space-y-2">
        {loading
          ? [0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-alt" />)
          : items.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3 text-sm shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="text-foreground">{item.title}</span>
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
            ))}
      </div>
    </section>
  );
}

function Currencies({
  rates,
  ratesYesterday,
  base,
  currency,
  isLoading,
  isPinned,
  onTogglePin,
}: {
  rates: Record<string, number>;
  ratesYesterday: Record<string, number>;
  base: string;
  currency: string;
  isLoading: boolean;
  isPinned: (key: string) => boolean;
  onTogglePin: (key: string) => void;
}) {
  const baseRate = rates[base];
  const baseRateY = ratesYesterday[base];
  const featured = [
    "USD", "EUR", "GBP", "JPY", "AED", "INR",
    "CNY", "AUD", "CAD", "CHF", "SGD", "HKD",
  ];
  const list = featured.filter((c) => c !== base && rates[c]);

  if (isLoading) {
    return <SectionLoadingState type="currencies" />;
  }

  return (
    <section>
      <SectionHeader title="Currencies" hint={`1 ${base} converts to`} />
      <div className="rounded-2xl bg-slate-900 p-5 text-white shadow-lg">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((ccy) => (
            <CurrencyTile
              key={ccy}
              base={base}
              ccy={ccy}
              rate={rates[ccy]}
              baseRate={baseRate}
              rateY={ratesYesterday[ccy]}
              baseRateY={baseRateY}
              isPinned={isPinned(`fx:${ccy}`)}
              onTogglePin={() => onTogglePin(`fx:${ccy}`)}
            />
          ))}
        </div>
        <div className="mt-3 text-[10px] text-white/75">Base: {currency} · vs yesterday's close</div>
      </div>
    </section>
  );
}

function CurrencyTile({
  base,
  ccy,
  rate,
  baseRate,
  rateY,
  baseRateY,
  isPinned,
  onTogglePin,
}: {
  base: string;
  ccy: string;
  rate: number;
  baseRate: number;
  rateY?: number;
  baseRateY?: number;
  isPinned: boolean;
  onTogglePin: () => void;
}) {
  const [open, setOpen] = useState(false);
  const perBase = rate / baseRate;
  const perBaseY = baseRateY && rateY ? rateY / baseRateY : NaN;
  const change = Number.isFinite(perBaseY) ? perBase - perBaseY : 0;
  const pct =
    Number.isFinite(perBaseY) && perBaseY ? ((perBase - perBaseY) / perBaseY) * 100 : 0;
  const up = pct >= 0;

  const flag = CURRENCY_FLAGS[ccy] || "🏳";
  const name = CURRENCY_NAMES[ccy] || ccy;

  return (
    <div className="flex flex-col gap-0.5 border-b border-white/10 pb-2">
      <div className="flex items-baseline justify-between">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/80 hover:text-white"
          title={`${base} → ${ccy} history`}
        >
          <span className="text-sm" aria-hidden>{flag}</span>
          <span>{ccy}</span>
          <LineChartIcon className="ml-0.5 inline h-3 w-3 opacity-60" />
        </button>
        <div className="flex items-center gap-1">
          <FavoriteButton pinned={isPinned} onToggle={onTogglePin} dark />
          <span className="font-mono text-sm font-medium tabular text-white">
            {fmtNumber(perBase, perBase < 1 ? 4 : 2)}
          </span>
        </div>
      </div>
      <div className="text-[9px] text-white/40 truncate">{name}</div>
      {pct !== 0 ? (
        <div
          className="text-right font-mono text-[12px] font-semibold tabular"
          style={{ color: up ? "var(--positive)" : "var(--negative)" }}
        >
          {up ? "▲ +" : "▼ -"}
          {fmtNumber(Math.abs(change), perBase < 1 ? 4 : 2)} ({fmtPct(pct)})
        </div>
      ) : (
        <div className="text-right font-mono text-[12px] text-white/75">— 24h</div>
      )}
      <HistoryDialog
        open={open}
        onOpenChange={setOpen}
        title={`${base} / ${ccy}`}
        symbol={`${base}${ccy}=X`}
        unitLabel={`${ccy} per 1 ${base}`}
        tint={up ? "#16a34a" : "#dc2626"}
      />
    </div>
  );
}

