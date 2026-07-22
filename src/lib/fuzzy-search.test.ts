import { describe, it, expect } from "vitest";
import { fuzzyScore } from "./fuzzy-search";

describe("fuzzyScore", () => {
  it("returns 0 for an empty query (matches everything, ranks lowest)", () => {
    expect(fuzzyScore("", "Gold")).toBe(0);
  });

  it("scores an exact match highest", () => {
    expect(fuzzyScore("gold", "Gold")).toBe(1000);
  });

  it("is case-insensitive", () => {
    expect(fuzzyScore("GOLD", "gold")).toBe(1000);
  });

  it("scores a prefix match above a plain substring match", () => {
    const prefix = fuzzyScore("nif", "Nifty 50")!;
    const substring = fuzzyScore("ift", "Nifty 50")!;
    expect(prefix).toBeGreaterThan(substring);
  });

  it("scores a prefix match above a later substring match", () => {
    const prefix = fuzzyScore("gold", "Gold Duty Calculator")!;
    const substring = fuzzyScore("calc", "Gold Duty Calculator")!;
    expect(prefix).toBeGreaterThan(substring);
  });

  it("matches an in-order subsequence even with gaps (typo/abbreviation tolerant)", () => {
    expect(fuzzyScore("btc", "Bitcoin")).not.toBeNull();
    expect(fuzzyScore("svr", "Silver")).not.toBeNull();
  });

  it("returns null when characters are out of order", () => {
    // "ytfn" would require the letters in reverse order to how they
    // actually appear in "Nifty 50" — not a valid subsequence.
    expect(fuzzyScore("ytfn", "Nifty 50")).toBeNull();
  });

  it("returns null when a character is missing entirely", () => {
    expect(fuzzyScore("goldz", "Gold")).toBeNull();
  });

  it("ranks a tighter subsequence match above a looser one", () => {
    const tight = fuzzyScore("svr", "Silver")!;
    const loose = fuzzyScore("svr", "Solar Voyager")!;
    expect(tight).toBeGreaterThan(loose);
  });
});
