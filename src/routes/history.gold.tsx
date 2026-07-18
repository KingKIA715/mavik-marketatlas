import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { getHistory } from "@/lib/market.functions";
import { fmtNumber, fmtPct } from "@/lib/format";
import type { HistoryPoint } from "@/lib/market-providers.server";
import { Header, Footer } from "@/components/Layout";
import { MobileNav } from "@/components/MobileNav";
const SITE = "https://mavik-marketatlas.lovable.app";

const goldHistoryQuery = queryOptions({
  queryKey: ["history", "GC=F", "10y", "1mo", "align:XAU"],
  queryFn: () =>
    getHistory({
      data: { symbol: "GC=F", range: "10y", interval: "1mo", alignMetal: "XAU" },
    }),
  staleTime: 60 * 60 * 1000,
});


export const Route = createFileRoute("/history/gold")({
  loader: ({ context }) => context.queryClient.ensureQueryData(goldHistoryQuery),
  head: () => ({
    meta: [
      { title: "Gold Price History — 1, 5 & 10 Year Trends | MarketAtlas" },
      {
        name: "description",
        content:
          "Historical gold price trends over 1, 5, and 10 years in USD per troy ounce. Yearly averages, all-time highs, and long-term analysis of gold's performance.",
      },
      { property: "og:title", content: "Gold Price History — 1, 5 & 10 Year Trends" },
      {
        property: "og:description",
        content:
          "Long-term gold price history with annual averages, peaks, and multi-year performance data.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `${SITE}/history/gold` },
    ],
    links: [{ rel: "canonical", href: `${SITE}/history/gold` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Gold Price History — 1, 5 & 10 Year Trends",
          description:
            "Historical gold price trends over 1, 5, and 10 years in USD per troy ounce.",
          about: "Gold price history",
          url: `${SITE}/history/gold`,
        }),
      },
    ],
  }),
  component: GoldHistoryPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">Couldn't load gold price history</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Link to="/" className="mt-6 inline-block text-primary underline">
        Back to dashboard
      </Link>
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
    .map(([year, xs]) => {
      const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
      const high = Math.max(...xs);
      const low = Math.min(...xs);
      return { year, avg, high, low, close: xs[xs.length - 1] };
    })
    .sort((a, b) => b.year - a.year);
}

function GoldHistoryPage() {
  const { data } = useSuspenseQuery(goldHistoryQuery);
  const points = data.data;
  const latest = points[points.length - 1];
  const y1 = periodStats(points, 1);
  const y5 = periodStats(points, 5);
  const y10 = periodStats(points, 10);
  const years = yearlyAverages(points);
  const allTimeHigh = points.reduce((a, b) => (b.close > a.close ? b : a));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header showBackLink="dashboard" subtitle="Gold Price History" />

      <main className="mx-auto max-w-5xl px-6 pb-16 py-10">
        <nav className="mb-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span>History</span>
          <span className="mx-2">/</span>
          <span className="text-foreground">Gold</span>
          <span className="mx-2">·</span>
          <span>Source: {data.source}</span>
        </nav>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Gold Price History
        </h1>
        <p className="mt-3 max-w-3xl text-base text-muted-foreground">
          Long-term gold price data in US dollars per troy ounce, sourced from COMEX gold
          futures (GC=F). Compare 1, 5, and 10-year performance, review annual highs and
          lows, and see how gold has evolved as a store of value over the last decade.
        </p>

        {latest && (
          <div className="mt-6 rounded-lg border border-border/60 bg-card p-5">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Latest close
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-3xl font-semibold tabular-nums">
                ${fmtNumber(latest.close, 2)}
              </span>
              <span className="text-sm text-muted-foreground">per oz on {latest.date}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              All-time high in dataset: ${fmtNumber(allTimeHigh.close, 2)} on {allTimeHigh.date}
            </div>
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-xl font-semibold">Performance by period</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { label: "1 year", s: y1 },
              { label: "5 years", s: y5 },
              { label: "10 years", s: y10 },
            ].map(({ label, s }) => (
              <div key={label} className="rounded-lg border border-border/60 bg-card p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                {s ? (
                  <>
                    <div
                      className={`mt-2 text-2xl font-semibold tabular-nums ${
                        s.pct >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {fmtPct(s.pct)}
                    </div>
                    <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <dt>From</dt>
                        <dd className="tabular-nums text-foreground">
                          ${fmtNumber(s.start.close, 2)} ({s.start.date})
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>To</dt>
                        <dd className="tabular-nums text-foreground">
                          ${fmtNumber(s.end.close, 2)} ({s.end.date})
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>High</dt>
                        <dd className="tabular-nums text-foreground">
                          ${fmtNumber(s.high.close, 2)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>Low</dt>
                        <dd className="tabular-nums text-foreground">
                          ${fmtNumber(s.low.close, 2)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>CAGR</dt>
                        <dd className="tabular-nums text-foreground">{fmtPct(s.cagr)}</dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <div className="mt-2 text-sm text-muted-foreground">Not enough data</div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">Yearly gold prices (USD / oz)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Average, high, low, and year-end close for each year in the dataset.
          </p>
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
                    <td className="px-4 py-2 text-right tabular-nums">${fmtNumber(y.avg, 2)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">${fmtNumber(y.high, 2)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">${fmtNumber(y.low, 2)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">${fmtNumber(y.close, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-xl font-semibold text-foreground">About gold price history</h2>
          <p>
            Gold has served as a monetary asset for thousands of years and remains a
            benchmark store of value in modern portfolios. Long-run price history reflects
            the interplay of real interest rates, the US dollar, central bank purchases,
            jewellery and industrial demand, and safe-haven flows during geopolitical or
            financial stress.
          </p>
          <p>
            The past decade in particular saw gold break several records. After trading
            near $1,050 in late 2015, prices climbed through the 2019–2020 rate-cut cycle
            and the pandemic, first breaching $2,000/oz in August 2020. A second, more
            durable move above $2,000 followed in 2023–2024 as central banks — led by
            China, Turkey, India and Poland — accelerated reserve diversification.
          </p>
          <p>
            For a live view including local currency, karat breakdowns, and other metals,
            return to the{" "}
            <Link to="/" className="text-primary underline">MarketAtlas dashboard</Link>.
          </p>
        </section>
      </main>

      <Footer />
      <MobileNav currentPath="/history/gold" />
    </div>
  );
}
