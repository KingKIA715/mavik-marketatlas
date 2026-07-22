// Live "today's snapshot" share image — one per country, rendered from the
// same cached MarketSnapshot the dashboard itself reads (so this stays
// cheap: it hits market-cache.server.ts's TTL cache rather than re-fetching
// upstream providers on every share). Used by the dashboard's "Share
// snapshot" button, and could also back a per-country og:image later.
//
// Same SVG-not-PNG tradeoff as the history page's OG image (see
// src/routes/api/og/$symbol.ts for why) — this is a real, working image,
// just not guaranteed to unfurl on every social platform's auto-preview
// crawler. Sharing it as an actual file via the Web Share API (what the
// dashboard button does) sidesteps that entirely, since it's the device's
// own image viewer rendering it, not a third-party crawler.

import { createFileRoute } from "@tanstack/react-router";
import { getMarketSnapshot } from "@/lib/market.functions";
import { COUNTRIES, GRAMS_PER_TROY_OUNCE, STOCK_NAMES, type CountryCode } from "@/lib/market-config";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmt(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

function renderSnapshotSvg(rows: { label: string; value: string; changePercent: number }[], def: (typeof COUNTRIES)[CountryCode], dateStr: string): string {
  const rowY = (i: number) => 260 + i * 68;
  const rowsSvg = rows
    .map((r, i) => {
      const y = rowY(i);
      const up = r.changePercent >= 0;
      const color = up ? "#22c55e" : "#ef4444";
      const arrow = up ? "▲" : "▼";
      return `
  <text x="80" y="${y}" font-family="Arial, sans-serif" font-size="30" fill="#e2e8f0">${escapeXml(r.label)}</text>
  <text x="750" y="${y}" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#ffffff" text-anchor="end">${escapeXml(r.value)}</text>
  <text x="1120" y="${y}" font-family="Arial, sans-serif" font-size="26" font-weight="600" fill="${color}" text-anchor="end">${arrow} ${fmt(Math.abs(r.changePercent), 1)}%</text>`;
    })
    .join("");

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0f172a" />
  <rect x="0" y="0" width="18" height="630" fill="#d97706" />
  <text x="80" y="90" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#d97706">MarketAtlas</text>
  <text x="80" y="170" font-family="Arial, sans-serif" font-size="52" font-weight="700" fill="#ffffff">${escapeXml(def.flag)} Today's Snapshot — ${escapeXml(def.name)}</text>
  <text x="80" y="210" font-family="Arial, sans-serif" font-size="24" fill="#64748b">${escapeXml(dateStr)}</text>
  <line x1="80" y1="230" x2="1120" y2="230" stroke="#1e293b" stroke-width="2" />
  ${rowsSvg}
  <text x="80" y="600" font-family="Arial, sans-serif" font-size="22" fill="#475569">Global financial hub for common people · Not investment advice</text>
</svg>`;
}

export const Route = createFileRoute("/api/snapshot/$country")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const country = (params.country?.toUpperCase() ?? "IN") as CountryCode;
        const def = COUNTRIES[country] ?? COUNTRIES.IN;

        const snap = await getMarketSnapshot();
        const fx = snap.rates.rates[def.currency] ?? 1;
        const toLocal = (usd: number) => usd * fx;

        const goldPerGram = toLocal(snap.metals.XAU / GRAMS_PER_TROY_OUNCE);
        const silverPerGram = toLocal(snap.metals.XAG / GRAMS_PER_TROY_OUNCE);
        const btc = toLocal(snap.crypto.BTC);
        const topIndexTicker = def.stockIndices[0];
        const topIndex = snap.quotes.find((q) => q.ticker === topIndexTicker);
        const topIndexName = topIndexTicker ? STOCK_NAMES[topIndexTicker] ?? topIndexTicker : null;

        const rows: { label: string; value: string; changePercent: number }[] = [
          { label: "Gold (1g)", value: `${def.currency} ${fmt(goldPerGram, 0)}`, changePercent: snap.metalsChange.XAU?.changePercent ?? 0 },
          { label: "Silver (1g)", value: `${def.currency} ${fmt(silverPerGram, 2)}`, changePercent: snap.metalsChange.XAG?.changePercent ?? 0 },
          { label: "Bitcoin", value: `${def.currency} ${fmt(btc, 0)}`, changePercent: snap.cryptoChange.BTC?.changePercent ?? 0 },
        ];
        if (topIndex && topIndexName) {
          rows.push({ label: topIndexName, value: fmt(topIndex.price, 2), changePercent: topIndex.changePercent });
        }

        const dateStr = new Date(snap.fetchedAt).toLocaleDateString(undefined, {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const svg = renderSnapshotSvg(rows, def, dateStr);
        return new Response(svg, {
          headers: {
            "content-type": "image/svg+xml",
            // Short cache — this reflects live prices, unlike the static per-asset OG image.
            "cache-control": "public, max-age=900",
          },
        });
      },
    },
  },
});
