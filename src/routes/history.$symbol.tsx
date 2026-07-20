import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getHistory } from "@/lib/market.functions";
import { historyKey, readHistory, writeHistory, type HistoryPoint } from "@/lib/history-cache";
import { fmtCurrency, fmtNumber, fmtPct } from "@/lib/format";
import { resolveHistoryAsset } from "@/lib/history-assets";
import { Header, Footer } from "@/components/Layout";
import { MobileNav } from "@/components/MobileNav";
import { cn } from "@/lib/utils";

const SITE = "https://mavik-marketatlas.lovable.app";

type Range = "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y" | "10y";
const RANGE_LABEL: Record<Range, string> = {
  "1mo": "1M", "3mo": "3M", "6mo": "6M", "1y": "1Y", "2y": "2Y", "5y": "5Y", "10y": "10Y",
};
const RANGE_INTERVAL: Record<Range, "1d" | "1wk" | "1mo"> = {
  "1mo": "1d", "3mo": "1d", "6mo": "1d", "1y": "1wk", "2y": "1wk", "5y": "1mo", "10y": "1mo",
};
const RANGE_ORDER: Range[] = ["1mo", "3mo", "6mo", "1y", "2y", "5y", "10y"];

function historyQuery(symbol: string, alignMetal?: string) {
  return queryOptions({
    queryKey: ["history", symbol, "10y", "1mo", alignMetal ?? "raw"],
    queryFn: () =>
      getHistory({ data: { symbol, range: "10y", interval: "1mo", ...(alignMetal ? { alignMetal } : {}) } }),
    staleTime: 60 * 60 * 1000,
  });
}

export const Route = createFileRoute("/history/$symbol")({
  loader: async ({ context, params }) => {
    const asset = resolveHistoryAsset(decodeURIComponent(params.symbol));
    return context.queryClient.ensureQueryData(historyQuery(asset.symbol, asset.alignMetal));
  },
  head: ({ params }) => {
    const asset = resolveHistoryAsset(decodeURIComponent(params.symbol));
    const title = `${asset.title} Price History — Trends & Chart | MarketAtlas`;
    const description = `Historical ${asset.title} price trends with an interactive chart, period performance, and yearly highs/lows.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `${SITE}/history/${encodeURIComponent(asset.symbol)}` },
      ],
      links: [{ rel: "canonical", href: `${SITE}/history/${encodeURIComponent(asset.symbol)}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: `${asset.title} Price History`,
            description,
            about: `${asset.title} price history`,
            url: `${SITE}/history/${encodeURIComponent(asset.symbol)}`,
          }),
        },
      ],
    };
  },
  component: HistoryPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Couldn't load price history</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Link to="/" className="mt-6 inline-block text-primary underline">Back to dashboard</Link>
    </div>
  ),
});

function periodStats(points: HistoryPoint[], years: number) {
  if (!points.length) return null;
  const last = points[points.length - 1];
  const cutoff = new Date(last.date);
  cutoff.setFullYear(cutoff.getFullYear() - years);
  const slice = points.filter((p) => new Date(p.date) >= cutoff);
  if (slice.length < 2) return null;
  const start = slice[0];
  const end = slice[slice.length - 1];
  const high = slice.reduce((a, b) => (b.close > a.close ? b : a));
  const low = slice.reduce((a, b) => (b.close < a.close ? b : a));
  const change = end.close - start.close;
  const pct = (change / start.close) * 100;
  const cagr = (Math.pow(end.close / start.close, 1 / years) - 1) * 100;
  return { start, end, high, low, change, pct, cagr };
}

function yearlyAverages(points: HistoryPoint[]) {
  const buckets = new Map<number, number[]>();
  for (const p of points) {
    const y = Number(p.date.slice(0, 4));
    if (!buckets.has(y)) buckets.set(y, []);
    buckets.get(y)!.push(p.close);
  }
  return [...buckets.entries()]
    .map(([year, xs]) => ({
      year,
      avg: xs.reduce((a, b) => a + b, 0) / xs.length,
      high: Math.max(...xs),
      low: Math.min(...xs),
      close: xs[xs.length - 1],
    }))
    .sort((a, b) => b.year - a.year);
}

function formatTick(dateStr: string, range: Range): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  if (range === "1mo" || range === "3mo") return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (range === "6mo" || range === "1y") return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

