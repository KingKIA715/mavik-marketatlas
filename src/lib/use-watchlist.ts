import { useCallback, useEffect, useState } from "react";
import type { AssetCategory } from "./asset-resolver";

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

/* --------------------------------- Portfolio ---------------------------------- */
// "What I hold" — a lightweight, localStorage-only holdings list (grams of a
// metal, units of a crypto). No accounts, no server-side storage, same as
// pinned favorites and alerts above. Deliberately scoped to metals + crypto:
// those are things a person actually holds a quantity of, unlike a stock
// index (which isn't a single purchasable unit in this app) or crude oil.

const PORTFOLIO_KEY = "marketatlas:portfolio";
const PORTFOLIO_EVENT = "marketatlas:portfolio-changed";

export interface Holding {
  id: string;
  assetKey: string; // "metals:XAU" | "crypto:BTC" etc — same "<category>:<id>" format as pinned/alerts
  quantity: number; // grams for metals, coin units for crypto
}

function readHoldings(): Holding[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PORTFOLIO_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHoldings(holdings: Holding[]) {
  try {
    localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(holdings));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(PORTFOLIO_EVENT));
}

export function usePortfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);

  useEffect(() => {
    setHoldings(readHoldings());
    const sync = () => setHoldings(readHoldings());
    window.addEventListener(PORTFOLIO_EVENT, sync);
    return () => window.removeEventListener(PORTFOLIO_EVENT, sync);
  }, []);

  const add = useCallback((assetKey: string, quantity: number) => {
    const prev = readHoldings();
    const existing = prev.find((h) => h.assetKey === assetKey);
    const next = existing
      ? prev.map((h) => (h.assetKey === assetKey ? { ...h, quantity: h.quantity + quantity } : h))
      : [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, assetKey, quantity }];
    writeHoldings(next);
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    const next = readHoldings().map((h) => (h.id === id ? { ...h, quantity } : h));
    writeHoldings(next);
  }, []);

  const remove = useCallback((id: string) => {
    writeHoldings(readHoldings().filter((h) => h.id !== id));
  }, []);

  return { holdings, add, updateQuantity, remove };
}

/* ------------------------------ Recent searches -------------------------------- */

const RECENTS_KEY = "marketatlas:recent-searches";
const RECENTS_EVENT = "marketatlas:recent-searches-changed";
const MAX_RECENTS = 6;

export interface RecentSearch {
  key: string; // matches AssetRef.key — "<category>:<id>"
  category: AssetCategory;
  label: string;
  emoji: string;
  sub: string;
}

function readRecents(): RecentSearch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecents(recents: RecentSearch[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(RECENTS_EVENT));
}

export function useRecentSearches() {
  const [recents, setRecents] = useState<RecentSearch[]>([]);

  useEffect(() => {
    setRecents(readRecents());
    const sync = () => setRecents(readRecents());
    window.addEventListener(RECENTS_EVENT, sync);
    return () => window.removeEventListener(RECENTS_EVENT, sync);
  }, []);

  const add = useCallback((entry: RecentSearch) => {
    const prev = readRecents().filter((r) => r.key !== entry.key);
    writeRecents([entry, ...prev].slice(0, MAX_RECENTS));
  }, []);

  const clear = useCallback(() => writeRecents([]), []);

  return { recents, add, clear };
}
