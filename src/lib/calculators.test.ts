import { describe, it, expect } from "vitest";
import {
  calculateSIP,
  calculateLumpsum,
  calculateEMI,
  calculateInflation,
  calculateMetalGrams,
} from "./calculators";

/* ------------------------------------------------------------------ SIP -- */

describe("SIP Calculator", () => {
  it("calculates ₹10k/month for 10 years at 12% p.a.", () => {
    const result = calculateSIP(10000, 10, 12);
    expect(result.invested).toBe(1_200_000);
    expect(result.future).toBeGreaterThan(result.invested);
    expect(result.gain).toBe(result.future - result.invested);
    expect(result.future).toBeCloseTo(2_300_387, 0);
  });

  it("handles zero rate", () => {
    const result = calculateSIP(5000, 5, 0);
    expect(result.invested).toBe(300_000);
    expect(result.future).toBe(300_000);
    expect(result.gain).toBe(0);
  });

  it("handles zero years", () => {
    const result = calculateSIP(10000, 0, 12);
    expect(result.invested).toBe(0);
    expect(result.future).toBe(0);
  });
});

/* --------------------------------------------------------------- Lumpsum -- */

describe("Lumpsum Calculator", () => {
  it("calculates ₹1L for 10 years at 12% p.a.", () => {
    const result = calculateLumpsum(100000, 10, 12);
    expect(result.future).toBeGreaterThan(100000);
    expect(result.future).toBeCloseTo(310_585, 0);
    expect(result.gain).toBe(result.future - 100000);
  });

  it("handles zero rate", () => {
    const result = calculateLumpsum(50000, 5, 0);
    expect(result.future).toBe(50000);
    expect(result.gain).toBe(0);
  });
});

/* ------------------------------------------------------------------ EMI -- */

describe("EMI Calculator", () => {
  it("calculates ₹25L loan at 8.5% for 20 years", () => {
    const result = calculateEMI(2_500_000, 8.5, 20);
    expect(result.emi).toBeGreaterThan(0);
    expect(result.emi).toBeCloseTo(21_696, 0);
    expect(result.total).toBe(result.emi * 240);
    expect(result.interest).toBe(result.total - 2_500_000);
  });

  it("handles zero interest", () => {
    const result = calculateEMI(1_200_000, 0, 10);
    expect(result.emi).toBe(10_000);
    expect(result.interest).toBe(0);
  });

  it("handles 1-year tenure", () => {
    const result = calculateEMI(600_000, 12, 1);
    expect(result.emi).toBeGreaterThan(0);
    expect(result.total).toBe(result.emi * 12);
  });
});

/* -------------------------------------------------------------- Inflation -- */

describe("Inflation Calculator", () => {
  it("calculates ₹1L at 6% for 10 years", () => {
    const result = calculateInflation(100000, 10, 6);
    expect(result.future).toBeCloseTo(179_085, 0);
    expect(result.purchasingPower).toBeCloseTo(55_839, 0);
  });

  it("handles zero inflation", () => {
    const result = calculateInflation(50000, 5, 0);
    expect(result.future).toBe(50000);
    expect(result.purchasingPower).toBe(50000);
  });
});

/* ------------------------------------------------------------------ Metal -- */

describe("Metal Investment Calculator", () => {
  it("calculates grams of gold for ₹50k investment", () => {
    const result = calculateMetalGrams(50000, 2000, 83, 1.15, 8, 5);
    expect(result.grams).toBeGreaterThan(0);
    expect(result.futureValue).toBeGreaterThan(50000);
    expect(result.gain).toBe(result.futureValue - 50000);
  });

  it("handles zero growth", () => {
    const result = calculateMetalGrams(100000, 2000, 83, 1.15, 0, 5);
    expect(result.futureValue).toBe(100000);
    expect(result.gain).toBe(0);
  });
});