/** Interactive, zoomable chart with crosshair, skeleton loading, retry, and an absolute/% toggle. */
function InteractiveChart({ asset }: { asset: ReturnType<typeof resolveHistoryAsset> }) {
  const fetcher = useServerFn(getHistory);
  const [range, setRange] = useState<Range>(asset.defaultRange);
  const [mode, setMode] = useState<"abs" | "pct">("abs");
  const [data, setData] = useState<HistoryPoint[] | null>(null);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    const interval = RANGE_INTERVAL[range];
    const cacheKey = historyKey(asset.alignMetal ? `${asset.symbol}@${asset.alignMetal}` : asset.symbol, range, interval);
    let cancelled = false;
    setError(null);

    (async () => {
      const cached = await readHistory(cacheKey);
      if (cancelled) return;
      if (cached) {
        setData(cached.data);
        setSource(cached.source + " · cached");
        return;
      }
      setLoading(true);
      try {
        const res = await fetcher({
          data: { symbol: asset.symbol, range, interval, ...(asset.alignMetal ? { alignMetal: asset.alignMetal } : {}) },
        });
        if (cancelled) return;
        setData(res.data);
        setSource(res.source);
        void writeHistory(cacheKey, res.data, res.source);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [range, asset.symbol, asset.alignMetal, fetcher, retryTick]);

  const rawSeries = useMemo(() => (data ?? []).map((p) => ({ date: p.date, value: p.close })), [data]);
  const first = rawSeries[0]?.value ?? 0;
  const series = useMemo(
    () => (mode === "pct" && first ? rawSeries.map((p) => ({ date: p.date, value: ((p.value - first) / first) * 100 })) : rawSeries),
    [rawSeries, mode, first],
  );

  const last = series[series.length - 1]?.value ?? 0;
  const startVal = series[0]?.value ?? 0;
  const totalPct = startVal ? ((last - startVal) / startVal) * 100 : 0;
  const high = rawSeries.reduce((a, b) => (b.value > a.value ? b : a), rawSeries[0]);
  const low = rawSeries.reduce((a, b) => (b.value < a.value ? b : a), rawSeries[0]);

  const fmtAbs = (v: number) => (asset.currency ? fmtCurrency(v, asset.currency, { maximumFractionDigits: 2 }) : fmtNumber(v, 2));
  const fmt = (v: number) => (mode === "pct" ? `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` : fmtAbs(v));

  const insight = useMemo(() => {
    if (!rawSeries.length || !high || !low) return null;
    const lastRaw = rawSeries[rawSeries.length - 1].value;
    const fromHigh = high.value ? ((lastRaw - high.value) / high.value) * 100 : 0;
    const fromLow = low.value ? ((lastRaw - low.value) / low.value) * 100 : 0;
    if (Math.abs(fromHigh) < 2) return `Near its ${RANGE_LABEL[range]} high.`;
    if (Math.abs(fromLow) < 2) return `Near its ${RANGE_LABEL[range]} low.`;
    return `${fmtNumber(Math.abs(fromHigh), 1)}% below its ${RANGE_LABEL[range]} high, ${fmtNumber(Math.abs(fromLow), 1)}% above its ${RANGE_LABEL[range]} low.`;
  }, [rawSeries, high, low, range]);

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {RANGE_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                range === r ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white" : "border-border bg-background text-foreground hover:bg-surface-alt",
              )}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-md border border-border p-0.5">
          {(["abs", "pct"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                "rounded px-2 py-1 text-[11px] font-semibold transition-colors",
                mode === m ? "bg-[color:var(--brand)] text-white" : "text-muted-foreground hover:bg-surface-alt",
              )}
            >
              {m === "abs" ? "Price" : "%"}
            </button>
          ))}
        </div>
      </div>

      {loading && series.length === 0 ? (
        <div className="mt-4 h-72 w-full animate-pulse rounded-lg bg-surface-alt" />
      ) : error ? (
        <div className="mt-4 flex h-72 flex-col items-center justify-center gap-3 text-sm text-destructive">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRetryTick((t) => t + 1)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-alt"
          >
            Retry
          </button>
        </div>
      ) : series.length === 0 ? (
        <div className="mt-4 flex h-72 items-center justify-center text-sm text-muted-foreground">No data.</div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Latest</div>
              <div className="font-mono text-xl font-bold">{fmt(last)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Start of {RANGE_LABEL[range]}</div>
              <div className="font-mono text-sm">{fmt(startVal)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{RANGE_LABEL[range]} high</div>
              <div className="font-mono text-sm">{fmtAbs(high?.value ?? 0)} <span className="text-muted-foreground">· {high?.date}</span></div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{RANGE_LABEL[range]} low</div>
              <div className="font-mono text-sm">{fmtAbs(low?.value ?? 0)} <span className="text-muted-foreground">· {low?.date}</span></div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Return</div>
              <div className="font-mono text-sm font-semibold" style={{ color: totalPct >= 0 ? "var(--positive)" : "var(--negative)" }}>
                {totalPct >= 0 ? "+" : ""}{totalPct.toFixed(1)}%
              </div>
            </div>
            {loading ? <span className="text-[10px] text-muted-foreground">refreshing…</span> : null}
          </div>

          {insight ? <p className="mt-2 text-xs text-muted-foreground">{insight}</p> : null}

          <div className="mt-3 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id={`g-${asset.symbol}-${range}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={asset.tint} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={asset.tint} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => formatTick(String(d), range)} minTickGap={40} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  width={72}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => (mode === "pct" ? `${Number(v).toFixed(0)}%` : Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 }))}
                />
                <Tooltip
                  cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "4 4" }}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(d) => formatTick(String(d), range)}
                  formatter={(v: number) => [fmt(v), asset.title]}
                />
                <Area type="monotone" dataKey="value" stroke={asset.tint} strokeWidth={2} fill={`url(#g-${asset.symbol}-${range})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-3 text-[10px] text-muted-foreground">Source: {source || "Yahoo Finance"} · cached locally for 24h</p>
        </>
      )}
    </div>
  );
}

function HistoryPage() {
  const params = Route.useParams();
  const asset = resolveHistoryAsset(decodeURIComponent(params.symbol));
  const { data } = useSuspenseQuery(historyQuery(asset.symbol, asset.alignMetal));
  const points = data.data;
  const latest = points[points.length - 1];
  const y1 = periodStats(points, 1);
  const y5 = periodStats(points, 5);
  const y10 = periodStats(points, 10);
  const years = yearlyAverages(points);
  const allTimeHigh = points.length ? points.reduce((a, b) => (b.close > a.close ? b : a)) : null;

  const fmtV = (v: number) => (asset.currency ? fmtCurrency(v, asset.currency, { maximumFractionDigits: 2 }) : fmtNumber(v, 2));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header showBackLink="dashboard" subtitle={`${asset.title} History`} />

      <main className="mx-auto max-w-5xl px-6 pb-16 py-10">
        <nav className="mb-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span>History</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">{asset.title}</span>
          <span className="mx-2">·</span>
          <span>Source: {data.source}</span>
        </nav>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{asset.title} Price History</h1>
        <p className="mt-3 max-w-3xl text-base text-muted-foreground">
          Interactive {asset.title.toLowerCase()} price history — zoom from 1 month to 10 years, switch between
          absolute price and % change, and see period performance and yearly highs/lows below.
        </p>

        {latest && allTimeHigh ? (
          <div className="mt-6 rounded-lg border border-border/60 bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Latest close</div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-3xl font-semibold tabular-nums">{fmtV(latest.close)}</span>
              <span className="text-sm text-muted-foreground">on {latest.date}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              All-time high in this dataset: {fmtV(allTimeHigh.close)} on {allTimeHigh.date}
            </div>
          </div>
        ) : null}

        <section className="mt-10">
          <InteractiveChart asset={asset} />
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Performance by period</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[{ label: "1 year", s: y1 }, { label: "5 years", s: y5 }, { label: "10 years", s: y10 }].map(({ label, s }) => (
              <div key={label} className="rounded-lg border border-border/60 bg-card p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
                {s ? (
                  <>
                    <div className={cn("mt-2 text-2xl font-semibold tabular-nums", s.pct >= 0 ? "text-emerald-600" : "text-red-600")}>
                      {fmtPct(s.pct)}
                    </div>
                    <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between"><dt>From</dt><dd className="tabular-nums text-foreground">{fmtV(s.start.close)} ({s.start.date})</dd></div>
                      <div className="flex justify-between"><dt>To</dt><dd className="tabular-nums text-foreground">{fmtV(s.end.close)} ({s.end.date})</dd></div>
                      <div className="flex justify-between"><dt>High</dt><dd className="tabular-nums text-foreground">{fmtV(s.high.close)}</dd></div>
                      <div className="flex justify-between"><dt>Low</dt><dd className="tabular-nums text-foreground">{fmtV(s.low.close)}</dd></div>
                      <div className="flex justify-between"><dt>CAGR</dt><dd className="tabular-nums text-foreground">{fmtPct(s.cagr)}</dd></div>
                    </dl>
                  </>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">Not enough data</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {years.length > 1 ? (
          <section className="mt-12">
            <h2 className="text-xl font-semibold">Yearly {asset.title.toLowerCase()} prices ({asset.unitLabel})</h2>
            <p className="mt-1 text-sm text-muted-foreground">Average, high, low, and year-end close for each year in the dataset.</p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Year</th>
                    <th className="px-4 py-2 text-right font-medium">Average</th>
                    <th className="px-4 py-2 text-right font-medium">High</th>
                    <th className="px-4 py-2 text-right font-medium">Low</th>
                    <th className="px-4 py-2 text-right font-medium">Year-end</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map((y) => (
                    <tr key={y.year} className="border-t border-border/40">
                      <td className="px-4 py-2 font-medium">{y.year}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtV(y.avg)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtV(y.high)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtV(y.low)}</td>
                      <td className="px-4 py-2 text-right tabular-nums">{fmtV(y.close)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="mt-12 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-xl font-semibold text-foreground">About {asset.title}</h2>
          {(asset.about ?? [
            `Historical price data for ${asset.title}, sourced from Yahoo Finance (${asset.symbol}). Use the chart above to explore performance across different time windows.`,
          ]).map((p, i) => <p key={i}>{p}</p>)}
          <p>
            For a live view converted to your local currency and country context, return to the{" "}
            <Link to="/" className="text-primary underline">MarketAtlas dashboard</Link>.
          </p>
        </section>
      </main>

      <Footer />
      <MobileNav currentPath={`/history/${asset.symbol}`} />
    </div>
  );
}
