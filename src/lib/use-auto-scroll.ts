import { useEffect, useRef } from "react";

/**
 * Auto-advances a horizontally scrollable container every `intervalMs`,
 * looping back to the start once it reaches the end. Pauses while the user
 * is actively touching/dragging/scrolling the row, resuming after a short
 * cooldown. No-ops entirely when the content doesn't overflow (nothing to
 * scroll) or when the visitor has requested reduced motion.
 *
 * Usage: `const scrollRef = useAutoScroll<HTMLDivElement>(); <div ref={scrollRef} className="overflow-x-auto ...">`
 */
export function useAutoScroll<T extends HTMLElement>(intervalMs = 3500, stepPx = 160) {
  const ref = useRef<T | null>(null);
  const pausedUntil = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const pause = () => {
      pausedUntil.current = Date.now() + 4500;
    };
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("pointerdown", pause);
    el.addEventListener("wheel", pause, { passive: true });

    const id = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 4) return; // fully visible — nothing to rotate
      const next = el.scrollLeft + stepPx;
      if (next >= maxScroll - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollTo({ left: next, behavior: "smooth" });
      }
    }, intervalMs);

    return () => {
      clearInterval(id);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("wheel", pause);
    };
  }, [intervalMs, stepPx]);

  return ref;
}
