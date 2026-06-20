import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  COUNTRIES,
  GRAMS_PER_TROY_OUNCE,
  GRAMS_PER_KG,
  GRAMS_PER_SAVARAN,
  KARAT_PURITY,
  METALS,
  RETAIL_PREMIUM,
  STOCKS,
  type CountryCode,
} from "@/lib/market-config";
import { getMarketSnapshot, type MarketSnapshot } from "@/lib/market.functions";
import { fmtCurrency, fmtNumber, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

const snapshotQuery = (fetcher: () => Promise<MarketSnapshot>) =>
  queryOptions({
    queryKey: ["market-snapshot"],
    queryFn: fetcher,
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MarketAtlas — Live Gold, Silver & Global Index Rates" },
      {
        name: "description",
        content:
          "Real-time precious metal prices, stock indices and 150+ currency rates. Free, cached hourly, no signup.",
      },
      { property: "og:title", content: "MarketAtlas — Global market rates at a glance" },
      {
        property: "og:description",
        content:
          "Gold, silver, platinum, copper and major indices in your home currency.",
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
  const def = COUNTRIES[country];

  const usdTo = (ccy: string) => data.rates.rates[ccy] ?? NaN;
  const toLocal = (usd: number) => usd * usdTo(def.currency);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <Header fetchedAt={data.fetchedAt} />

        <CountryStrip current={country} onChange={setCountry} />

        <section className="mt-10">
          <SectionTitle title="Precious Metals" hint={`Per ${def.metalUnit} · ${def.currency}`} />
          <MetalsGrid
            country={country}
            metals={data.metals}
            toLocal={toLocal}
            currency={def.currency}
          />
        </section>

        <section className="mt-10">
          <SectionTitle title="Stock Indices" hint="Global markets" />
          <IndicesList quotes={data.quotes} country={country} />
        </section>

        <section className="mt-10">
          <SectionTitle title="Currency Rates" hint={`1 ${def.currency} =`} />
          <CurrencyPanel rates={data.rates.rates} base={def.currency} />
        </section>

        <Footer
          fetchedAt={data.fetchedAt}
          sources={[data.metalsSource, data.ratesSource, data.quotesSource]}
        />
      </div>
    </div>
  );
}

/* ---------------- HEADER ---------------- */

function ClientDate({ iso }: { iso: string }) {
  const [text, setText] = useState<string>("");
  useEffect(() => {
    setText(
      new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );
  }, [iso]);
  // suppressHydrationWarning so SSR's empty string can be replaced on mount
  return (
    <span suppressHydrationWarning>{text || "\u00A0"}</span>
  );
}

function Header({ fetchedAt }: { fetchedAt: string }) {
  return (
    <header className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Market<span className="text-[color:var(--brand)]">Atlas</span>
        </h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          Global real-time commodity and index tracker.
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <ClientDate iso={fetchedAt} />
        </p>
        <div className="mt-1 inline-flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--positive)] opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[color:var(--positive)]" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Live
          </span>
        </div>
      </div>
    </header>
  );
}

/* ---------------- COUNTRY STRIP ---------------- */

function CountryStrip({
  current,
  onChange,
}: {
  current: CountryCode;
  onChange: (c: CountryCode) => void;
}) {
  return (
    <div className="no-scrollbar mt-6 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {Object.values(COUNTRIES).map((c) => {
        const active = c.code === current;
        return (
          <button
            key={c.code}
            onClick={() => onChange(c.code)}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all",
              active
                ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground",
            )}
          >
            <span className="text-sm leading-none">{c.flag}</span>
            <span>{c.name}</span>
            <span
              className={cn(
                "font-mono text-[9px] tracking-wider",
                active ? "text-white/60" : "text-muted-foreground/70",
              )}
            >
              {c.currency}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- SECTION TITLE ---------------- */

function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-foreground">{title}</h2>
      {hint ? <span className="text-[10px] text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

/* ---------------- METALS ---------------- */

const METAL_BADGE: Record<string, string> = {
  XAU: "bg-amber-50 text-amber-700",
  XAG: "bg-slate-100 text-slate-600",
  XPT: "bg-slate-100 text-slate-500",
  HG: "bg-orange-50 text-orange-700",
};

function MetalsGrid({
  country,
  metals,
  toLocal,
  currency,
}: {
  country: CountryCode;
  metals: MarketSnapshot["metals"];
  toLocal: (usd: number) => number;
  currency: string;
}) {
  const unit = COUNTRIES[country].metalUnit;
  const gold = METALS.find((m) => m.code === "XAU")!;
  const silver = METALS.find((m) => m.code === "XAG")!;
  const platinum = METALS.find((m) => m.code === "XPT")!;
  const copper = METALS.find((m) => m.code === "HG")!;

  const perUnit = (usdOz: number) =>
    unit === "gram" ? usdOz / GRAMS_PER_TROY_OUNCE : usdOz;

  return (
    <div className="space-y-3">
      {/* Top row: Gold (large) + Silver */}
      <div className="grid gap-3 sm:grid-cols-2">
        <MetalCard
          metal={gold}
          usd={perUnit(metals[gold.code])}
          local={toLocal(perUnit(metals[gold.code]))}
          currency={currency}
          unit={unit}
          showKarats
        />
        <MetalCard
          metal={silver}
          usd={perUnit(metals[silver.code])}
          local={toLocal(perUnit(metals[silver.code]))}
          currency={currency}
          unit={unit}
        />
      </div>

      {/* Bottom row: compact platinum + copper */}
      <div className="grid gap-3 sm:grid-cols-2">
        <MetalChip
          metal={platinum}
          local={toLocal(perUnit(metals[platinum.code]))}
          currency={currency}
        />
        <MetalChip
          metal={copper}
          local={toLocal(perUnit(metals[copper.code]))}
          currency={currency}
        />
      </div>
    </div>
  );
}

function MetalCard({
  metal,
  usd,
  local,
  currency,
  unit,
  showKarats = false,
}: {
  metal: (typeof METALS)[number];
  usd: number;
  local: number;
  currency: string;
  unit: "gram" | "ounce";
  showKarats?: boolean;
}) {
  const valid = Number.isFinite(local) && local > 0;
  return (
    <article className="rounded-2xl border border-border bg-surface-alt p-4 transition-colors hover:border-muted-foreground/30">
      <div className="mb-2 flex items-start justify-between">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            METAL_BADGE[metal.code] ?? "bg-slate-100 text-slate-600",
          )}
        >
          {metal.name}
        </span>
        <span className="font-mono text-[10px] font-medium text-muted-foreground">
          {metal.symbol} · per {unit}
        </span>
      </div>
      <div className="font-mono text-xl font-bold text-foreground tabular sm:text-2xl">
        {valid ? fmtCurrency(local, currency, { maximumFractionDigits: metal.code === "HG" ? 3 : 2 }) : "—"}
      </div>
      <div className="mt-0.5 font-mono text-[10px] font-medium text-muted-foreground">
        {valid ? `$${fmtNumber(usd, metal.code === "HG" ? 4 : 2)} USD` : "Unavailable"}
      </div>

      {showKarats && metal.karats && valid ? (
        <div className="mt-3 space-y-1 border-t border-border pt-3">
          {metal.karats.map((k) => (
            <div key={k} className="flex justify-between text-[11px] font-medium text-muted-foreground">
              <span className="font-mono">{k}K</span>
              <span className="font-mono tabular text-foreground">
                {fmtCurrency(local * KARAT_PURITY[k], currency, { maximumFractionDigits: 0 })}
              </span>
            </div>
          ))}
        </div>
      ) : showKarats ? (
        <div className="mt-3 border-t border-border pt-3 text-center text-[10px] text-muted-foreground">
          Real-time data
        </div>
      ) : null}
    </article>
  );
}

function MetalChip({
  metal,
  local,
  currency,
}: {
  metal: (typeof METALS)[number];
  local: number;
  currency: string;
}) {
  const valid = Number.isFinite(local) && local > 0;
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface-alt p-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {metal.name}
      </span>
      <span
        className={cn(
          "font-mono text-sm font-bold tabular",
          valid ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {valid ? fmtCurrency(local, currency, { maximumFractionDigits: 2 }) : "No price"}
      </span>
    </div>
  );
}

/* ---------------- INDICES ---------------- */

function IndicesList({
  quotes,
  country,
}: {
  quotes: MarketSnapshot["quotes"];
  country: CountryCode;
}) {
  const sorted = useMemo(() => {
    const home = COUNTRIES[country].stockIndices;
    return [...quotes].sort((a, b) => {
      const ai = home.includes(a.ticker) ? 0 : 1;
      const bi = home.includes(b.ticker) ? 0 : 1;
      return ai - bi;
    });
  }, [quotes, country]);

  return (
    <div className="space-y-2">
      {sorted.map((q) => {
        const def = STOCKS[q.ticker];
        const up = q.change >= 0;
        const accent = up ? "var(--positive)" : "var(--negative)";
        return (
          <div
            key={q.ticker}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="h-9 w-1 shrink-0 rounded-full"
                style={{ background: accent }}
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-bold text-foreground sm:text-sm">
                  {def?.name ?? q.ticker}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {def?.exchange ?? "—"} · {COUNTRIES[def?.country ?? "US"].flag}{" "}
                  {COUNTRIES[def?.country ?? "US"].name}
                </div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-mono text-xs font-bold text-foreground tabular sm:text-sm">
                {fmtNumber(q.price, 2)}
                <span className="ml-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  {q.currency}
                </span>
              </div>
              <div
                className="font-mono text-[10px] font-bold tabular"
                style={{ color: accent }}
              >
                {up ? "▲ +" : "▼ "}
                {fmtNumber(Math.abs(q.change), 2)} · {fmtPct(q.changePercent)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- CURRENCY ---------------- */

function CurrencyPanel({
  rates,
  base,
}: {
  rates: Record<string, number>;
  base: string;
}) {
  const baseRate = rates[base];
  const featured = [
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "AED",
    "INR",
    "CNY",
    "AUD",
    "CAD",
    "CHF",
    "SGD",
    "HKD",
  ];
  const list = featured.filter((c) => c !== base && rates[c]);

  return (
    <div className="rounded-2xl bg-[color:var(--ink)] p-4 text-white shadow-lg sm:p-5">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((ccy) => {
          const perBase = rates[ccy] / baseRate;
          return (
            <div
              key={ccy}
              className="flex items-baseline justify-between border-b border-white/10 pb-2"
            >
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/50">
                {ccy}
              </span>
              <span className="font-mono text-xs font-medium tabular text-white">
                {fmtNumber(perBase, perBase < 1 ? 4 : 2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- FOOTER ---------------- */

function Footer({
  fetchedAt,
  sources,
}: {
  fetchedAt: string;
  sources: string[];
}) {
  const [timeText, setTimeText] = useState<string>("");
  useEffect(() => {
    setTimeText(
      new Date(fetchedAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [fetchedAt]);

  return (
    <footer className="mt-12 border-t border-border pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="font-medium">© MarketAtlas · built on Lovable Cloud</span>
        <span suppressHydrationWarning className="font-mono">
          Updated {timeText || "—"} · cached hourly
        </span>
      </div>
      <div className="mt-1.5 font-mono text-[9px] text-muted-foreground/70">
        Sources: {sources.join(" · ")}
      </div>
    </footer>
  );
}
