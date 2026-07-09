// Pure calculation functions — extracted for testability (Week 4 refactor)

export interface SIPResult {
  invested: number;
  future: number;
  gain: number;
}

export function calculateSIP(monthly: number, years: number, rate: number): SIPResult {
  const n = years * 12;
  const r = rate / 100 / 12;
  const fv = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  const inv = monthly * n;
  return { invested: inv, future: fv, gain: fv - inv };
}

export interface LumpsumResult {
  future: number;
  gain: number;
}

export function calculateLumpsum(amount: number, years: number, rate: number): LumpsumResult {
  const fv = amount * Math.pow(1 + rate / 100, years);
  return { future: fv, gain: fv - amount };
}

export interface EMIResult {
  emi: number;
  total: number;
  interest: number;
}

export function calculateEMI(principal: number, rate: number, years: number): EMIResult {
  const n = years * 12;
  const r = rate / 100 / 12;
  const e =
    r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const t = e * n;
  return { emi: e, total: t, interest: t - principal };
}

export interface InflationResult {
  future: number;
  purchasingPower: number;
}

export function calculateInflation(amount: number, years: number, rate: number): InflationResult {
  const future = amount * Math.pow(1 + rate / 100, years);
  const purchasingPower = amount / Math.pow(1 + rate / 100, years);
  return { future, purchasingPower };
}

export function calculateMetalGrams(
  amount: number,
  spotUsdOz: number,
  fx: number,
  premium: number,
  growth: number,
  years: number,
): { grams: number; futureValue: number; gain: number } {
  const pricePerOz = spotUsdOz * fx * premium;
  const pricePerGram = pricePerOz / 31.1034768;
  const grams = amount / pricePerGram;
  const futureValue = amount * Math.pow(1 + growth / 100, years);
  const gain = futureValue - amount;
  return { grams, futureValue, gain };
}
