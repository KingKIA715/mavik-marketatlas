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

/* ------------------------------- Step-up SIP ------------------------------- */

export interface StepUpSIPResult {
  invested: number;
  future: number;
  gain: number;
}

export function calculateStepUpSIP(
  monthly: number,
  years: number,
  rate: number,
  stepUpPct: number,
): StepUpSIPResult {
  const monthlyRate = rate / 100 / 12;
  let corpus = 0;
  let invested = 0;
  let currentMonthly = monthly;
  for (let y = 0; y < years; y++) {
    for (let m = 0; m < 12; m++) {
      corpus = (corpus + currentMonthly) * (1 + monthlyRate);
      invested += currentMonthly;
    }
    currentMonthly *= 1 + stepUpPct / 100;
  }
  return { invested, future: corpus, gain: corpus - invested };
}

/* ---------------------------------- FD / RD --------------------------------- */

export interface DepositResult {
  invested: number;
  maturity: number;
  interest: number;
}

/** Fixed Deposit — lump sum compounded at `compoundingFreq` times per year (1/2/4/12). */
export function calculateFD(
  principal: number,
  rate: number,
  years: number,
  compoundingFreq: number,
): DepositResult {
  const maturity = principal * Math.pow(1 + rate / 100 / compoundingFreq, compoundingFreq * years);
  return { invested: principal, maturity, interest: maturity - principal };
}

/** Recurring Deposit — fixed monthly deposits, compounded monthly. */
export function calculateRD(monthly: number, rate: number, years: number): DepositResult {
  const months = years * 12;
  const monthlyRate = rate / 100 / 12;
  let maturity = 0;
  for (let m = 0; m < months; m++) {
    maturity = (maturity + monthly) * (1 + monthlyRate);
  }
  const invested = monthly * months;
  return { invested, maturity, interest: maturity - invested };
}

/* ----------------------------------- PPF ------------------------------------ */

/** India's Public Provident Fund — annuity-due: deposit at the start of the year, then that year's interest applies. */
export function calculatePPF(yearly: number, rate: number, years: number): DepositResult {
  const r = rate / 100;
  let corpus = 0;
  for (let y = 0; y < years; y++) {
    corpus = (corpus + yearly) * (1 + r);
  }
  const invested = yearly * years;
  return { invested, maturity: corpus, interest: corpus - invested };
}

/* -------------------------------- GST / VAT ---------------------------------- */

export interface TaxResult {
  base: number;
  tax: number;
  total: number;
}

/** Shared by both the India-specific GST calculator and the general VAT calculator — same arithmetic either way. */
export function calculateTax(amount: number, rate: number, direction: "add" | "remove"): TaxResult {
  if (direction === "add") {
    const tax = amount * (rate / 100);
    return { base: amount, tax, total: amount + tax };
  }
  const base = amount / (1 + rate / 100);
  const tax = amount - base;
  return { base, tax, total: amount };
}

/* ------------------------------- Fuel Cost ----------------------------------- */

export interface FuelCostResult {
  volumePerMonth: number;
  monthlyCost: number;
  yearlyCost: number;
}

export function calculateFuelCost(
  pricePerUnit: number,
  mileage: number,
  dailyDistance: number,
  daysPerMonth: number,
): FuelCostResult {
  const volumePerMonth = mileage > 0 ? (dailyDistance * daysPerMonth) / mileage : NaN;
  const monthlyCost = volumePerMonth * pricePerUnit;
  return { volumePerMonth, monthlyCost, yearlyCost: monthlyCost * 12 };
}

/* ------------------------------- Mortgage (US) -------------------------------- */

export interface MortgageResult {
  loanAmount: number;
  principalAndInterest: number;
  monthlyTax: number;
  monthlyInsurance: number;
  monthlyPMI: number;
  totalMonthly: number;
  totalInterest: number;
}

export function calculateMortgage(
  homePrice: number,
  downPaymentPct: number,
  rate: number,
  years: number,
  propertyTaxPct: number,
  annualInsurance: number,
  pmiPct: number,
): MortgageResult {
  const downPayment = homePrice * (downPaymentPct / 100);
  const loanAmount = Math.max(0, homePrice - downPayment);
  const monthlyRate = rate / 100 / 12;
  const n = years * 12;
  const principalAndInterest =
    monthlyRate > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
      : loanAmount / n;
  const monthlyTax = (homePrice * (propertyTaxPct / 100)) / 12;
  const monthlyInsurance = annualInsurance / 12;
  const monthlyPMI = downPaymentPct < 20 ? (loanAmount * (pmiPct / 100)) / 12 : 0;
  const totalMonthly = principalAndInterest + monthlyTax + monthlyInsurance + monthlyPMI;
  const totalInterest = principalAndInterest * n - loanAmount;
  return { loanAmount, principalAndInterest, monthlyTax, monthlyInsurance, monthlyPMI, totalMonthly, totalInterest };
}

/* -------------------------------- 401(k) (US) --------------------------------- */

export interface Retirement401kResult {
  corpus: number;
  totalContributed: number;
  totalEmployerMatch: number;
  monthlyDeposit: number;
  years: number;
}

export function calculate401k(
  currentAge: number,
  retireAge: number,
  currentBalance: number,
  salary: number,
  contributionPct: number,
  employerMatchPct: number,
  returnRate: number,
): Retirement401kResult {
  const years = Math.max(0, retireAge - currentAge);
  const monthlyRate = returnRate / 100 / 12;
  const employeeMonthly = (salary * (contributionPct / 100)) / 12;
  const matchMonthly = (salary * (Math.min(contributionPct, employerMatchPct) / 100)) / 12;
  const monthlyDeposit = employeeMonthly + matchMonthly;

  let corpus = currentBalance;
  for (let m = 0; m < years * 12; m++) {
    corpus = (corpus + monthlyDeposit) * (1 + monthlyRate);
  }
  const totalContributed = currentBalance + employeeMonthly * years * 12;
  const totalEmployerMatch = matchMonthly * years * 12;
  return { corpus, totalContributed, totalEmployerMatch, monthlyDeposit, years };
}
