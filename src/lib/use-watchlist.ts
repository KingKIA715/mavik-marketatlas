import { useCallback, useEffect, useState } from "react";

/* ------------------------------- Pinned favorites --------------------------- */
// Key format: "<category>:<id>" e.g. "metals:XAU", "crypto:BTC", "stocks:^NSEI", "fx:EUR"

const PINNED_KEY = "marketatlas:pinned";
const PINNED_EVENT = "marketatlas:pinned-changed";

function readPinned(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function usePinned() {
  const [pinned, setPinned] = useState<string[]>([]);

  useEffect(() => {
    setPinned(readPinned());
    const sync = () => setPinned(readPinned());
    window.addEventListener(PINNED_EVENT, sync);
    return () => window.removeEventListener(PINNED_EVENT, sync);
  }, []);

  const toggle = useCallback((key: string) => {
    const prev = readPinned();
    const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
    try {
      localStorage.setItem(PINNED_KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable (private browsing, quota) — fail silently
    }
    window.dispatchEvent(new Event(PINNED_EVENT));
  }, []);

  const isPinned = useCallback((key: string) => pinned.includes(key), [pinned]);

  return { pinned, toggle, isPinned };
}

/* --------------------------------- Price alerts ------------------------------ */
// Local-only alerts: checked client-side against already-fetched snapshot data,
// fired via the browser Notification API. These only fire while the app has been
// opened recently enough for a snapshot refresh to run — there is no server-side
// push infrastructure (no database/persistence layer exists in this app), so this
// is NOT the same as a true push notification that fires with the app fully closed.

const ALERTS_KEY = "marketatlas:alerts";
const ALERTS_EVENT = "marketatlas:alerts-changed";

export interface PriceAlert {
  id: string;
  assetKey: string; // same "<category>:<id>" format as pinned
  label: string;
  condition: "above" | "below";
  threshold: number;
  currency: string;
  firedAt: string | null;
}

function readAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAlerts(alerts: PriceAlert[]) {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(ALERTS_EVENT));
}

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    setAlerts(readAlerts());
    const sync = () => setAlerts(readAlerts());
    window.addEventListener(ALERTS_EVENT, sync);
    return () => window.removeEventListener(ALERTS_EVENT, sync);
  }, []);

  const add = useCallback((alert: Omit<PriceAlert, "id" | "firedAt">) => {
    const prev = readAlerts();
    const next = [...prev, { ...alert, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, firedAt: null }];
    writeAlerts(next);
  }, []);

  const remove = useCallback((id: string) => {
    const next = readAlerts().filter((a) => a.id !== id);
    writeAlerts(next);
  }, []);

  const markFired = useCallback((id: string) => {
    const next = readAlerts().map((a) => (a.id === id ? { ...a, firedAt: new Date().toISOString() } : a));
    writeAlerts(next);
  }, []);

  return { alerts, add, remove, markFired };
}
