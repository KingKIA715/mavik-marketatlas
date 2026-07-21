import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getHistory } from "@/lib/market.functions";
import { useTranslation } from "@/lib/i18n";
import { historyKey, readHistory, writeHistory } from "@/lib/history-cache";
import { fmtCurrency } from "@/lib/format";
import { METALS, CRYPTOS } from "@/lib/market-config";
import type { Holding } from "@/lib/use-watchlist";
import { cn } from "@/lib/utils";

type Range = "3mo" | "6mo" | "1y" | "2y" | "5y";
const RANGE_LABEL: Record<Range, string> = { "3mo": "3M", "6mo": "6M", "1y": "1Y", "2y": "2Y", "5y": "5Y" };
const RANGE_ORDER: Range[] = ["3mo", "6mo", "1y", "2y", "5y"];

function holdingSource(assetKey: string): { symbol: string; alignMetal?: string } | null {
  const [category, code] = assetKey.split(":");
  if (category === "metals") {
    const m = METALS.find((x) => x.code === code);
    return m ? { symbol: m.yahoo, alignMetal: m.code } : null;
  }
  if (category === "crypto") {
    const c = CRYPTOS.find((x) => x.code === code);
    return c ? { symbol: c.yahoo } : null;
  }
  return null;
}

/**
 * Value-over-time for the holdings in the Portfolio card. Approximate by
 * design: metals/crypto history comes back in USD, and today's exchange
 * rate is applied flat across the whole period rather than fetching a full
 * historical FX series — that keeps this to one extra data fetch per
 * holding instead of building out historical-FX infrastructure for what's
 * a supplementary trend view, not a source of truth. The card says so.
 */
export function PortfolioHistoryChart({
  holdings,
  currency,
  fxToLocal,
}: {
  holdings: Holding[];
  currency: string;
  fxToLocal: (usd: number) => number;
}) {
  const fetcher = useServerFn(getHistory);
  const { t } = useTranslation();
  const [range, setRange] = useState<Range>("1y");
  const [series, setSeries] = useState<{ date: string; value: number }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  const sources = useMemo(
    () =>
      holdings
        .map((h) => ({ holding: h, src: holdingSource(h.assetKey) }))
        .filter((x): x is { holding: Holding; src: { symbol: string; alignMetal?: string } } => x.src !== null),
    [holdings],
  );

  useEffect(() => {
    if (sources.length === 0) {
      setSeries([]);
      return;
    }
    let cancelled = false;
    setError(null);
    setLoading(true);

    (async () => {
      try {
        const perHolding = await Promise.all(
          sources.map(async ({ holding, src }) => {
            const interval = range === "3mo" || range === "6mo" ? "1d" : range === "1y" || range === "2y" ? "1wk" : "1mo";
            const cacheKey = historyKey(src.alignMetal ? `${src.symbol}@${src.alignMetal}` : src.symbol, range, interval);
            const cached = await readHistory(cacheKey);
            if (cached) return { holding, points: cached.data };
            const res = await fetcher({
              data: { symbol: src.symbol, range, interval, ...(src.alignMetal ? { alignMetal: src.alignMetal } : {}) },
            });
            void writeHistory(cacheKey, res.data, res.source);
            return { holding, points: res.data };
          }),
        );
        if (cancelled) return;

        // Union of all dates, sorted, then forward-fill each holding's price so a
        // gap in one series (e.g. a crypto point BTC has that gold doesn't) doesn't
        // drop that date from the total.
        const allDates = [...new Set<string>(perHolding.flatMap((p) => p.points.map((pt) => pt.date)))].sort();
        const merged = allDates.map((date) => {
          let total = 0;
          for (const { holding, points } of perHolding) {
            const upToDate = points.filter((pt) => pt.date <= date);
            if (upToDate.length === 0) continue;
            const lastClose = upToDate[upToDate.length - 1].close;
            total += lastClose * holding.quantity;
          }
          return { date, value: fxToLocal(total) };
        });

        setSeries(merged);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, JSON.stringify(sources.map((s) => [s.holding.assetKey, s.holding.quantity, s.src.symbol])), retryTick]);

  if (sources.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-muted-foreground">{t("portfolio.valueOverTime")}</div>
        <div className="flex flex-wrap gap-1">
          {RANGE_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-semibold transition-colors",
                range === r ? "bg-[color:var(--brand)] text-white" : "text-muted-foreground hover:bg-surface-alt",
              )}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      {loading && !series ? (
        <div className="mt-3 h-40 w-full animate-pulse rounded-md bg-surface-alt" />
      ) : error ? (
        <div className="mt-3 flex h-40 flex-col items-center justify-center gap-2 text-xs text-destructive">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRetryTick((t) => t + 1)}
            className="rounded border border-border bg-background px-2 py-1 text-[11px] font-semibold hover:bg-surface-alt"
          >
            Retry
          </button>
        </div>
      ) : series && series.length > 1 ? (
        <div className="mt-2 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolio-value-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} minTickGap={50} />
              <YAxis tick={{ fontSize: 9 }} width={56} domain={["auto", "auto"]} tickFormatter={(v) => fmtCurrency(Number(v), currency, { maximumFractionDigits: 0, compact: true })} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11 }}
                formatter={(v: number) => [fmtCurrency(v, currency, { maximumFractionDigits: 0 }), "Value"]}
              />
              <Area type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={2} fill="url(#portfolio-value-gradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-3 flex h-40 items-center justify-center text-xs text-muted-foreground">Not enough data yet.</div>
      )}

      <p className="mt-2 text-[10px] text-muted-foreground">
        {t("portfolio.historyDisclaimer")}
      </p>
    </div>
  );
}
