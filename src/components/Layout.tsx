import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { triggerSync } from "@/lib/market.functions";
import { RefreshCw, Home, Calculator, ChevronLeft, ChevronRight } from "lucide-react";

/* =====================================================================
 * SCROLL INDICATOR
 * ===================================================================== */

export function ScrollIndicator() {
  return (
    <>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent sm:w-8" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent sm:w-8" />
    </>
  );
}

/* =====================================================================
 * SCROLL ARROWS
 * ===================================================================== */

export function ScrollArrows({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const check = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    check();
    el.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [scrollRef]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "left" ? -150 : 150, behavior: "smooth" });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => scroll("left")}
        className={cn(
          "absolute left-1 top-1/2 z-10 -translate-y-1/2 sm:hidden",
          "inline-flex h-7 w-7 items-center justify-center rounded-full",
          "border border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur-sm",
          "transition-opacity duration-200",
          canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-label="Scroll left"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => scroll("right")}
        className={cn(
          "absolute right-1 top-1/2 z-10 -translate-y-1/2 sm:hidden",
          "inline-flex h-7 w-7 items-center justify-center rounded-full",
          "border border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur-sm",
          "transition-opacity duration-200",
          canScrollRight ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-label="Scroll right"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </>
  );
}

/* =====================================================================
 * SYNC BUTTON
 * ===================================================================== */

export function SyncButton() {
  const queryClient = useQueryClient();
  const sync = useServerFn(triggerSync);
  const [syncing, setSyncing] = useState(false);

  const onSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await sync();
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["market-snapshot"] });
      }
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onSync}
      disabled={syncing}
      aria-label="Force refresh from upstream APIs"
      title="Force refresh from upstream APIs"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-surface-alt",
        syncing && "cursor-wait opacity-70",
      )}
    >
      <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
    </button>
  );
}

/* =====================================================================
 * HEADER
 * ===================================================================== */

interface HeaderProps {
  fetchedAt?: string;
  locale?: string;
  showBackLink?: "dashboard" | "resources";
}

export function Header({ fetchedAt, locale, showBackLink }: HeaderProps) {
  return (
    <header className="border-b border-border bg-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <Link to="/" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Market<span className="text-[color:var(--brand)]">Atlas</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {showBackLink === "resources" ? (
              <Link
                to="/resources"
                aria-label="Financial calculators and tools"
                title="Financial calculators & tools"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/5 text-white transition-colors hover:bg-white/10"
              >
                <Calculator className="h-4 w-4" />
              </Link>
            ) : showBackLink === "dashboard" ? (
              <Link
                to="/"
                aria-label="Back to dashboard"
                title="Dashboard"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/5 text-white transition-colors hover:bg-white/10"
              >
                <Home className="h-4 w-4" />
              </Link>
            ) : null}
            <ThemeToggle className="h-9 w-9 rounded-md border-white/20 bg-white/5 text-white hover:bg-white/10" />
            <SyncButton />
          </div>
        </div>
        {fetchedAt && locale ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <LocalDate iso={fetchedAt} locale={locale} />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 ring-1 ring-emerald-400/40">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
                Live
              </span>
            </span>
          </div>
        ) : (
          <div className="mt-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
              Resources
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

function LocalDate({ iso, locale }: { iso: string; locale: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    try {
      setText(
        new Date(iso).toLocaleDateString(locale, {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      );
    } catch {
      setText(new Date(iso).toDateString());
    }
  }, [iso, locale]);
  return (
    <span suppressHydrationWarning className="font-mono text-[11px] text-white/80">
      {text || "\u00A0"}
    </span>
  );
}

/* =====================================================================
 * FOOTER
 * ===================================================================== */

interface FooterProps {
  sources?: {
    metals: string;
    rates: string;
    crypto: string;
    quotes: string;
    crude: string;
  };
}

export function Footer({ sources }: FooterProps) {
  const providers = sources
    ? Array.from(
        new Set([sources.metals, sources.crypto, sources.rates, sources.quotes, sources.crude].filter(Boolean)),
      )
    : [];

  return (
    <footer className="mt-8 border-t border-border pt-5">
      <div className="space-y-1.5 text-[11px] text-muted-foreground">
        <div className="font-medium">
          © MarketAtlas · built by <span className="font-semibold text-foreground">MAVIK group</span>
        </div>
        <div className="text-[10px]">
          Global financial hub for common people 🫂
        </div>
        {providers.length > 0 ? (
          <div className="pt-1 font-mono text-[10px] text-muted-foreground/80">
            Data: {providers.join(" · ")}
          </div>
        ) : null}
      </div>
    </footer>
  );
}
