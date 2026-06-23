// Public cron endpoint — warms the server-side market snapshot cache.
// Call once per day at 00:00 UTC from an external scheduler.
//
// Auth: Bearer <SYNC_SECRET> OR ?key=<SYNC_SECRET>.
// Stable URL: project--{project-id}.lovable.app/api/public/sync
//
// External schedulers that can hit this: cron-job.org, EasyCron, GitHub
// Actions cron, Uptime Robot keyword monitors, Cloudflare Cron Triggers.

import { createFileRoute } from "@tanstack/react-router";
import { getMarketSnapshot } from "@/lib/market.functions";

function unauthorized() {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}

async function runSync(request: Request) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "SYNC_SECRET not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const queryKey = url.searchParams.get("key") ?? "";
  if (bearer !== secret && queryKey !== secret) return unauthorized();

  const startedAt = Date.now();
  try {
    const snap = await getMarketSnapshot();
    return Response.json({
      ok: true,
      durationMs: Date.now() - startedAt,
      fetchedAt: snap.fetchedAt,
      counts: {
        rates: Object.keys(snap.rates.rates).length,
        quotes: snap.quotes.length,
        baskets: Object.fromEntries(
          Object.entries(snap.baskets).map(([k, v]) => [k, v.length]),
        ),
      },
      sources: {
        rates: snap.ratesSource,
        metals: snap.metalsSource,
        quotes: snap.quotesSource,
        crude: snap.crudeSource,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 502, headers: { "content-type": "application/json" } },
    );
  }
}

export const Route = createFileRoute("/api/public/sync")({
  server: {
    handlers: {
      GET: async ({ request }) => runSync(request),
      POST: async ({ request }) => runSync(request),
    },
  },
});
