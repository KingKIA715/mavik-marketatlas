import { useState } from "react";
import { Briefcase, Plus, X } from "lucide-react";
import type { MarketSnapshot } from "@/lib/market.functions";
import { resolveAsset } from "@/lib/asset-resolver";
import { METALS, CRYPTOS, type CountryCode, COUNTRIES } from "@/lib/market-config";
import { usePortfolio } from "@/lib/use-watchlist";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const HOLDABLE_ASSETS = [
  ...METALS.map((m) => ({ assetKey: `metals:${m.code}`, label: m.name, emoji: m.code === "XAU" ? "🪙" : m.code === "XAG" ? "🥈" : "⚪", unit: "g" })),
  ...CRYPTOS.map((c) => ({ assetKey: `crypto:${c.code}`, label: c.name, emoji: c.icon, unit: c.code })),
];

/**
 * "What I hold" — a lightweight portfolio value card. Entirely
 * localStorage-based (see use-watchlist.ts's usePortfolio), no accounts, no
 * server-side persistence — consistent with every other personalized
 * feature in this app (pinned favorites, alerts). Scoped to metals + crypto,
 * the two asset types a person actually holds a quantity of in this app.
 */
export function PortfolioCard({
  data,
  country,
  toLocal,
  includeGST,
}: {
  data: MarketSnapshot;
  country: CountryCode;
  toLocal: (usd: number) => number;
  includeGST: boolean;
}) {
  const { holdings, add, updateQuantity, remove } = usePortfolio();
  const def = COUNTRIES[country];
  const [adding, setAdding] = useState(false);
  const [newAsset, setNewAsset] = useState(HOLDABLE_ASSETS[0].assetKey);
  const [newQty, setNewQty] = useState("");

  const rows = holdings
    .map((h) => {
      const resolved = resolveAsset(h.assetKey, data, country, { toLocal, includeGST });
      const meta = HOLDABLE_ASSETS.find((a) => a.assetKey === h.assetKey);
      if (!resolved || !meta || resolved.price == null) return null;
      return { holding: h, resolved, meta, value: resolved.price * h.quantity };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  const total = rows.reduce((sum, r) => sum + r.value, 0);

  if (holdings.length === 0 && !adding) {
    return (
      <section>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/50 px-4 py-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground"
        >
          <Briefcase className="h-4 w-4" />
          Track what you hold — add gold, silver, or crypto
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your Holdings</h2>
        </div>
        {rows.length > 0 ? (
          <div className="text-right">
            <div className="text-lg font-bold font-mono tabular-nums">
              {fmtCurrency(total, def.currency, { maximumFractionDigits: 0 })}
            </div>
          </div>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <div className="mt-3 space-y-2">
          {rows.map(({ holding, resolved, meta, value }) => (
            <div key={holding.id} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
              <span className="text-lg" aria-hidden>{meta.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{resolved.label}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={holding.quantity}
                    aria-label={`Quantity of ${resolved.label} held, in ${meta.unit}`}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= 0) updateQuantity(holding.id, v);
                    }}
                    className="w-20 rounded border border-border bg-transparent px-1.5 py-0.5 font-mono text-xs tabular-nums"
                  />
                  <span>{meta.unit}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-semibold tabular-nums">
                  {fmtCurrency(value, def.currency, { maximumFractionDigits: 0 })}
                </div>
                <div
                  className="text-xs font-mono tabular-nums"
                  style={{ color: resolved.changePercent >= 0 ? "var(--positive)" : "var(--negative)" }}
                >
                  {resolved.changePercent >= 0 ? "▲" : "▼"} {fmtNumber(Math.abs(resolved.changePercent), 1)}%
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(holding.id)}
                aria-label={`Remove ${resolved.label} from holdings`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-alt hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {adding ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-background p-3">
          <div className="space-y-1">
            <label htmlFor="portfolio-add-asset" className="text-xs font-medium text-muted-foreground">Asset</label>
            <select
              id="portfolio-add-asset"
              value={newAsset}
              onChange={(e) => setNewAsset(e.target.value)}
              className="block rounded border border-border bg-transparent px-2 py-1.5 text-sm"
            >
              {HOLDABLE_ASSETS.map((a) => (
                <option key={a.assetKey} value={a.assetKey}>{a.emoji} {a.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="portfolio-add-qty" className="text-xs font-medium text-muted-foreground">
              Quantity ({HOLDABLE_ASSETS.find((a) => a.assetKey === newAsset)?.unit})
            </label>
            <input
              id="portfolio-add-qty"
              type="number"
              min={0}
              step="any"
              value={newQty}
              onChange={(e) => setNewQty(e.target.value)}
              placeholder="0"
              className="block w-28 rounded border border-border bg-transparent px-2 py-1.5 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const q = Number(newQty);
              if (Number.isFinite(q) && q > 0) {
                add(newAsset, q);
                setNewQty("");
                setAdding(false);
              }
            }}
            className={cn(
              "flex items-center gap-1 rounded-lg bg-[color:var(--brand)] px-3 py-1.5 text-sm font-semibold text-white transition-opacity",
              !Number(newQty) && "opacity-50",
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setNewQty("");
            }}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-surface-alt"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 flex items-center gap-1.5 text-sm font-medium text-[color:var(--brand)] hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          Add holding
        </button>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Saved on this device only — no account, nothing sent anywhere. Change % is today's market move, not your gain/loss since purchase.
      </p>
    </section>
  );
}
