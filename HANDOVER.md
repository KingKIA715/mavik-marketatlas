# MarketAtlas — Handover Notes

Summary of everything built/changed in this working session. Stack: TanStack
Start (React 19 + Vite), Tailwind, shadcn/ui, deployed via Lovable → Cloudflare
(Nitro). No auth, no database — all data is live-fetched and cached in-memory
server-side.

## ⚠️ Before anything else

1. **Set these env vars in your deployment platform** (not in source — never
   committed): `METALS_DEV_API_KEY`, `METALS_DEV_API_KEY_2`,
   `METALS_DEV_API_KEY_3`, `METALPRICE_API_KEY` (+ `_2`/`_3` if you have them).
   Without these, precious metals silently fall back to a lower-quality
   provider.
2. **None of this was tested in a live browser or build.** Every change was
   verified by static TypeScript checks and by re-implementing the core math
   in plain Node.js with realistic numbers — not by running the actual app.
   Treat this as reviewed-but-unrun code.

## What's new this session

### PWA
- Installable app: `manifest.webmanifest`, full icon set (`public/icons/`),
  `sw.js` service worker (caches static assets only — **never** caches live
  price data), `offline.html` fallback page.
- `PwaManager.tsx` — registers the service worker, shows an "update available
  → Refresh" toast, and an install prompt banner.
- **Gotcha:** because of this service worker, returning visitors may see a
  stale cached version after a deploy until the update toast fires (usually
  within a few minutes) or they hard-refresh. Incognito always gets the
  latest version — use that to sanity-check any deploy.

### Navigation
- `MobileNav.tsx` bottom tab bar (Home / Tools / News) — was built earlier by
  someone but never actually rendered; now wired into all three pages.
- `/history/gold` page **removed entirely** — gold history is now only
  available via the in-page "5y history" popup on the Gold row (Precious
  Metals section). All references (manifest shortcut, sitemap, `llms.txt`)
  updated accordingly.
- Auto-detects US vs India on first visit from browser timezone/locale
  instead of always defaulting to India. Respects `?country=` if present.
- Today's Snapshot strip, Country tiles, Asset filter tiles, and the Tools
  page tab row all auto-rotate (`use-auto-scroll.ts` — pauses on touch/swipe,
  respects `prefers-reduced-motion`). Note: Asset tiles are a fixed 5-column
  grid that doesn't actually overflow, so the hook is a harmless no-op there.

### Dashboard additions
- **Today's Snapshot** hero — one headline sentence + a chip strip, fixed
  category order: Gold → Silver → Markets → Crypto → Crude → FX (picks the
  biggest mover within Markets/Crypto/FX; Gold/Silver/Crude are single
  values).
- **News teaser** — 3 country-scoped headlines, "See all" → `/news`.
- **VIX** added to US indices; **Nifty IT / Nifty Auto** added to India's.

### New pages
- **`/news`** — country-scoped financial headlines. Sources: Economic Times
  Markets RSS (India), Yahoo Finance RSS (US), BBC Business RSS (GB/EU/AE/
  JP/CN — not country-specific, just the best verified fallback found).
  Custom lightweight RSS parser in `market-providers.server.ts` (no new npm
  dependency).

### New calculators (`/resources`)
Step-up SIP, FD/RD, PPF, GST/VAT, Fuel Cost, Mortgage (US), 401(k) (US),
Mutual Fund NAV Lookup (India, live search via `mfapi.in`). Plus the
standalone **Gold Duty Calculator** (import duty/GST/making-charges
breakdown, triggered from the Gold row).

## Known gaps / unverified

- **RSS feed URLs are unverified live** — confirmed via web search to be
  currently listed as active, but never actually fetched from this sandbox
  (no network access here). Test `/news` for every country after deploy.
- **`mfapi.in` mutual fund search/NAV** — same situation, unverified live.
- **GB/EU/AE/JP/CN news** all share one fallback (BBC Business) — no
  country-specific free feed was confirmed for these five.
- **Fuel Cost calculator numbers run low** vs real-world pump prices (e.g.
  India) — this traces back to the *existing* `FUEL_SPREAD` constants in
  `market-config.ts` (not something added this session), which likely
  understate tax/duty stacking. Worth recalibrating if fuel accuracy matters.
- **Asset Tiles auto-rotation is a no-op** (see above) — flag if you want it
  redesigned as an actual scrolling strip instead of a fixed grid.

## Suggested next steps (not built)

From earlier discussion, still open: pinned/favorite assets (localStorage,
no login needed), jump-to search across all instruments, price alerts via
Web Push (service worker groundwork already exists).

## File map (everything touched this session)

```
public/
  manifest.webmanifest, sw.js, offline.html, favicon.ico,
  apple-touch-icon.png, icons/*.png, llms.txt (edited)

src/components/
  PwaManager.tsx (new), MobileNav.tsx (edited), Layout.tsx (edited — added
  Header `subtitle` prop), GoldDutyCalculator.tsx (new)

src/lib/
  market-config.ts, market-providers.server.ts, market.functions.ts
  (all edited — new fields/endpoints, nothing removed)
  use-auto-scroll.ts (new)

src/routes/
  __root.tsx (edited — PWA meta tags, PwaManager mount)
  index.tsx (edited — Today's Snapshot, News teaser, auto-rotate, calculator
  hooks)
  resources.tsx (edited — 8 new calculator tabs)
  news.tsx (new)
  sitemap[.]xml.ts (edited)
  history.gold.tsx — deleted
```
