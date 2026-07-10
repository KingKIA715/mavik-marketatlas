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
import { getMarketSnapshot, triggerSync, type MarketSnapshot } from "@/lib/market.functions";
import { fmtCurrency, fmtNumber, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { HistoryDialog } from "@/components/HistoryDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileNav } from "@/components/MobileNav";
import {
  LineChart as LineChartIcon,
  TrendingDown,
  TrendingUp,
  Fuel,
  RefreshCw,
  Calculator,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  MetalRowSkeleton,
  IndexCardSkeleton,
  MoversListSkeleton,
  FuelTileSkeleton,
  CurrencyTileSkeleton,
  CryptoCardSkeleton,
} from "@/components/SkeletonLoaders";

const snapshotQuery = (fetcher: () => Promise<MarketSnapshot>) =>
  queryOptions({
    queryKey: ["market-snapshot"],
    queryFn: fetcher,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarketAtlas — Global Financial Hub for Common People" },
      {
        name: "description",
        content:
          "Live gold, silver, platinum, crypto prices, stock indices, fuel rates and currency exchange across India, US, Europe, UK and UAE. Free, refreshed hourly.",
      },
      { property: "og:title", content: "MarketAtlas — Global Financial Hub" },
      {
        property: "og:description",
        content:
          "Metals, crypto, stocks, fuel and FX — in your country, your currency, your units.",
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
  const { data, isLoading } = useSuspenseQuery(snapshotQuery(fetcher));
  const [country, setCountry] = useState<CountryCode>("IN");
  const [includeGST, setIncludeGST] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search).get("country")?.toUpperCase();
    if (p && p in COUNTRIES && p !== country) setCountry(p as CountryCode);
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        country={country}
        onCountryChange={setCountry}
        fetchedAt={data.fetchedAt}
      />

      <CountryPills country={country} onChange={setCountry} />

      <main
        suppressHydrationWarning
        className="mx-auto max-w-6xl space-y-12 px-4 pb-24 pt-6 sm:px-6 sm:pb-16 sm:pt-8"
      >
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
        />

        <CryptoSection
          crypto={data.crypto}
          cryptoChange={data.cryptoChange}
          toLocal={toLocal}
          currency={def.currency}
          isLoading={isLoading}
        />

        <StockMarket
          country={country}
          quotes={data.quotes}
          basket={data.baskets[country] ?? []}
          isLoading={isLoading}
        />

        <Gasoline
          country={country}
          crude={data.crude}
          toLocal={toLocal}
          currency={def.currency}
          isLoading={isLoading}
        />

        <Currencies
          rates={data.rates.rates}
          ratesYesterday={data.ratesYesterday.rates}
          base={def.currency}
          currency={def.currency}
          isLoading={isLoading}
        />

        <Footer
          fetchedAt={data.fetchedAt}
          country={country}
          sources={{
            metals: data.metalsSource,
            rates: data.ratesSource,
            crypto: data.cryptoSource,
            quotes: data.quotesSource,
            crude: data.crudeSource,
          }}
        />
      </main>

      <MobileNav />
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

/* =====================================================================
 * COUNTRY PILLS + CHANGE BADGE
 * ===================================================================== */

function CountryPills({
  country,
  onChange,
}: {
  country: CountryCode;
  onChange: (c: CountryCode) => void;
}) {
  return (
    <div className="border-b border-border bg-card/50">
      <div className="mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-4 py-2.5 sm:px-6">
        {COUNTRY_ORDER.map((c) => {
          const cd = COUNTRIES[c];
          const active = c === country;
          return (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white shadow-sm"
                  : "border-border bg-background text-foreground hover:bg-surface-alt",
              )}
              aria-pressed={active}
            >
              <span aria-hidden>{cd.flag}</span>
              <span>{COUNTRY_SHORT[c]}</span>
            </button>
          );
        })}
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
 * HEADER
 * ===================================================================== */

function Header({
  country,
  onCountryChange,
  fetchedAt,
}: {
  country: CountryCode;
  onCountryChange: (c: CountryCode) => void;
  fetchedAt: string;
}) {
  const def = COUNTRIES[country];
  const queryClient = useQueryClient();
  const sync = useServerFn(triggerSync);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    | { kind: "idle" }
    | { kind: "ok"; at: string; durationMs: number }
    | { kind: "err"; message: string }
  >({ kind: "idle" });

  const onSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await sync();
      if (res.ok) {
        setSyncStatus({ kind: "ok", at: res.fetchedAt, durationMs: res.durationMs });
        await queryClient.invalidateQueries({ queryKey: ["market-snapshot"] });
      } else {
        setSyncStatus({ kind: "err", message: res.error });
      }
    } catch (err) {
      setSyncStatus({
        kind: "err",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="border-b border-border bg-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Market<span className="text-[color:var(--brand)]">Atlas</span>
              <span className="hidden sm:inline"> — Global Financial Hub</span>
            </h1>
            <div className="flex shrink-0 items-center gap-2 sm:hidden">
              <Link
                to="/resources"
                title="Financial calculators & tools"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 text-xs font-semibold text-white hover:bg-white/10"
              >
                <Calculator className="h-3.5 w-3.5" />
                Tools
              </Link>
              <ThemeToggle />
            </div>
          </div>
          <p className="mt-1 max-w-md text-xs text-white/85 sm:text-sm">
            Global financial hub for common people.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Select value={country} onValueChange={(v) => onCountryChange(v as CountryCode)}>
              <SelectTrigger className="h-9 w-full border-white/15 bg-white/5 text-white hover:bg-white/10 sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_ORDER.map((c) => {
                  const cd = COUNTRIES[c];
                  return (
                    <SelectItem key={c} value={c}>
                      <span className="mr-2">{cd.flag}</span>
                      <span>{cd.name}</span>
                      <span className="ml-2 font-mono text-[10px] text-muted-foreground">
                        {cd.currency}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={onSync}
              disabled={syncing}
              title="Force refresh from upstream APIs"
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white transition-colors hover:bg-white/10",
                syncing && "cursor-wait opacity-70",
              )}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
              {syncing ? "Syncing…" : "Sync now"}
            </button>
            <Link
              to="/resources"
              title="Financial calculators & tools"
              className="hidden sm:inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-3 text-xs font-semibold text-white hover:bg-white/10"
            >
              <Calculator className="h-3.5 w-3.5" />
              Resources
            </Link>
            <span className="hidden sm:inline-flex"><ThemeToggle /></span>
          </div>

          <div className="flex items-center gap-3">
            <LocalDate iso={fetchedAt} locale={def.locale} />
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/80">
                Live
              </span>
            </span>
          </div>
          {syncStatus.kind !== "idle" ? (
            <div
              suppressHydrationWarning
              className="font-mono text-[10px]"
              style={{
                color:
                  syncStatus.kind === "ok"
                    ? "rgb(74 222 128)"
                    : "rgb(248 113 113)",
              }}
            >
              {syncStatus.kind === "ok"
                ? `Synced ${new Date(syncStatus.at).toISOString().slice(11, 19)}Z · ${syncStatus.durationMs}ms`
                : `Sync failed: ${syncStatus.message}`}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function LocalDate({ iso, locale }: { iso: string; locale: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    try {
      setText(
        new Date(iso).toLocaleDateString(locale, {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      );
    } catch {
      setText(new Date(iso).toDateString());
    }
  }, [iso, locale]);
  return (
    <span suppressHydrationWarning className="font-mono text-[11px] text-white/80">
      {text || "\u00A0"}
    </span>
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
}) {
  const [open, setOpen] = useState(false);
  const [historyKarat, setHistoryKarat] = useState<number | null>(null);
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
                "rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
                METAL_TINT[metalCode],
              )}
            >
              {metalName}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              Spot {yahooSymbol}
            </span>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-surface-alt"
          >
            <LineChartIcon className="h-3 w-3" />
            5y history
          </button>
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
}: {
  crypto: MarketSnapshot["crypto"];
  cryptoChange: MarketSnapshot["cryptoChange"];
  toLocal: (usd: number) => number;
  currency: string;
  isLoading: boolean;
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
}: {
  cryptoDef: { code: CryptoCode; name: string; yahoo: string; icon: string };
  price: number;
  change: { change: number; changePercent: number };
  currency: string;
  toLocal: (usd: number) => number;
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
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-surface-alt"
          >
            <LineChartIcon className="h-3 w-3" />
            History
          </button>
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
}: {
  country: CountryCode;
  quotes: MarketSnapshot["quotes"];
  basket: MarketSnapshot["quotes"];
  isLoading: boolean;
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
          localIndices.map((q) => <IndexCard key={q.ticker} quote={q} />)
        )}
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        <MoversList title="Top Gainers" icon="up" rows={gainers} />
        <MoversList title="Top Losers" icon="down" rows={losers} />
      </div>
    </section>
  );
}

function IndexCard({ quote }: { quote: MarketSnapshot["quotes"][number] }) {
  const def = STOCKS[quote.ticker];
  const up = quote.change >= 0;
  const accent = up ? "var(--positive)" : "var(--negative)";
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-bold text-foreground">{def?.name ?? quote.ticker}</div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-surface-alt"
        >
          <LineChartIcon className="h-3 w-3" />
          History
        </button>
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

function Currencies({
  rates,
  ratesYesterday,
  base,
  currency,
  isLoading,
}: {
  rates: Record<string, number>;
  ratesYesterday: Record<string, number>;
  base: string;
  currency: string;
  isLoading: boolean;
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
}: {
  base: string;
  ccy: string;
  rate: number;
  baseRate: number;
  rateY?: number;
  baseRateY?: number;
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
        <span className="font-mono text-sm font-medium tabular text-white">
          {fmtNumber(perBase, perBase < 1 ? 4 : 2)}
        </span>
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

/* =====================================================================
 * FOOTER
 * ===================================================================== */

function Footer({
  fetchedAt,
  country,
  sources,
}: {
  fetchedAt: string;
  country: CountryCode;
  sources: { metals: string; rates: string; crypto: string; quotes: string; crude: string };
}) {
  const [timeText, setTimeText] = useState("");
  const def = COUNTRIES[country];
  useEffect(() => {
    try {
      setTimeText(
        new Date(fetchedAt).toLocaleString(def.locale, {
          hour: "2-digit",
          minute: "2-digit",
          day: "2-digit",
          month: "short",
        }),
      );
    } catch {
      setTimeText(new Date(fetchedAt).toLocaleString());
    }
  }, [fetchedAt, def.locale]);

  return (
    <footer className="mt-8 border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="font-medium">
          © MarketAtlas · built by{" "}
          <span className="font-semibold text-foreground">MAVIK group</span> using Lovable
        </span>
        <span suppressHydrationWarning className="font-mono">
          Last updated {timeText || "—"} · cached hourly
        </span>
      </div>
      <div className="mt-1.5 font-mono text-[10px] text-muted-foreground">
        Sources: metals — {sources.metals} · crypto — {sources.crypto} · FX — {sources.rates} · stocks — {sources.quotes} · crude — {sources.crude}
      </div>
      <div suppressHydrationWarning className="mt-1 font-mono text-[10px] text-muted-foreground">
        Data: {sources.metals} · Rates: {sources.rates} · Crypto: {sources.crypto} · Last sync:{" "}
        {new Date(fetchedAt).toISOString().slice(11, 16)} UTC
      </div>
    </footer>
  );
}
