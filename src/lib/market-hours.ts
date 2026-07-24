import type { CountryCode } from "./market-config";

/**
 * Regular trading-session hours for each country's primary equity market.
 * Deliberately simplified: ignores public holidays and early/half-day
 * closes (no data source for those here) — this reflects the *regular
 * weekly schedule* only. Two things worth knowing if this ever looks
 * wrong: (1) UAE (DFM/ADX) trades Sunday–Thursday, not Monday–Friday —
 * modeled explicitly below, not a bug; (2) Japan (TSE) and China (SSE/SZSE)
 * both have a midday lunch break where the market is genuinely closed
 * for part of the day — also modeled explicitly via multiple sessions.
 */
export interface MarketSession {
  /** Minutes since local midnight, in the exchange's own timezone. */
  openMin: number;
  closeMin: number;
}

export interface MarketHours {
  timezone: string;
  /** Trading weekdays, JS Date.getDay() numbering: 0=Sun ... 6=Sat. */
  tradingDays: number[];
  sessions: MarketSession[];
  exchangeLabel: string;
}

export const MARKET_HOURS: Record<CountryCode, MarketHours> = {
  IN: {
    timezone: "Asia/Kolkata",
    tradingDays: [1, 2, 3, 4, 5],
    sessions: [{ openMin: 9 * 60 + 15, closeMin: 15 * 60 + 30 }],
    exchangeLabel: "NSE/BSE",
  },
  US: {
    timezone: "America/New_York",
    tradingDays: [1, 2, 3, 4, 5],
    sessions: [{ openMin: 9 * 60 + 30, closeMin: 16 * 60 }],
    exchangeLabel: "NYSE/Nasdaq",
  },
  GB: {
    timezone: "Europe/London",
    tradingDays: [1, 2, 3, 4, 5],
    sessions: [{ openMin: 8 * 60, closeMin: 16 * 60 + 30 }],
    exchangeLabel: "LSE",
  },
  EU: {
    timezone: "Europe/Berlin",
    tradingDays: [1, 2, 3, 4, 5],
    sessions: [{ openMin: 9 * 60, closeMin: 17 * 60 + 30 }],
    exchangeLabel: "Xetra/Euronext",
  },
  AE: {
    timezone: "Asia/Dubai",
    tradingDays: [0, 1, 2, 3, 4], // Sunday–Thursday trading week
    sessions: [{ openMin: 10 * 60, closeMin: 14 * 60 }],
    exchangeLabel: "DFM/ADX",
  },
  JP: {
    timezone: "Asia/Tokyo",
    tradingDays: [1, 2, 3, 4, 5],
    sessions: [
      { openMin: 9 * 60, closeMin: 11 * 60 + 30 },
      { openMin: 12 * 60 + 30, closeMin: 15 * 60 },
    ],
    exchangeLabel: "TSE",
  },
  CN: {
    timezone: "Asia/Shanghai",
    tradingDays: [1, 2, 3, 4, 5],
    sessions: [
      { openMin: 9 * 60 + 30, closeMin: 11 * 60 + 30 },
      { openMin: 13 * 60, closeMin: 15 * 60 },
    ],
    exchangeLabel: "SSE/SZSE",
  },
};

/** Extracts the weekday + minutes-since-midnight for `now` in `timezone`, without a date library. */
export function getLocalWeekdayAndMinutes(timezone: string, now: Date): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(now);

  const weekdayStr = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const minutePart = parts.find((p) => p.type === "minute")?.value ?? "0";
  // Intl's hour12:false can format midnight as "24" in some locales/engines — normalize to 0.
  const hour = Number(hourPart) % 24;
  const minute = Number(minutePart);

  return { weekday: weekdayMap[weekdayStr] ?? 0, minutes: hour * 60 + minute };
}

export interface MarketStatus {
  open: boolean;
  /** Minutes until the next open (if closed) or next close (if open) — null if not computable within a week. */
  minutesUntilChange: number | null;
  exchangeLabel: string;
}

export function getMarketStatus(country: CountryCode, now: Date = new Date()): MarketStatus {
  const hours = MARKET_HOURS[country];
  const { weekday, minutes } = getLocalWeekdayAndMinutes(hours.timezone, now);

  if (hours.tradingDays.includes(weekday)) {
    for (const session of hours.sessions) {
      if (minutes >= session.openMin && minutes < session.closeMin) {
        return { open: true, minutesUntilChange: session.closeMin - minutes, exchangeLabel: hours.exchangeLabel };
      }
    }
  }

  // Closed — find minutes until the next session open, scanning forward up to 7 days.
  for (let dayOffset = 0; dayOffset <= 7; dayOffset++) {
    const candidateWeekday = (weekday + dayOffset) % 7;
    if (!hours.tradingDays.includes(candidateWeekday)) continue;
    for (const session of hours.sessions) {
      const candidateMinutesFromNow = dayOffset * 24 * 60 + session.openMin - minutes;
      if (candidateMinutesFromNow > 0) {
        return { open: false, minutesUntilChange: candidateMinutesFromNow, exchangeLabel: hours.exchangeLabel };
      }
    }
  }

  return { open: false, minutesUntilChange: null, exchangeLabel: hours.exchangeLabel };
}
