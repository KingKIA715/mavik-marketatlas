import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { METALS, CRYPTOS, STOCKS } from "@/lib/market-config";
import { GOLD_RATE_CITIES } from "@/lib/india-cities";

const BASE_URL = "https://mavik-marketatlas.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const today = new Date().toISOString().slice(0, 10);
        const entries: SitemapEntry[] = [
          { path: "/", lastmod: today, changefreq: "hourly", priority: "1.0" },
          { path: "/resources", lastmod: today, changefreq: "weekly", priority: "0.7" },
          { path: "/news", lastmod: today, changefreq: "hourly", priority: "0.6" },
          { path: "/compare", lastmod: today, changefreq: "hourly", priority: "0.6" },
          // History pages — one per metal, crypto, and tracked stock index/ticker.
          // FX pairs are excluded: there are too many country×currency combinations
          // to be worth individual sitemap entries, and they're much lower search
          // intent than a named metal/crypto/stock.
          ...METALS.map((m) => ({
            path: `/history/${encodeURIComponent(m.yahoo)}`,
            lastmod: today,
            changefreq: "daily" as const,
            priority: "0.6",
          })),
          ...CRYPTOS.map((c) => ({
            path: `/history/${encodeURIComponent(c.yahoo)}`,
            lastmod: today,
            changefreq: "daily" as const,
            priority: "0.6",
          })),
          ...Object.keys(STOCKS).map((ticker) => ({
            path: `/history/${encodeURIComponent(ticker)}`,
            lastmod: today,
            changefreq: "daily" as const,
            priority: "0.5",
          })),
          // City-specific gold/silver rate pages — high search-intent
          // acquisition pages (see india-cities.ts for why they exist).
          ...GOLD_RATE_CITIES.map((c) => ({
            path: `/gold-rate/${c.slug}`,
            lastmod: today,
            changefreq: "daily" as const,
            priority: "0.65",
          })),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
