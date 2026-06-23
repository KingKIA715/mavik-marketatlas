import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  COUNTRIES,
  COUNTRY_ORDER,
  COUNTRY_SHORT,
  FUEL_REFERENCE,
  GRAMS_PER_KG,
  GRAMS_PER_SOVEREIGN,
  GRAMS_PER_TROY_OUNCE,
  INDIA_GST,
  KARAT_PURITY,
  METALS,
  RETAIL_PREMIUM,
  STOCKS,
  STOCK_NAMES,
  type CountryCode,
  type MetalCode,
} from "@/lib/market-config";
import { getMarketSnapshot, type MarketSnapshot } from "@/lib/market.functions";
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
import { MetalHistoryDialog } from "@/components/MetalHistoryDialog";
import { LineChart as LineChartIcon, TrendingDown, TrendingUp, Fuel } from "lucide-react";

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
          "Live gold, silver, platinum prices, stock indices, fuel rates and currency exchange across India, US, Europe, UK and UAE. Free, refreshed hourly.",
      },
      { property: "og:title", content: "MarketAtlas — Global Financial Hub" },
      {
        property: "og:description",
        content:
          "Metals, stocks, fuel and FX — in your country, your currency, your units.",
      },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(snapshotQuery(getMarketSnapshot)),
  component: Dashboard,
});

