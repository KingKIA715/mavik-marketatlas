# MarketAtlas

**Global Financial Hub for Common People** — live precious metals, crypto, stock
indices, fuel prices, currency exchange, and financial news across India, USA,
UK, EU, UAE, Japan, and China. No login required.

Built with [Lovable](https://lovable.dev), deployed to Cloudflare.

## Features

- **Live dashboard** — gold/silver/platinum (with import duty + GST breakdown for
  India), BTC/ETH/SOL, stock indices (incl. VIX, Nifty IT/Auto sectoral), fuel
  prices, currency exchange rates — all switchable by country.
- **Today's Snapshot** — auto-generated daily headline + top-movers strip.
- **Pinned favorites** — star any instrument, no account needed (stored locally).
- **Price alerts** — local browser notifications when a threshold crosses (see
  [Limitations](#limitations)).
- **Search** — jump to any instrument instantly.
- **Financial news** — country-scoped headlines.
- **14 calculators** — SIP, Step-up SIP, Lumpsum, FD/RD, PPF, EMI, Mortgage (US),
  401(k) (US), Gold/Silver investment, Inflation, GST/VAT, Fuel Cost, Mutual Fund
  NAV Lookup (India), Currency Converter, plus a dedicated Gold Duty Calculator.
- **Installable PWA** — offline-capable app shell, install prompt, update
  notifications.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19, file-based routing,
  server functions) on [Vite](https://vitejs.dev)
- [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- [TanStack Query](https://tanstack.com/query) for client-side data fetching
- Deployed via [Nitro](https://nitro.build) to Cloudflare

No database. No auth. Personalization (pinned favorites, alerts) is entirely
client-side (`localStorage`).

## Getting started

```bash
bun install     # or npm install
bun dev         # or npm run dev
```

App runs at `http://localhost:3000` (or whatever port Vite assigns).

```bash
bun run build   # production build
bun run preview # preview the production build locally
bun run lint    # eslint
bun test        # vitest — currently only covers src/lib/calculators.ts
```

## Environment variables

Set these in your deployment platform's secret manager — **never commit them**:

| Variable | Required for |
|---|---|
| `METALS_DEV_API_KEY`, `_2`, `_3` | Precious metals live pricing (primary provider, 3-way key rotation by day of month) |
| `METALPRICE_API_KEY`, `_2`, `_3` | Precious metals fallback provider |
| `SYNC_SECRET` | Authenticates `/api/public/sync`, the cron endpoint used to warm the server-side cache daily |

Without the metals keys, gold/silver/platinum prices silently fall back to a
lower-quality free provider. Without `SYNC_SECRET`, the sync endpoint returns
HTTP 500.

## Data sources

| Data | Provider(s) |
|---|---|
| Precious metals | Metals.dev → MetalpriceAPI → gold-api.com |
| Currency exchange | Frankfurter → ExchangeRate-API |
| Crypto, stock indices, crude, price history | Yahoo Finance |
| News | Economic Times Markets RSS (India) · Yahoo Finance RSS (US) · BBC Business RSS (UK/EU/UAE/Japan/China) |
| Mutual fund NAVs | mfapi.in (AMFI data, India only) |

All fetches are cached server-side in-memory (`src/lib/market-cache.server.ts`) —
1 hour TTL for metals/rates, 15 minutes for everything else. The manual refresh
button is throttled to one real upstream refresh per hour regardless of how often
it's clicked.

## Project structure

```
src/
  routes/
    index.tsx              # dashboard
    resources.tsx           # calculators
    news.tsx                # country-scoped news
    api/public/sync.ts      # cron-authenticated cache warmer
    __root.tsx               # app shell (head tags, PWA mount)
  components/
    Layout.tsx              # Header / Footer / MobileNav-adjacent shared chrome
    MobileNav.tsx            # bottom tab bar (mobile)
    MarqueeRow.tsx            # circular auto-rotating row (CSS transform based)
    GoldDutyCalculator.tsx     # import duty / GST calculator dialog
    PwaManager.tsx              # service worker registration, update/install UI
  lib/
    market-config.ts           # countries, metals, stocks, currencies — static config
    market-providers.server.ts  # all upstream API fetch adapters
    market.functions.ts          # TanStack Start server functions (client-callable)
    market-cache.server.ts        # in-memory cache + sync throttle
    asset-resolver.ts              # resolves a pin/alert/search key -> live price
    use-watchlist.ts                 # pinned favorites + price alerts (localStorage)
    use-auto-scroll.ts                # scroll-and-snap-back auto-rotate hook
    calculators.ts                     # pure calc functions (SIP/Lumpsum/EMI/Inflation) — unit tested
public/
  manifest.webmanifest, sw.js, offline.html, icons/
```

## Limitations

- **Price alerts are local notifications, not push.** There's no server-side
  persistence or push infrastructure — alerts only fire while the app has been
  opened recently enough to refresh. They will not notify you if the browser has
  been fully closed for an extended period.
- **News for UK/EU/UAE/Japan/China** all share one non-country-specific fallback
  feed (BBC Business) — only India and the US have dedicated regional sources.
- **Fuel Cost calculator** numbers run below real-world pump prices in some
  markets (India especially); the underlying tax/duty modeling needs
  recalibration.

See `HANDOFF.md` for the full engineering handoff, open items, and notes on
building further on this codebase.
