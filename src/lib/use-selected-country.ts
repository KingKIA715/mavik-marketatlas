import { useCallback, useEffect, useState } from "react";
import { COUNTRIES, type CountryCode } from "./market-config";

/**
 * The user's selected country, shared across every page (dashboard, news,
 * …) via localStorage — so picking a country on the dashboard keeps it
 * selected when navigating to the news page, and vice versa, without an
 * account or a server-side session. Follows the same localStorage +
 * same-tab custom-event pattern as `use-watchlist.ts`.
 *
 * A `?country=` URL param always wins on first load (deep links stay
 * shareable and shareable links keep working); after that, changes are
 * written back to both localStorage (so other pages/components pick them
 * up) and the URL (so refreshing/sharing the current page keeps the right
 * country).
 */

const COUNTRY_KEY = "marketatlas:country";
const COUNTRY_EVENT = "marketatlas:country-changed";

function readStoredCountry(): CountryCode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COUNTRY_KEY);
    return raw && raw in COUNTRIES ? (raw as CountryCode) : null;
  } catch {
    return null;
  }
}

function writeStoredCountry(country: CountryCode) {
  try {
    localStorage.setItem(COUNTRY_KEY, country);
  } catch {
    // localStorage unavailable (private browsing, quota) — fail silently
  }
  window.dispatchEvent(new Event(COUNTRY_EVENT));
}

export function useSelectedCountry(options?: {
  fallback?: CountryCode;
  /** Called only when nothing was found in the URL or localStorage (true first visit). */
  guess?: () => CountryCode | null;
}) {
  const fallback = options?.fallback ?? "IN";
  const [country, setCountryState] = useState<CountryCode>(fallback);

  // Resolve initial value: URL param > stored preference > locale guess > fallback.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("country")?.toUpperCase();
    if (fromUrl && fromUrl in COUNTRIES) {
      setCountryState(fromUrl as CountryCode);
      writeStoredCountry(fromUrl as CountryCode);
      return;
    }
    const stored = readStoredCountry();
    if (stored) {
      setCountryState(stored);
      return;
    }
    const guessed = options?.guess?.();
    if (guessed && guessed in COUNTRIES) {
      setCountryState(guessed);
      writeStoredCountry(guessed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick up changes made from other components (or another tab) in-session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      const stored = readStoredCountry();
      if (stored) setCountryState(stored);
    };
    window.addEventListener(COUNTRY_EVENT, sync);
    return () => window.removeEventListener(COUNTRY_EVENT, sync);
  }, []);

  // Keep the URL's ?country= in sync so the current page stays shareable.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("country") !== country) {
      url.searchParams.set("country", country);
      window.history.replaceState({}, "", url.toString());
    }
  }, [country]);

  const setCountry = useCallback((c: CountryCode) => {
    setCountryState(c);
    writeStoredCountry(c);
  }, []);

  return [country, setCountry] as const;
}