function Dashboard() {
  const fetcher = useServerFn(getMarketSnapshot);
  const { data } = useSuspenseQuery(snapshotQuery(fetcher));
  const [country, setCountry] = useState<CountryCode>("IN");
  const [includeGST, setIncludeGST] = useState(false);

  // Sync country with ?country= URL param (client-only to avoid SSR mismatch)
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
        className="mx-auto max-w-6xl space-y-12 px-4 pb-16 pt-6 sm:px-6 sm:pt-8"
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
        />

        <StockMarket
          country={country}
          quotes={data.quotes}
          basket={data.baskets[country] ?? []}
        />

        <Gasoline
          country={country}
          crude={data.crude}
          toLocal={toLocal}
          currency={def.currency}
        />

        <Currencies
          rates={data.rates.rates}
          ratesYesterday={data.ratesYesterday.rates}
          base={def.currency}
          currency={def.currency}
        />

        <Footer
          fetchedAt={data.fetchedAt}
          country={country}
          sources={{
            metals: data.metalsSource,
            rates: data.ratesSource,
            quotes: data.quotesSource,
            crude: data.crudeSource,
          }}
        />
      </main>
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
  return (
    <header className="border-b border-border bg-[color:var(--ink)] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        {/* LEFT — brand + slogan */}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Market<span className="text-[color:var(--brand)]">Atlas</span>
          </h1>
          <p className="mt-1 max-w-md text-xs text-white/60 sm:text-sm">
            Global financial hub for common people.
          </p>
        </div>

        {/* RIGHT — country selector + local date + live */}
        <div className="flex flex-col gap-2 sm:items-end">
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
}: {
  country: CountryCode;
  metals: MarketSnapshot["metals"];
  metalsChange: MarketSnapshot["metalsChange"];
  toLocal: (usd: number) => number;
  fx: number;
  currency: string;
  includeGST: boolean;
  onGSTChange: (v: boolean) => void;
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
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {k}K Gold
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

      <MetalHistoryDialog
        open={open}
        onOpenChange={setOpen}
        metalName={metalName}
        metalCode={metalCode}
        yahooSymbol={yahooSymbol}
        fxToDisplay={fx}
        displayCurrency={currency}
        unit={def.metalUnit}
      />
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
 * 2) STOCK MARKET
 * ===================================================================== */

function StockMarket({
  country,
  quotes,
  basket,
}: {
  country: CountryCode;
  quotes: MarketSnapshot["quotes"];
  basket: MarketSnapshot["quotes"];
}) {
  const def = COUNTRIES[country];

  const localIndices = useMemo(
    () => quotes.filter((q) => def.stockIndices.includes(q.ticker)),
    [quotes, def.stockIndices],
  );

  const sorted = [...basket].sort((a, b) => b.changePercent - a.changePercent);
  const gainers = sorted.slice(0, 5);
  const losers = sorted.slice(-5).reverse();

  return (
    <section>
      <SectionHeader
        title="Stock Market"
        hint={`${def.flag} ${def.name} · indices and large-cap movers`}
      />

      {/* Indices */}
      <div className="grid gap-3 sm:grid-cols-3">
        {localIndices.length === 0 ? (
          <div className="col-span-full rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Indices currently unavailable for {def.name}.
          </div>
        ) : (
          localIndices.map((q) => <IndexCard key={q.ticker} quote={q} />)
        )}
      </div>

      {/* Gainers / Losers */}
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
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-bold text-foreground">{def?.name ?? quote.ticker}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {def?.exchange}
        </div>
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
 * 3) GASOLINE
 * ===================================================================== */

function Gasoline({
  country,
  crude,
  toLocal,
  currency,
}: {
  country: CountryCode;
  crude: MarketSnapshot["crude"];
  toLocal: (usd: number) => number;
  currency: string;
}) {
  const def = COUNTRIES[country];
  const fuel = FUEL_REFERENCE[country];
  const crudeLocal = toLocal(crude.pricePerBarrelUSD);
  const up = crude.change >= 0;

  return (
    <section>
      <SectionHeader
        title="Gasoline & Fuel"
        hint={`Live crude oil + indicative retail prices in ${def.name}`}
      />

      <div className="grid gap-3 lg:grid-cols-5">
        {/* Crude */}
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
          value={fuel.petrol}
          unit={`per ${def.fuelVolumeUnit}`}
          currency={currency}
          changePercent={crude.changePercent}
        />
        <FuelTile
          label="Diesel"
          value={fuel.diesel}
          unit={`per ${def.fuelVolumeUnit}`}
          currency={currency}
          changePercent={crude.changePercent}
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
        Retail petrol/diesel/LPG are indicative regional reference prices and vary by city, dealer, and date.
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
}: {
  label: string;
  value: number;
  unit: string;
  currency: string;
  changePercent?: number;
}) {
  const hasChange = typeof changePercent === "number" && Number.isFinite(changePercent);
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
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
 * 4) CURRENCIES
 * ===================================================================== */

function Currencies({
  rates,
  ratesYesterday,
  base,
  currency,
}: {
  rates: Record<string, number>;
  ratesYesterday: Record<string, number>;
  base: string;
  currency: string;
}) {
  const baseRate = rates[base];
  const baseRateY = ratesYesterday[base];
  const featured = [
    "USD", "EUR", "GBP", "JPY", "AED", "INR",
    "CNY", "AUD", "CAD", "CHF", "SGD", "HKD",
  ];
  const list = featured.filter((c) => c !== base && rates[c]);

  return (
    <section>
      <SectionHeader title="Currencies" hint={`1 ${base} converts to`} />
      <div className="rounded-2xl bg-[color:var(--ink)] p-5 text-white shadow-lg">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {list.map((ccy) => {
            const perBase = rates[ccy] / baseRate;
            const perBaseY =
              baseRateY && ratesYesterday[ccy]
                ? ratesYesterday[ccy] / baseRateY
                : NaN;
            const change = Number.isFinite(perBaseY) ? perBase - perBaseY : 0;
            const pct = Number.isFinite(perBaseY) && perBaseY
              ? ((perBase - perBaseY) / perBaseY) * 100
              : 0;
            const up = pct >= 0;
            return (
              <div
                key={ccy}
                className="flex flex-col gap-0.5 border-b border-white/10 pb-2"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">
                    {ccy}
                  </span>
                  <span className="font-mono text-sm font-medium tabular text-white">
                    {fmtNumber(perBase, perBase < 1 ? 4 : 2)}
                  </span>
                </div>
                {pct !== 0 ? (
                  <div
                    className="text-right font-mono text-[12px] font-semibold tabular"
                    style={{ color: up ? "var(--positive)" : "var(--negative)" }}
                  >
                    {up ? "▲ +" : "▼ -"}
                    {fmtNumber(Math.abs(change), perBase < 1 ? 4 : 2)} ({fmtPct(pct)})
                  </div>
                ) : (
                  <div className="text-right font-mono text-[12px] text-white/40">— 24h</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-[10px] text-white/40">Base: {currency} · vs yesterday's close</div>
      </div>
    </section>
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
  sources: { metals: string; rates: string; quotes: string; crude: string };
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
      <div className="mt-1.5 font-mono text-[10px] text-muted-foreground/70">
        Sources: metals — {sources.metals} · FX — {sources.rates} · stocks — {sources.quotes} · crude — {sources.crude}
      </div>
    </footer>
  );
}
