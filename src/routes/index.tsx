import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  COUNTRIES,
  GRAMS_PER_TROY_OUNCE,
  KARAT_PURITY,
  METALS,
  STOCKS,
  type CountryCode,
} from "@/lib/market-config";
import { getMarketSnapshot, type MarketSnapshot } from "@/lib/market.functions";
import { fmtCurrency, fmtNumber, fmtPct, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const snapshotQuery = (fetcher: () => Promise<MarketSnapshot>) =>
  queryOptions({
    queryKey: ["market-snapshot"],
    queryFn: fetcher,
    staleTime: 60 * 60 * 1000, // 1h client cache
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

  // 1 USD = rate[CCY]
  const usdTo = (ccy: string) => data.rates.rates[ccy] ?? NaN;
  const toLocal = (usd: number) => usd * usdTo(def.currency);

  return (
    <div className="relative z-10 mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <Header
        fetchedAt={data.fetchedAt}
        sources={[data.metalsSource, data.ratesSource, data.quotesSource]}
      />

      <CountryStrip current={country} onChange={setCountry} />

      <section className="mt-12">
        <SectionTitle eyebrow="01" title="Precious metals & copper" />
        <MetalsGrid
          country={country}
          metals={data.metals}
          toLocal={toLocal}
          currency={def.currency}
        />
      </section>

      <section className="mt-16">
        <SectionTitle eyebrow="02" title="Stock indices" />
        <IndicesGrid quotes={data.quotes} country={country} />
      </section>

      <section className="mt-16">
        <SectionTitle eyebrow="03" title="Currency exchange" subtitle={`1 ${def.currency} =`} />
        <CurrencyTable rates={data.rates.rates} base={def.currency} />
      </section>

      <Footer />
    </div>
  );
}

/* --------------------------------------------------------------- HEADER -- */

function Header({ fetchedAt, sources }: { fetchedAt: string; sources: string[] }) {
  return (
    <header className="border-b border-border pb-8">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Vol. 1 · No. 01 · {new Date(fetchedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="font-serif text-5xl leading-[0.95] tracking-tight text-foreground sm:text-7xl">
            Market<span className="text-[color:var(--gold)]">Atlas</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            A quiet, daily ledger of metals, indices and exchange rates from around the world.
          </p>
        </div>
        <div className="hidden text-right sm:block">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Last fetched
          </p>
          <p className="font-mono text-sm text-foreground">{fmtTime(fetchedAt)}</p>
          <p className="mt-2 max-w-[14rem] text-[11px] leading-snug text-muted-foreground">
            {sources.join(" · ")}
          </p>
        </div>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------- COUNTRY BAR -- */

function CountryStrip({
  current,
  onChange,
}: {
  current: CountryCode;
  onChange: (c: CountryCode) => void;
}) {
  return (
    <nav className="mt-8 flex flex-wrap items-center gap-2">
      <span className="mr-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
        View as
      </span>
      {Object.values(COUNTRIES).map((c) => {
        const active = c.code === current;
        return (
          <button
            key={c.code}
            onClick={() => onChange(c.code)}
            className={cn(
              "group inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-all",
              active
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-foreground/80 hover:border-foreground/50",
            )}
          >
            <span className="text-base leading-none">{c.flag}</span>
            <span className="font-medium">{c.name}</span>
            <span
              className={cn(
                "font-mono text-[10px] tracking-wider",
                active ? "text-background/70" : "text-muted-foreground",
              )}
            >
              {c.currency}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

/* ----------------------------------------------------------- SECTION -- */

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-border pb-3">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[color:var(--gold)]">
          {eyebrow}
        </span>
        <h2 className="font-serif text-2xl leading-none text-foreground sm:text-3xl">{title}</h2>
      </div>
      {subtitle ? (
        <span className="font-mono text-xs text-muted-foreground">{subtitle}</span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ METALS -- */

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
  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {METALS.map((m) => {
        const usdPerOunce = metals[m.code];
        const usdPerUnit = unit === "gram" ? usdPerOunce / GRAMS_PER_TROY_OUNCE : usdPerOunce;
        const local = toLocal(usdPerUnit);
        return (
          <article key={m.code} className="bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p
                  className="font-mono text-[10px] uppercase tracking-[0.25em]"
                  style={{ color: `var(--${m.tint})` }}
                >
                  {m.symbol} · {m.code}
                </p>
                <h3 className="mt-1 font-serif text-2xl text-foreground">{m.name}</h3>
              </div>
              <span className="font-mono text-[10px] text-muted-foreground">
                per {unit}
              </span>
            </div>

            <p className="mt-5 font-mono text-2xl tabular text-foreground">
              {fmtCurrency(local, currency, { maximumFractionDigits: m.code === "HG" ? 3 : 2 })}
            </p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">
              ${fmtNumber(usdPerUnit, m.code === "HG" ? 4 : 2)} USD
            </p>

            {m.karats ? (
              <div className="mt-5 space-y-1.5 border-t border-border pt-4">
                {m.karats.map((k) => {
                  const priceK = local * KARAT_PURITY[k];
                  return (
                    <div key={k} className="flex items-baseline justify-between">
                      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        {k}K
                      </span>
                      <span className="font-mono text-sm tabular text-foreground">
                        {fmtCurrency(priceK, currency, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------- INDICES -- */

function IndicesGrid({
  quotes,
  country,
}: {
  quotes: MarketSnapshot["quotes"];
  country: CountryCode;
}) {
  // Order: home country first, then the rest
  const sorted = useMemo(() => {
    const home = COUNTRIES[country].stockIndices;
    return [...quotes].sort((a, b) => {
      const ai = home.includes(a.ticker) ? 0 : 1;
      const bi = home.includes(b.ticker) ? 0 : 1;
      return ai - bi;
    });
  }, [quotes, country]);

  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {sorted.map((q) => {
        const def = STOCKS[q.ticker];
        const up = q.change >= 0;
        return (
          <article key={q.ticker} className="bg-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  {def?.exchange ?? "—"} · {COUNTRIES[def?.country ?? "US"].flag}
                </p>
                <h3 className="mt-1 font-serif text-xl text-foreground">
                  {def?.name ?? q.ticker}
                </h3>
              </div>
              <span
                className={cn(
                  "font-mono text-[11px] font-medium",
                  up ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
                )}
              >
                {up ? "▲" : "▼"}
              </span>
            </div>
            <p className="mt-5 font-mono text-2xl tabular text-foreground">
              {fmtNumber(q.price, 2)}
              <span className="ml-1.5 font-sans text-[10px] uppercase tracking-wider text-muted-foreground">
                {q.currency}
              </span>
            </p>
            <p
              className={cn(
                "mt-1 font-mono text-xs",
                up ? "text-[color:var(--positive)]" : "text-[color:var(--negative)]",
              )}
            >
              {up ? "+" : ""}
              {fmtNumber(q.change, 2)} · {fmtPct(q.changePercent)}
            </p>
          </article>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------- CURRENCY -- */

function CurrencyTable({
  rates,
  base,
}: {
  rates: Record<string, number>;
  base: string;
}) {
  const baseRate = rates[base];
  // 1 base = (rates[ccy] / rates[base]) ccy
  const featured = ["USD", "EUR", "GBP", "JPY", "AED", "INR", "CNY", "AUD", "CAD", "CHF", "SGD", "HKD"];
  const list = featured.filter((c) => c !== base && rates[c]);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-secondary/40 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Currency</th>
            <th className="px-4 py-2.5 text-right font-medium">Rate</th>
            <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
              Inverse
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((ccy) => {
            const perBase = rates[ccy] / baseRate;
            const inverse = 1 / perBase;
            return (
              <tr key={ccy} className="border-b border-border last:border-0 odd:bg-card">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    {ccy}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular text-foreground">
                  {fmtNumber(perBase, perBase < 1 ? 4 : 2)}
                </td>
                <td className="hidden px-4 py-3 text-right font-mono tabular text-muted-foreground sm:table-cell">
                  {fmtNumber(inverse, inverse < 1 ? 4 : 2)} {base}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------- FOOTER -- */

function Footer() {
  return (
    <footer className="mt-20 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px] text-muted-foreground">
        <span>© MarketAtlas — built on Lovable Cloud</span>
        <span>Data cached hourly · refreshes on next visit</span>
      </div>
    </footer>
  );
}
