import { describe, it, expect } from "vitest";
import {
  calculateSIP,
  calculateLumpsum,
  calculateEMI,
  calculateInflation,
  calculateMetalGrams,
  calculateStepUpSIP,
  calculateFD,
  calculateRD,
  calculatePPF,
  calculateTax,
  calculateFuelCost,
  calculateMortgage,
  calculate401k,
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

/* ------------------------------------------------------------ Step-up SIP -- */

describe("Step-up SIP Calculator", () => {
  it("calculates ₹10k/month, 10 years, 12% return, 10% annual step-up", () => {
    const result = calculateStepUpSIP(10000, 10, 12, 10);
    expect(result.invested).toBeCloseTo(1_912_491, 0);
    expect(result.future).toBeCloseTo(3_374_326, 0);
    expect(result.gain).toBe(result.future - result.invested);
  });

  it("matches plain SIP when step-up is 0%", () => {
    const stepUp = calculateStepUpSIP(10000, 10, 12, 0);
    const plain = calculateSIP(10000, 10, 12);
    expect(stepUp.invested).toBeCloseTo(plain.invested, 0);
    expect(stepUp.future).toBeCloseTo(plain.future, 0);
  });

  it("invests more than a flat SIP once step-up is positive", () => {
    const stepUp = calculateStepUpSIP(10000, 10, 12, 10);
    const plain = calculateSIP(10000, 10, 12);
    expect(stepUp.invested).toBeGreaterThan(plain.invested);
    expect(stepUp.future).toBeGreaterThan(plain.future);
  });
});

/* ------------------------------------------------------------------ FD/RD -- */

describe("FD Calculator", () => {
  it("calculates ₹1L at 7% for 5 years, quarterly compounding", () => {
    const result = calculateFD(100000, 7, 5, 4);
    expect(result.invested).toBe(100000);
    expect(result.maturity).toBeCloseTo(141_478, 0);
    expect(result.interest).toBe(result.maturity - 100000);
  });

  it("higher compounding frequency yields more than annual", () => {
    const annual = calculateFD(100000, 7, 5, 1);
    const monthly = calculateFD(100000, 7, 5, 12);
    expect(monthly.maturity).toBeGreaterThan(annual.maturity);
  });

  it("handles zero rate", () => {
    const result = calculateFD(50000, 0, 5, 4);
    expect(result.maturity).toBe(50000);
    expect(result.interest).toBe(0);
  });
});

describe("RD Calculator", () => {
  it("calculates ₹5k/month at 7% for 5 years", () => {
    const result = calculateRD(5000, 7, 5);
    expect(result.invested).toBe(300000);
    expect(result.maturity).toBeCloseTo(360_053, 0);
    expect(result.interest).toBe(result.maturity - 300000);
  });

  it("handles zero rate", () => {
    const result = calculateRD(5000, 0, 5);
    expect(result.maturity).toBe(300000);
    expect(result.interest).toBe(0);
  });
});

/* ------------------------------------------------------------------- PPF -- */

describe("PPF Calculator", () => {
  it("calculates ₹1.5L/year at 7.1% for 15 years", () => {
    const result = calculatePPF(150000, 7.1, 15);
    expect(result.invested).toBe(2_250_000);
    expect(result.maturity).toBeCloseTo(4_068_209, 0);
    expect(result.interest).toBe(result.maturity - 2_250_000);
  });

  it("handles zero rate", () => {
    const result = calculatePPF(100000, 0, 15);
    expect(result.maturity).toBe(1_500_000);
    expect(result.interest).toBe(0);
  });
});

/* --------------------------------------------------------------- GST/VAT -- */

describe("Tax (GST/VAT) Calculator", () => {
  it("adds 18% GST to a ₹10,000 base amount", () => {
    const result = calculateTax(10000, 18, "add");
    expect(result.base).toBe(10000);
    expect(result.tax).toBe(1800);
    expect(result.total).toBe(11800);
  });

  it("removes 18% GST from a ₹11,800 inclusive amount, round-tripping the add case", () => {
    const result = calculateTax(11800, 18, "remove");
    expect(result.base).toBeCloseTo(10000, 6);
    expect(result.tax).toBeCloseTo(1800, 6);
    expect(result.total).toBe(11800);
  });

  it("handles a 0% rate", () => {
    const result = calculateTax(5000, 0, "add");
    expect(result.tax).toBe(0);
    expect(result.total).toBe(5000);
  });
});

/* -------------------------------------------------------------- Fuel Cost -- */

describe("Fuel Cost Calculator", () => {
  it("calculates monthly/yearly cost for a 40km/day commute at 15 km/L, ₹100/L", () => {
    const result = calculateFuelCost(100, 15, 40, 24);
    expect(result.volumePerMonth).toBeCloseTo(64, 6);
    expect(result.monthlyCost).toBe(6400);
    expect(result.yearlyCost).toBe(76800);
  });

  it("returns NaN volume/cost when mileage is 0 (avoids divide-by-zero silently returning Infinity)", () => {
    const result = calculateFuelCost(100, 0, 40, 24);
    expect(Number.isNaN(result.volumePerMonth)).toBe(true);
    expect(Number.isNaN(result.monthlyCost)).toBe(true);
  });
});

/* ------------------------------------------------------------- Mortgage -- */

describe("Mortgage Calculator", () => {
  it("calculates a $400k home, 20% down, 6.5% APR, 30-year term", () => {
    const result = calculateMortgage(400000, 20, 6.5, 30, 1.1, 1500, 0.5);
    expect(result.loanAmount).toBe(320000);
    expect(result.principalAndInterest).toBeCloseTo(2023, 0);
    expect(result.monthlyPMI).toBe(0);
    expect(result.totalMonthly).toBeCloseTo(2514, 0);
  });

  it("adds PMI when down payment is under 20%", () => {
    const result = calculateMortgage(400000, 10, 6.5, 30, 1.1, 1500, 0.5);
    expect(result.monthlyPMI).toBeCloseTo(150, 0);
    expect(result.totalMonthly).toBeGreaterThan(
      calculateMortgage(400000, 20, 6.5, 30, 1.1, 1500, 0.5).totalMonthly,
    );
  });
});

/* -------------------------------------------------------------- 401(k) -- */

describe("401(k) Calculator", () => {
  it("projects a 30-to-65 retirement with a partial employer match", () => {
    const result = calculate401k(30, 65, 20000, 80000, 6, 3, 7);
    expect(result.years).toBe(35);
    expect(result.monthlyDeposit).toBe(600); // 6% employee (400) + 3% match (200)
    expect(result.totalContributed).toBe(188000);
    expect(result.totalEmployerMatch).toBe(84000);
    expect(result.corpus).toBeCloseTo(1_317_059, 0);
  });

  it("caps the employer match at the employee's own contribution rate", () => {
    // Employer offers 5% match but employee only contributes 2% — match is capped at 2%.
    const result = calculate401k(30, 65, 0, 80000, 2, 5, 7);
    expect(result.monthlyDeposit).toBeCloseTo((80000 * 0.02) / 12 + (80000 * 0.02) / 12, 6);
  });

  it("returns zero years for someone already at retirement age", () => {
    const result = calculate401k(65, 65, 50000, 80000, 6, 3, 7);
    expect(result.years).toBe(0);
    expect(result.corpus).toBe(50000);
  });
});
