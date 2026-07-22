// Per-asset Open Graph image — replaces the one generic site-wide og:image
// with something that actually shows which asset a shared history link is
// about (title + brand color), instead of every /history/$symbol link
// unfurling identically on social media.
//
// Rendered as SVG, not PNG. Worth knowing: some social platforms (notably
// Twitter/X and, historically, Facebook/LinkedIn) don't reliably render
// SVG og:image previews — many require a raster format. A true PNG
// pipeline would need an image-rendering dependency (e.g. @vercel/og /
// Satori + resvg) added to package.json, which isn't something to add
// blind in this environment: no network access here to install and
// actually verify it builds and renders correctly on Cloudflare. SVG is
// the honest "this definitely works, some platforms may not show it"
// choice over a PNG pipeline that "should work" but is unverified.

import { createFileRoute } from "@tanstack/react-router";
import { resolveHistoryAsset } from "@/lib/history-assets";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderOgSvg(assetTitle: string, tint: string): string {
  const title = escapeXml(`${assetTitle} Price History`);
  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0f172a" />
  <rect x="0" y="0" width="18" height="630" fill="${tint}" />
  <text x="80" y="150" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="${tint}">MarketAtlas</text>
  <text x="80" y="290" font-family="Arial, sans-serif" font-size="66" font-weight="700" fill="#ffffff">${title}</text>
  <text x="80" y="345" font-family="Arial, sans-serif" font-size="30" fill="#94a3b8">Interactive chart · period performance · yearly highs &amp; lows</text>
  <text x="80" y="560" font-family="Arial, sans-serif" font-size="24" fill="#64748b">Global financial hub for common people</text>
</svg>`;
}

export const Route = createFileRoute("/api/og/$symbol")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const asset = resolveHistoryAsset(decodeURIComponent(params.symbol));
        const svg = renderOgSvg(asset.title, asset.tint);
        return new Response(svg, {
          headers: {
            "content-type": "image/svg+xml",
            "cache-control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
