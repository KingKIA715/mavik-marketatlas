import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getNews } from "@/lib/market.functions";
import { COUNTRIES, COUNTRY_ORDER, type CountryCode } from "@/lib/market-config";
import { useSelectedCountry } from "@/lib/use-selected-country";
import { Header, Footer } from "@/components/Layout";
import { MobileNav } from "@/components/MobileNav";
import { Newspaper, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Financial News — MarketAtlas" },
      {
        name: "description",
        content:
          "Latest financial and markets headlines for India, USA, UK, EU, Japan, China and UAE.",
      },
    ],
  }),
  component: NewsPage,
});

function timeAgo(pubDate: string): string {
  const t = new Date(pubDate).getTime();
  if (!Number.isFinite(t)) return "";
  const diffMin = Math.round((Date.now() - t) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.round(diffH / 24);
  return `${diffD}d ago`;
}

function NewsPage() {
  const fetcher = useServerFn(getNews);
  // Shared with the dashboard via localStorage — picking a country there
  // keeps it selected here too. A `?country=` URL param still wins on
  // first load for shareable links.
  const [country, setCountry] = useSelectedCountry({ fallback: "IN" });
  const [items, setItems] = useState<{ title: string; link: string; pubDate: string }[]>([]);
  const [source, setSource] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher({ data: { country } })
      .then((res) => {
        if (cancelled) return;
        setItems(res.data);
        setSource(res.source);
        if (res.data.length === 0) setError("Headlines are temporarily unavailable for this country.");
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load news");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country, fetcher]);

  const def = COUNTRIES[country];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header showBackLink="dashboard" subtitle="Financial News" />

      <main className="mx-auto max-w-3xl px-4 pb-16 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-[color:var(--brand)]" />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Financial News</h1>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {COUNTRY_ORDER.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCountry(c)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                c === country
                  ? "border-[color:var(--brand)] bg-[color:var(--brand)]/10 text-[color:var(--brand)]"
                  : "border-border bg-card text-foreground hover:bg-surface-alt",
              )}
            >
              <span aria-hidden>{COUNTRIES[c].flag}</span>
              {COUNTRIES[c].name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-alt" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </div>
                {item.pubDate ? (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{timeAgo(item.pubDate)}</p>
                ) : null}
              </a>
            ))}
          </div>
        )}

        {source ? (
          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            Headlines for {def.name} via {source}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border pt-5 text-xs text-muted-foreground">
          <span>See the trend behind the headlines:</span>
          <Link to="/history/$symbol" params={{ symbol: "GC=F" }} className="text-[color:var(--brand)] hover:underline">
            Gold history
          </Link>
          <Link to="/history/$symbol" params={{ symbol: "BTC-USD" }} className="text-[color:var(--brand)] hover:underline">
            Bitcoin history
          </Link>
        </div>
      </main>

      <Footer />
      <MobileNav currentPath="/news" />
    </div>
  );
}
