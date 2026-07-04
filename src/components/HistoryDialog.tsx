import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getHistory } from "@/lib/market.functions";
import { historyKey, readHistory, writeHistory, type HistoryPoint } from "@/lib/history-cache";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type Range = "1mo" | "3mo" | "6mo" | "1y" | "2y" | "5y";
const RANGE_LABEL: Record<Range, string> = {
  "1mo": "1M",
  "3mo": "3M",
  "6mo": "6M",
  "1y": "1Y",
  "2y": "2Y",
  "5y": "5Y",
};
const RANGE_INTERVAL: Record<Range, "1d" | "1wk" | "1mo"> = {
  "1mo": "1d",
  "3mo": "1d",
  "6mo": "1d",
  "1y": "1wk",
  "2y": "1wk",
  "5y": "1mo",
};
const RANGE_ORDER: Range[] = ["1mo", "3mo", "6mo", "1y", "2y", "5y"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Display title (e.g. "Gold", "Nifty 50", "USD / INR"). */
  title: string;
  /** Yahoo symbol — futures (GC=F), index (^NSEI), stock, FX pair (EURINR=X). */
  symbol: string;
  /** Currency for tooltip/Y-axis formatting; pass empty string to use plain numbers. */
  currency?: string;
  /** Multiplier applied to raw close (USD/oz → local/g, FX inversion, etc). */
  scale?: number;
  /** Optional unit label shown in tooltip (e.g. "per g"). */
  unitLabel?: string;
  tint?: string;
  /**
   * When set, the server rescales the Yahoo futures series so the last close
   * equals the current Metals.dev spot price. Keeps series shape but syncs
   * the visible price to the live dashboard value. Only "XAU", "XAG", "XPT".
   */
  alignMetal?: "XAU" | "XAG" | "XPT";
}

export function HistoryDialog({
  open,
  onOpenChange,
  title,
  symbol,
  currency,
  scale = 1,
  unitLabel,
  tint = "#1f2937",
  alignMetal,
}: Props) {
  const fetcher = useServerFn(getHistory);
  const [range, setRange] = useState<Range>("5y");
  const [data, setData] = useState<HistoryPoint[] | null>(null);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const interval = RANGE_INTERVAL[range];
    // Cache key namespaces aligned series separately from raw Yahoo series.
    const cacheKey = historyKey(
      alignMetal ? `${symbol}@${alignMetal}` : symbol,
      range,
      interval,
    );
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
          data: { symbol, range, interval, ...(alignMetal ? { alignMetal } : {}) },
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

    return () => {
      cancelled = true;
    };
  }, [open, range, symbol, alignMetal, fetcher]);


  const series = useMemo(
    () => (data ?? []).map((p) => ({ date: p.date, value: p.close * scale })),
    [data, scale],
  );

  const first = series[0]?.value ?? 0;
  const last = series[series.length - 1]?.value ?? 0;
  const totalPct = first ? ((last - first) / first) * 100 : 0;

  const fmt = (v: number) =>
    currency
      ? fmtCurrency(v, currency, { maximumFractionDigits: 2 })
      : fmtNumber(v, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-mono">{title} — Price History</DialogTitle>
          <DialogDescription>
            {symbol}
            {unitLabel ? ` · ${unitLabel}` : ""}
            {currency ? ` · ${currency}` : ""}
          </DialogDescription>
        </DialogHeader>

        {/* Date range picker */}
        <div className="flex flex-wrap gap-1.5">
          {RANGE_ORDER.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                range === r
                  ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white"
                  : "border-border bg-background text-foreground hover:bg-surface-alt",
              )}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>

        {loading && series.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            Loading history…
          </div>
        ) : error ? (
          <div className="flex h-72 items-center justify-center text-sm text-destructive">
            {error}
          </div>
        ) : series.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No data.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Latest</div>
                <div className="font-mono text-xl font-bold">{fmt(last)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Start of {RANGE_LABEL[range]}
                </div>
                <div className="font-mono text-sm">{fmt(first)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Return</div>
                <div
                  className="font-mono text-sm font-semibold"
                  style={{ color: totalPct >= 0 ? "var(--positive)" : "var(--negative)" }}
                >
                  {totalPct >= 0 ? "+" : ""}
                  {totalPct.toFixed(1)}%
                </div>
              </div>
              {loading ? (
                <span className="text-[10px] text-muted-foreground">refreshing…</span>
              ) : null}
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id={`g-${symbol}-${range}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={tint} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={tint} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d) => String(d).slice(0, range === "1mo" || range === "3mo" ? 10 : 7)}
                    minTickGap={32}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    width={72}
                    domain={["auto", "auto"]}
                    tickFormatter={(v) =>
                      Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [fmt(v), unitLabel ?? "Value"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={tint}
                    strokeWidth={2}
                    fill={`url(#g-${symbol}-${range})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Source: {source || "Yahoo Finance"} · cached locally for 24h
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
