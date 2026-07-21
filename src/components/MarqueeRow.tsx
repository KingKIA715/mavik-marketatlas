import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarqueeRowProps<T> {
  items: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Seconds per item — lower is faster. Total loop duration scales with item count. */
  secondsPerItem?: number;
  className?: string;
  itemClassName?: string;
  /** Accessible name for the row, e.g. "Select country". Recommended whenever the row isn't preceded by its own visible heading. */
  ariaLabel?: string;
  /**
   * Once true, the row stops auto-rotating for good and switches to a plain
   * manually-scrollable strip (drag/swipe/wheel, plus chevron buttons on
   * larger screens) — it never resumes rotating on its own. Pass this once
   * the visitor has made a selection from the row (tapped a country, an
   * asset filter, a mover, a tool, etc.) so the row stays put on their
   * choice instead of drifting on to the next item.
   */
  locked?: boolean;
}

/**
 * A horizontally auto-rotating strip that moves in a genuine circular loop —
 * content is duplicated and animated via CSS transform (not scrollLeft), so
 * new items continuously enter from the left as others exit to the right,
 * with no jarring "snap back to start." Pauses on touch/pointer/wheel
 * interaction, resumes after a few seconds. Falls back to a plain static
 * (non-animated, scrollable) row when there's only one item, the visitor
 * prefers reduced motion — CSS handles the reduced-motion case directly —
 * or once `locked` is set, in which case the stop is permanent rather than
 * a few-second pause.
 */
export function MarqueeRow<T>({
  items,
  keyOf,
  renderItem,
  secondsPerItem = 3.5,
  className,
  itemClassName,
  locked = false,
  ariaLabel,
}: MarqueeRowProps<T>) {
  const [paused, setPaused] = useState(false);
  const pauseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  if (items.length === 0) return null;

  const handleInteract = () => {
    setPaused(true);
    if (pauseTimeout.current) clearTimeout(pauseTimeout.current);
    pauseTimeout.current = setTimeout(() => setPaused(false), 4500);
  };

  const scrollByStep = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.6), behavior: "smooth" });
  };

  // A selection has been made (or there's nothing to rotate) — render a
  // plain, manually-scrollable row. This is a permanent state, not a pause:
  // it never switches back to auto-rotating.
  if (locked || items.length === 1) {
    return (
      <div className={cn("flex items-center gap-1", className)} role="group" aria-label={ariaLabel}>
        {items.length > 1 ? (
          <button
            type="button"
            aria-label="Scroll left"
            onClick={() => scrollByStep(-1)}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground sm:flex"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <div
          ref={scrollRef}
          className="flex flex-1 gap-2 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item) => (
            <div key={keyOf(item)} className={cn("shrink-0", itemClassName)}>
              {renderItem(item)}
            </div>
          ))}
        </div>
        {items.length > 1 ? (
          <button
            type="button"
            aria-label="Scroll right"
            onClick={() => scrollByStep(1)}
            className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground sm:flex"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    );
  }

  const durationSec = Math.max(8, items.length * secondsPerItem);

  return (
    <div
      className={cn("overflow-hidden", className)}
      role="group"
      aria-label={ariaLabel}
      onPointerDown={handleInteract}
      onTouchStart={handleInteract}
      onWheel={handleInteract}
      onFocus={handleInteract}
    >
      <div
        className="flex w-max animate-marquee gap-2"
        style={{ animationDuration: `${durationSec}s`, animationPlayState: paused ? "paused" : "running" }}
      >
        {items.map((item) => (
          <div key={`a-${keyOf(item)}`} className={cn("shrink-0", itemClassName)}>
            {renderItem(item)}
          </div>
        ))}
        {items.map((item) => (
          <div key={`b-${keyOf(item)}`} className={cn("shrink-0", itemClassName)} aria-hidden>
            {renderItem(item)}
          </div>
        ))}
      </div>
    </div>
  );
}
