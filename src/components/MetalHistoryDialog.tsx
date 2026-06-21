import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getMetalHistory } from "@/lib/market.functions";
import { GRAMS_PER_TROY_OUNCE } from "@/lib/market-config";
import { fmtCurrency } from "@/lib/format";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metalName: string;
  metalCode: "XAU" | "XAG" | "XPT";
  yahooSymbol: string;
  /** USD → display currency conversion factor. */
  fxToDisplay: number;
  displayCurrency: string;
  unit: "gram" | "ounce";
}

const TINT: Record<string, string> = {
  XAU: "#d97706", // amber-600
  XAG: "#64748b", // slate-500
  XPT: "#475569", // slate-600
};

export function MetalHistoryDialog({
  open,
  onOpenChange,
  metalName,
  metalCode,
  yahooSymbol,
  fxToDisplay,
  displayCurrency,
  unit,
}: Props) {
  const fetcher = useServerFn(getMetalHistory);

  const { data, isLoading, error } = useQuery({
    queryKey: ["metal-history", yahooSymbol],
    queryFn: () => fetcher({ data: { symbol: yahooSymbol } }),
    enabled: open,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const tint = TINT[metalCode] ?? "#1f2937";

  const series = (data?.data ?? []).map((p) => ({
    date: p.date,
    value:
      (unit === "gram" ? p.close / GRAMS_PER_TROY_OUNCE : p.close) * fxToDisplay,
  }));

  const first = series[0]?.value ?? 0;
  const last = series[series.length - 1]?.value ?? 0;
  const totalPct = first ? ((last - first) / first) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono">
            {metalName} — 5 Year Price History
          </DialogTitle>
          <DialogDescription>
            Monthly close, per {unit}, in {displayCurrency}. Spot price only —
            excludes local duties, GST, and dealer markups.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            Loading history…
          </div>
        ) : error ? (
          <div className="flex h-72 items-center justify-center text-sm text-destructive">
            Could not load price history.
          </div>
        ) : series.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No data.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Today
                </div>
                <div className="font-mono text-xl font-bold">
                  {fmtCurrency(last, displayCurrency, { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  5 years ago
                </div>
                <div className="font-mono text-sm">
                  {fmtCurrency(first, displayCurrency, { maximumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total return
                </div>
                <div
                  className="font-mono text-sm font-semibold"
                  style={{ color: totalPct >= 0 ? "var(--positive)" : "var(--negative)" }}
                >
                  {totalPct >= 0 ? "+" : ""}
                  {totalPct.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
                  <defs>
                    <linearGradient id={`g-${metalCode}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={tint} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={tint} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(d) => String(d).slice(0, 7)}
                    minTickGap={32}
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    width={64}
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
                    formatter={(v: number) => [
                      fmtCurrency(v, displayCurrency, { maximumFractionDigits: 2 }),
                      `Price / ${unit}`,
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={tint}
                    strokeWidth={2}
                    fill={`url(#g-${metalCode})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Source: Yahoo Finance ({yahooSymbol}) · monthly close
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
