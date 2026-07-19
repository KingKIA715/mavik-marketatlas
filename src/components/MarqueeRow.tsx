import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MarqueeRowProps<T> {
  items: T[];
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Seconds per item — lower is faster. Total loop duration scales with item count. */
  secondsPerItem?: number;
  className?: string;
  itemClassName?: string;
}

/**
 * A horizontally auto-rotating strip that moves in a genuine circular loop —
 * content is duplicated and animated via CSS transform (not scrollLeft), so
 * new items continuously enter from the left as others exit to the right,
 * with no jarring "snap back to start." Pauses on touch/pointer/wheel
 * interaction, resumes after a few seconds. Falls back to a plain static
 * (non-animated, scrollable) row when there's only one item or the visitor
 * prefers reduced motion — CSS handles the reduced-motion case directly.
 */
export function MarqueeRow<T>({
  items,
  keyOf,
  renderItem,
  secondsPerItem = 3.5,
  className,
  itemClassName,
}: MarqueeRowProps<T>) {
  const [paused, setPaused] = useState(false);
  const pauseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (items.length === 0) return null;

  const handleInteract = () => {
    setPaused(true);
    if (pauseTimeout.current) clearTimeout(pauseTimeout.current);
    pauseTimeout.current = setTimeout(() => setPaused(false), 4500);
  };

  if (items.length === 1) {
    return (
      <div className={cn("flex gap-2", className)}>
        <div className={itemClassName}>{renderItem(items[0])}</div>
      </div>
    );
  }

  const durationSec = Math.max(8, items.length * secondsPerItem);

  return (
    <div
      className={cn("overflow-hidden", className)}
      onPointerDown={handleInteract}
      onTouchStart={handleInteract}
      onWheel={handleInteract}
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
