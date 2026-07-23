import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getMarketSnapshot, type MarketSnapshot } from "@/lib/market.functions";
import { COUNTRIES, COUNTRY_ORDER, METALS, CRYPTOS, type CountryCode } from "@/lib/market-config";
import { resolveAsset } from "@/lib/asset-resolver";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import { Header, Footer } from "@/components/Layout";
import { MobileNav } from "@/components/MobileNav";
import { cn } from "@/lib/utils";

const SITE = "https://mavik-marketatlas.lovable.app";

const snapshotQuery = (fetcher: () => Promise<MarketSnapshot>) =>
  queryOptions({
    queryKey: ["market-snapshot"],
    queryFn: fetcher,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

// Same domain as the Portfolio card's holdable assets (metals + crypto) —
// these are the only asset types resolveAsset can price uniformly across
// any country without extra per-country derivation (unlike fuel, which
// needs FUEL_SPREAD/crude data per country, or stock indices, which aren't
// the same instrument from one country to the next).
const COMPARE_ASSETS = [
  ...METALS.map((m) => ({ assetKey: `metals:${m.code}`, label: m.name, emoji: m.code === "XAU" ? "🪙" : m.code === "XAG" ? "🥈" : "⚪" })),
  ...CRYPTOS.map((c) => ({ assetKey: `crypto:${c.code}`, label: c.name, emoji: c.icon })),
];

export const Route = createFileRoute("/compare")({
  loader: async ({ context }) => context.queryClient.ensureQueryData(snapshotQuery(getMarketSnapshot)),
  head: () => {
    const title = "Compare Gold, Silver & Crypto Prices Across Countries | MarketAtlas";
    const description =
      "See gold, silver, platinum, and crypto prices side by side across India, the US, UK, EU, UAE, Japan, and China — each converted to its own local currency.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `${SITE}/compare` },
      ],
      links: [{ rel: "canonical", href: `${SITE}/compare` }],
    };
  },
  component: ComparePage,
});

function ComparePage() {
  const fetcher = useServerFn(getMarketSnapshot);
  const { data } = useSuspenseQuery(snapshotQuery(fetcher));
  const [assetKey, setAssetKey] = useState(COMPARE_ASSETS[0].assetKey);

  const rows = COUNTRY_ORDER.map((country) => {
    const def = COUNTRIES[country];
    const fx = data.rates.rates[def.currency] ?? 1;
    const toLocal = (usd: number) => usd * fx;
    const resolved = resolveAsset(assetKey, data, country, { toLocal, includeGST: false });
    return { country, def, resolved };
  }).filter((r) => r.resolved !== null) as { country: CountryCode; def: (typeof COUNTRIES)[CountryCode]; resolved: NonNullable<ReturnType<typeof resolveAsset>> }[];

  const activeMeta = COMPARE_ASSETS.find((a) => a.assetKey === assetKey)!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header showBackLink="dashboard" />

      <main className="mx-auto max-w-4xl px-4 pb-16 py-6 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Compare Across Countries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The same asset, converted to each country's own currency at today's exchange rate — useful for
          checking what a price back home is worth wherever you are.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {COMPARE_ASSETS.map((a) => {
            const active = a.assetKey === assetKey;
            return (
              <button
                key={a.assetKey}
                type="button"
                onClick={() => setAssetKey(a.assetKey)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                  active
                    ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white shadow-sm"
                    : "border-border bg-background text-muted-foreground hover:bg-surface-alt hover:text-foreground",
                )}
              >
                <span aria-hidden>{a.emoji}</span>
                {a.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Country</th>
                <th className="px-4 py-2.5 text-right font-medium">{activeMeta.label} price</th>
                <th className="px-4 py-2.5 text-right font-medium">24h change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ country, def, resolved }) => {
                const up = resolved.changePercent >= 0;
                return (
                  <tr key={country} className="border-t border-border/60">
                    <td className="px-4 py-3">
                      <span className="me-2" aria-hidden>{def.flag}</span>
                      {def.name}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                      {fmtCurrency(resolved.price, resolved.currency, { maximumFractionDigits: 2 })}
                    </td>
                    <td
                      className="px-4 py-3 text-right font-mono tabular-nums"
                      style={{ color: up ? "var(--positive)" : "var(--negative)" }}
                    >
                      {up ? "▲" : "▼"} {fmtNumber(Math.abs(resolved.changePercent), 1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Converted from one global spot price using today's exchange rates — this reflects currency
          differences, not local import duty or tax differences (except where a country-specific
          calculator, like the <Link to="/resources" className="text-[color:var(--brand)] hover:underline">Gold Duty Calculator</Link>,
          models those separately).
        </p>
      </main>

      <Footer />
      <MobileNav currentPath="/compare" />
    </div>
  );
}
