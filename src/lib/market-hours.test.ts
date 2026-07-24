import { describe, it, expect } from "vitest";
import { getMarketStatus } from "./market-hours";

describe("getMarketStatus", () => {
  it("India: open on a weekday during session hours", () => {
    const tue10amIST = new Date("2025-01-14T04:30:00Z"); // 10:00 IST, Tuesday
    const status = getMarketStatus("IN", tue10amIST);
    expect(status.open).toBe(true);
    expect(status.minutesUntilChange).toBe(330);
  });

  it("India: closed on a Saturday", () => {
    const satIST = new Date("2025-01-18T04:30:00Z");
    expect(getMarketStatus("IN", satIST).open).toBe(false);
  });

  it("UAE: closed on a Friday (Sun–Thu trading week, not Mon–Fri)", () => {
    const friDubai = new Date("2025-01-17T07:00:00Z"); // 11:00 Dubai, Friday
    expect(getMarketStatus("AE", friDubai).open).toBe(false);
  });

  it("UAE: open on a Sunday (a trading day there, unlike most other markets)", () => {
    const sunDubai = new Date("2025-01-19T07:00:00Z"); // 11:00 Dubai, Sunday
    const status = getMarketStatus("AE", sunDubai);
    expect(status.open).toBe(true);
    expect(status.minutesUntilChange).toBe(180);
  });

  it("Japan: closed during the midday lunch break", () => {
    const jpLunch = new Date("2025-01-14T03:00:00Z"); // 12:00 JST, Tuesday
    const status = getMarketStatus("JP", jpLunch);
    expect(status.open).toBe(false);
    expect(status.minutesUntilChange).toBe(30); // 30 min until the 12:30 afternoon session opens
  });

  it("Japan: open during the morning session", () => {
    const jpMorning = new Date("2025-01-14T01:00:00Z"); // 10:00 JST, Tuesday
    expect(getMarketStatus("JP", jpMorning).open).toBe(true);
  });

  it("China: closed during its own midday lunch break", () => {
    const cnLunch = new Date("2025-01-14T04:00:00Z"); // 12:00 CST, Tuesday
    expect(getMarketStatus("CN", cnLunch).open).toBe(false);
  });

  it("every country resolves to a status without throwing", () => {
    const countries = ["IN", "US", "GB", "EU", "AE", "JP", "CN"] as const;
    for (const c of countries) {
      const status = getMarketStatus(c, new Date());
      expect(typeof status.open).toBe("boolean");
      expect(status.exchangeLabel.length).toBeGreaterThan(0);
    }
  });
});
