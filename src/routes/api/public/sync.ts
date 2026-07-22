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

function tooManyRequests(retryAfterSec: number) {
  return new Response(JSON.stringify({ error: "too many failed attempts, try again later" }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": String(retryAfterSec) },
  });
}

/**
 * Constant-time string comparison — a secret should never be checked with
 * plain `===`/`!==`, since that short-circuits on the first mismatched
 * character and lets response-time differences leak how many leading
 * characters an attacker has guessed correctly. This always walks every
 * character of the longer string regardless of where the mismatch is.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Best-effort brute-force protection for failed auth attempts. Lives per
 * Worker isolate (same caveat as market-cache.server.ts's in-memory cache)
 * — it won't catch an attacker spread across many cold isolates, but it
 * does stop the common case of one client hammering the endpoint on a warm
 * instance, which is the actual realistic threat against a single shared
 * secret with no other rate limiting in front of it.
 */
const FAILED_ATTEMPT_WINDOW_MS = 5 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const failedAttempts = new Map<string, number[]>();

function isRateLimited(clientKey: string): number | null {
  const now = Date.now();
  const attempts = (failedAttempts.get(clientKey) ?? []).filter(
    (t) => now - t < FAILED_ATTEMPT_WINDOW_MS,
  );
  failedAttempts.set(clientKey, attempts);
  if (attempts.length >= MAX_FAILED_ATTEMPTS) {
    const retryAfterSec = Math.ceil((FAILED_ATTEMPT_WINDOW_MS - (now - attempts[0])) / 1000);
    return Math.max(1, retryAfterSec);
  }
  return null;
}

function recordFailedAttempt(clientKey: string) {
  const attempts = failedAttempts.get(clientKey) ?? [];
  attempts.push(Date.now());
  failedAttempts.set(clientKey, attempts);
}

async function runSync(request: Request) {
  const secret = process.env.SYNC_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ error: "SYNC_SECRET not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  // Best-effort client identity for rate limiting — trust the standard
  // proxy header Cloudflare sets; fall back to a shared bucket if absent
  // rather than skipping rate limiting entirely.
  const clientKey = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "unknown";
  const retryAfter = isRateLimited(clientKey);
  if (retryAfter !== null) return tooManyRequests(retryAfter);

  const url = new URL(request.url);
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const queryKey = url.searchParams.get("key") ?? "";
  const authorized = timingSafeEqual(bearer, secret) || timingSafeEqual(queryKey, secret);
  if (!authorized) {
    recordFailedAttempt(clientKey);
    console.warn(`[sync] unauthorized attempt from ${clientKey}`);
    return unauthorized();
  }

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
