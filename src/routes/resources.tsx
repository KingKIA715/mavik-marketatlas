import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { getMarketSnapshot, searchMutualFunds, getMutualFundNav, type MarketSnapshot } from "@/lib/market.functions";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import {
  GRAMS_PER_TROY_OUNCE,
  COUNTRIES,
  COUNTRY_ORDER,
  FUEL_REFERENCE,
  FUEL_SPREAD,
  type CountryCode,
} from "@/lib/market-config";
import {
  TrendingUp,
  Home,
  Coins,
  Flame,
  ArrowLeftRight,
  PiggyBank,
  Banknote,
  ChevronsUp,
  ShieldCheck,
  Percent,
  Fuel,
  Search,
  Briefcase,
  Building2,
} from "lucide-react";
import { Header, Footer, ScrollIndicator } from "@/components/Layout";
import { MobileNav } from "@/components/MobileNav";
import { MarqueeRow } from "@/components/MarqueeRow";
import { cn } from "@/lib/utils";
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
} from "@/lib/calculators";


const snapshotQuery = (fetcher: () => Promise<MarketSnapshot>) =>
  queryOptions({
    queryKey: ["market-snapshot"],
    queryFn: fetcher,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const Route = createFileRoute("/resources")({
  head: () => ({
    meta: [
      { title: "Resources — Financial Calculators | MarketAtlas" },
      {
        name: "description",
        content:
          "Free calculators: SIP, lumpsum returns, EMI, gold & silver investment, inflation impact, and live currency conversion.",
      },
      { property: "og:title", content: "Financial Calculators — MarketAtlas" },
      {
        property: "og:description",
        content:
          "SIP, lumpsum, EMI, gold/silver, inflation and currency tools powered by live rates.",
      },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(snapshotQuery(getMarketSnapshot)),
  component: ResourcesPage,
});

function ResourcesPage() {
  const fetcher = useServerFn(getMarketSnapshot);
  const { data } = useSuspenseQuery(snapshotQuery(fetcher));
  const [activeGroup, setActiveGroup] = useState<"general" | "india" | "usa">("general");
  const [activeTool, setActiveTool] = useState("lumpsum");
  const [toolsLocked, setToolsLocked] = useState(false);

const TOOL_GROUPS: { id: "general" | "india" | "usa"; label: string }[] = [
  { id: "general", label: "General" },
  { id: "india", label: "India" },
  { id: "usa", label: "USA" },
];

const tools = [
  { id: "lumpsum", label: "Lumpsum", icon: PiggyBank, group: "general" as const },
  { id: "fdrd", label: "FD/RD", icon: Banknote, group: "general" as const },
  { id: "emi", label: "EMI", icon: Home, group: "general" as const },
  { id: "metal", label: "Gold/Silver", icon: Coins, group: "general" as const },
  { id: "inflation", label: "Inflation", icon: Flame, group: "general" as const },
  { id: "vat", label: "VAT", icon: Percent, group: "general" as const },
  { id: "fuel", label: "Fuel Cost", icon: Fuel, group: "general" as const },
  { id: "fx", label: "Currency", icon: ArrowLeftRight, group: "general" as const },
  { id: "sip", label: "SIP", icon: TrendingUp, group: "india" as const },
  { id: "stepup", label: "Step-up SIP", icon: ChevronsUp, group: "india" as const },
  { id: "ppf", label: "PPF", icon: ShieldCheck, group: "india" as const },
  { id: "mf", label: "Mutual Funds", icon: Search, group: "india" as const },
  { id: "gst", label: "GST", icon: Percent, group: "india" as const },
  { id: "mortgage", label: "Mortgage", icon: Building2, group: "usa" as const },
  { id: "401k", label: "401(k)", icon: Briefcase, group: "usa" as const },
];

const groupTools = tools.filter((t) => t.group === activeGroup);

const handleGroupChange = (g: "general" | "india" | "usa") => {
  setActiveGroup(g);
  setToolsLocked(false);
  const first = tools.find((t) => t.group === g);
  if (first) setActiveTool(first.id);
};
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header showBackLink="dashboard" />

      <main className="mx-auto max-w-6xl px-4 pb-16 py-6 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Financial Calculators
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Powered by live rates from the MarketAtlas dashboard.
          </p>
        </div>

<Tabs value={activeTool} onValueChange={setActiveTool} className="w-full">
    <div className="mb-4 flex gap-2">
      {TOOL_GROUPS.map((g) => {
        const active = g.id === activeGroup;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => handleGroupChange(g.id)}
            aria-pressed={active}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              active
                ? "border-[color:var(--brand)] bg-[color:var(--brand)] text-white shadow-sm"
                : "border-border bg-background text-muted-foreground hover:bg-surface-alt hover:text-foreground",
            )}
          >
            {g.label}
          </button>
        );
      })}
    </div>
    <div className="relative mb-6">
      <ScrollIndicator />
      <MarqueeRow
        items={groupTools}
        keyOf={(t) => t.id}
        secondsPerItem={2.2}
        locked={toolsLocked}
        ariaLabel={`${TOOL_GROUPS.find((g) => g.id === activeGroup)?.label ?? ""} calculators`}
        renderItem={(t) => {
          const Icon = t.icon;
          const active = t.id === activeTool;
          return (
            <button
              type="button"
              onClick={() => {
                setToolsLocked(true);
                setActiveTool(t.id);
              }}
              aria-pressed={active}
              className={cn(
                "flex h-auto shrink-0 flex-col items-center gap-1 rounded-lg border border-border bg-background px-2 py-2 text-center text-[10px] font-semibold text-foreground transition-colors hover:bg-surface-alt min-w-[72px] whitespace-normal sm:min-w-[92px] sm:px-4 sm:py-2.5 sm:text-[11px]",
                active && "border-[color:var(--brand)] bg-[color:var(--brand)]/10 text-[color:var(--brand)] shadow-sm",
              )}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{t.label}</span>
            </button>
          );
        }}
      />
    </div>

        <TabsContent value="sip">
            <SIPCalculator />
          </TabsContent>
          <TabsContent value="stepup">
            <StepUpSIPCalculator />
          </TabsContent>
          <TabsContent value="lumpsum">
            <LumpsumCalculator />
          </TabsContent>
          <TabsContent value="fdrd">
            <FDRDCalculator />
          </TabsContent>
          <TabsContent value="ppf">
            <PPFCalculator />
          </TabsContent>
          <TabsContent value="mf">
            <MutualFundLookup />
          </TabsContent>
          <TabsContent value="emi">
            <EMICalculator />
          </TabsContent>
          <TabsContent value="mortgage">
            <MortgageCalculator />
          </TabsContent>
          <TabsContent value="401k">
            <Retirement401kCalculator />
          </TabsContent>
          <TabsContent value="metal">
            <MetalCalculator data={data} />
          </TabsContent>
          <TabsContent value="inflation">
            <InflationCalculator />
          </TabsContent>
          <TabsContent value="gst">
            <GSTCalculator />
          </TabsContent>
          <TabsContent value="vat">
            <VATCalculator />
          </TabsContent>
          <TabsContent value="fuel">
            <FuelCostCalculator data={data} />
          </TabsContent>
          <TabsContent value="fx">
            <CurrencyConverter data={data} />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />

      <MobileNav currentPath="/resources" />
    </div>
  );
}

/* ------------------------------- UI helpers ------------------------------ */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 md:grid-cols-2">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  suffix,
  step = "any",
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  step?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === "" ? 0 : parseFloat(val));
          }}
          className="font-mono tabular-nums"
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-surface-alt p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 text-lg font-bold ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </div>
    </div>
  );
}

/* ---------------------------------- SIP ---------------------------------- */

function SIPCalculator() {
  const [monthly, setMonthly] = useState(10000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(12);
  const [currency, setCurrency] = useState("INR");

  const { invested, future, gain } = useMemo(
    () => calculateSIP(monthly, years, rate),
    [monthly, years, rate],
  );

  return (
    <Card>
      <h2 className="text-lg font-semibold">SIP Calculator</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Estimate wealth built by monthly systematic investment.
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <Field label="Monthly investment" value={monthly} onChange={setMonthly} min={0} />
          <Field label="Duration (years)" value={years} onChange={setYears} min={0} suffix="yrs" />
          <Field label="Expected return rate" value={rate} onChange={setRate} suffix="% p.a." />
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
          <Stat label="Invested" value={fmtCurrency(invested, currency, { maximumFractionDigits: 0 })} />
          <Stat label="Est. returns" value={fmtCurrency(gain, currency, { maximumFractionDigits: 0 })} />
          <Stat label="Future value" value={fmtCurrency(future, currency, { maximumFractionDigits: 0 })} />
        </div>
      </Grid>
    </Card>
  );
}

/* -------------------------------- Lumpsum -------------------------------- */

function LumpsumCalculator() {
  const [amount, setAmount] = useState(100000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(12);
  const [currency, setCurrency] = useState("INR");

  const { future, gain } = useMemo(
    () => calculateLumpsum(amount, years, rate),
    [amount, years, rate],
  );

  return (
    <Card>
      <h2 className="text-lg font-semibold">Lumpsum Return Calculator</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Compound growth of a one-time investment.
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <Field label="Investment amount" value={amount} onChange={setAmount} min={0} />
          <Field label="Duration (years)" value={years} onChange={setYears} min={0} suffix="yrs" />
          <Field label="Expected return rate" value={rate} onChange={setRate} suffix="% p.a." />
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
          <Stat label="Invested" value={fmtCurrency(amount, currency, { maximumFractionDigits: 0 })} />
          <Stat label="Est. returns" value={fmtCurrency(gain, currency, { maximumFractionDigits: 0 })} />
          <Stat label="Future value" value={fmtCurrency(future, currency, { maximumFractionDigits: 0 })} />
        </div>
      </Grid>
    </Card>
  );
}

/* ---------------------------------- EMI ---------------------------------- */

function EMICalculator() {
  const [principal, setPrincipal] = useState(2500000);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  const [currency, setCurrency] = useState("INR");

  const { emi, total, interest } = useMemo(
    () => calculateEMI(principal, rate, years),
    [principal, rate, years],
  );

  return (
    <Card>
      <h2 className="text-lg font-semibold">EMI Calculator</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Monthly instalment for a fixed-rate loan.
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <Field label="Loan amount" value={principal} onChange={setPrincipal} min={0} />
          <Field label="Interest rate" value={rate} onChange={setRate} suffix="% p.a." />
          <Field label="Tenure" value={years} onChange={setYears} min={0} suffix="yrs" />
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
          <Stat label="Monthly EMI" value={fmtCurrency(emi, currency, { maximumFractionDigits: 0 })} />
          <Stat label="Total interest" value={fmtCurrency(interest, currency, { maximumFractionDigits: 0 })} />
          <Stat label="Total payable" value={fmtCurrency(total, currency, { maximumFractionDigits: 0 })} />
        </div>
      </Grid>
    </Card>
  );
}

/* --------------------------- Gold/Silver invest -------------------------- */

function MetalCalculator({ data }: { data: MarketSnapshot }) {
  const [metal, setMetal] = useState<"XAU" | "XAG" | "XPT">("XAU");
  const [amount, setAmount] = useState(50000);
  const [years, setYears] = useState(5);
  const [growth, setGrowth] = useState(8);
  const [currency, setCurrency] = useState("INR");

  const spotUsdOz = data.metals[metal];
  const fx = data.rates.rates[currency] ?? 1;

  if (!Number.isFinite(spotUsdOz) || spotUsdOz <= 0) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Gold / Silver Investment Calculator</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live spot prices are temporarily unavailable. Please try again shortly.
        </p>
      </Card>
    );
  }

  const pricePerOz = spotUsdOz * fx;
  const pricePerGram = pricePerOz / GRAMS_PER_TROY_OUNCE;
  const { grams, futureValue, gain } = calculateMetalGrams(amount, spotUsdOz, fx, 1, growth, years);

  const label = { XAU: "Gold", XAG: "Silver", XPT: "Platinum" }[metal];

  return (
    <Card>
      <h2 className="text-lg font-semibold">Gold / Silver Investment Calculator</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Uses live spot: 1 g {label} ≈ {fmtCurrency(pricePerGram, currency, { maximumFractionDigits: 2 })}
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Metal</Label>
            <Select value={metal} onValueChange={(v) => setMetal(v as "XAU" | "XAG" | "XPT")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="XAU">Gold (24K)</SelectItem>
                <SelectItem value="XAG">Silver</SelectItem>
                <SelectItem value="XPT">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Investment amount" value={amount} onChange={setAmount} min={0} />
          <Field label="Holding period" value={years} onChange={setYears} min={0} suffix="yrs" />
          <Field label="Assumed appreciation" value={growth} onChange={setGrowth} suffix="% p.a." />
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
          <Stat label={`${label} purchased`} value={`${fmtNumber(grams, 3)} g`} />
          <Stat label="Est. gain" value={fmtCurrency(gain, currency, { maximumFractionDigits: 0 })} />
          <Stat label="Future value" value={fmtCurrency(futureValue, currency, { maximumFractionDigits: 0 })} />
        </div>
      </Grid>
    </Card>
  );
}

/* ------------------------------- Inflation ------------------------------- */

function InflationCalculator() {
  const [amount, setAmount] = useState(100000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(6);
  const [currency, setCurrency] = useState("INR");

  const { future, purchasingPower } = calculateInflation(amount, years, rate);

  return (
    <Card>
      <h2 className="text-lg font-semibold">Inflation Calculator</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        How prices rise and money's real value shrinks over time.
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <Field label="Current amount" value={amount} onChange={setAmount} min={0} />
          <Field label="Years ahead" value={years} onChange={setYears} min={0} suffix="yrs" />
          <Field label="Inflation rate" value={rate} onChange={setRate} suffix="% p.a." />
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1">
          <Stat
            label={`Equivalent cost in ${years} yrs`}
            value={fmtCurrency(future, currency, { maximumFractionDigits: 0 })}
          />
          <Stat
            label="Real value of today's money"
            value={fmtCurrency(purchasingPower, currency, { maximumFractionDigits: 0 })}
          />
        </div>
      </Grid>
    </Card>
  );
}

/* --------------------------- Currency Converter -------------------------- */

function CurrencyConverter({ data }: { data: MarketSnapshot }) {
  const [amount, setAmount] = useState(1000);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");

  const codes = useMemo(
    () => Array.from(new Set(["USD", ...Object.keys(data.rates.rates)])).sort(),
    [data.rates],
  );

  // rates are quoted vs USD (rates[USD] = 1). Convert via USD.
  const fromRate = from === "USD" ? 1 : data.rates.rates[from];
  const toRate = to === "USD" ? 1 : data.rates.rates[to];
  const converted =
    Number.isFinite(fromRate) && Number.isFinite(toRate) && fromRate > 0
      ? (amount / fromRate) * toRate
      : NaN;
  const perUnit = Number.isFinite(fromRate) && fromRate > 0 ? toRate / fromRate : NaN;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold">Currency Converter</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Live FX from {data.ratesSource}.
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <Field label="Amount" value={amount} onChange={setAmount} min={0} />
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">From</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {codes.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={swap}
              className="mb-0.5 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-alt hover:bg-accent"
              aria-label="Swap"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">To</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {codes.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3">
          <Stat
            label={`${fmtNumber(amount, 2)} ${from} =`}
            value={
              Number.isFinite(converted)
                ? fmtCurrency(converted, to, { maximumFractionDigits: 2 })
                : "—"
            }
          />
          <Stat
            label="Rate"
            value={
              Number.isFinite(perUnit)
                ? `1 ${from} = ${fmtNumber(perUnit, 4)} ${to}`
                : "—"
            }
          />
        </div>
      </Grid>
    </Card>
  );
}

/* ------------------------------- Step-up SIP ------------------------------ */

function StepUpSIPCalculator() {
  const [monthly, setMonthly] = useState(10000);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(12);
  const [stepUp, setStepUp] = useState(10);
  const [currency, setCurrency] = useState("INR");

  const { invested, future, gain } = useMemo(
    () => calculateStepUpSIP(monthly, years, rate, stepUp),
    [monthly, years, rate, stepUp],
  );

  return (
    <Card>
      <h2 className="text-lg font-semibold">Step-up SIP Calculator</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        SIP where your monthly investment increases every year — closer to how income (and savings)
        actually grow.
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <Field label="Starting monthly investment" value={monthly} onChange={setMonthly} min={0} />
          <Field label="Annual step-up" value={stepUp} onChange={setStepUp} min={0} suffix="% p.a." />
          <Field label="Duration (years)" value={years} onChange={setYears} min={0} suffix="yrs" />
          <Field label="Expected return rate" value={rate} onChange={setRate} suffix="% p.a." />
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
          <Stat label="Invested" value={fmtCurrency(invested, currency, { maximumFractionDigits: 0 })} />
          <Stat label="Est. returns" value={fmtCurrency(gain, currency, { maximumFractionDigits: 0 })} />
          <Stat label="Future value" value={fmtCurrency(future, currency, { maximumFractionDigits: 0 })} />
        </div>
      </Grid>
    </Card>
  );
}

/* --------------------------------- FD / RD --------------------------------- */

const COMPOUNDING_OPTIONS = [
  { id: "annually", label: "Annually", n: 1 },
  { id: "halfyearly", label: "Half-yearly", n: 2 },
  { id: "quarterly", label: "Quarterly", n: 4 },
  { id: "monthly", label: "Monthly", n: 12 },
];

function FDRDCalculator() {
  const [mode, setMode] = useState<"fd" | "rd">("fd");
  const [currency, setCurrency] = useState("INR");
  const [rate, setRate] = useState(7);
  const [years, setYears] = useState(5);

  // FD-only
  const [principal, setPrincipal] = useState(100000);
  const [compounding, setCompounding] = useState("quarterly");

  // RD-only
  const [monthly, setMonthly] = useState(5000);

  const fdResult = useMemo(() => {
    const freq = COMPOUNDING_OPTIONS.find((c) => c.id === compounding)?.n ?? 4;
    return calculateFD(principal, rate, years, freq);
  }, [principal, rate, years, compounding]);

  const rdResult = useMemo(
    () => calculateRD(monthly, rate, years),
    [monthly, rate, years],
  );

  const result = mode === "fd" ? fdResult : rdResult;

  return (
    <Card>
      <h2 className="text-lg font-semibold">Fixed / Recurring Deposit Calculator</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Maturity value for a bank FD (lump sum) or RD (monthly deposits).
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Deposit type</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "fd" | "rd")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fd">Fixed Deposit (lump sum)</SelectItem>
                <SelectItem value="rd">Recurring Deposit (monthly)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "fd" ? (
            <>
              <Field label="Deposit amount" value={principal} onChange={setPrincipal} min={0} />
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Compounding</Label>
                <Select value={compounding} onValueChange={setCompounding}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPOUNDING_OPTIONS.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <Field label="Monthly deposit" value={monthly} onChange={setMonthly} min={0} />
          )}

          <Field label="Interest rate" value={rate} onChange={setRate} suffix="% p.a." />
          <Field label="Tenure" value={years} onChange={setYears} min={0} suffix="yrs" />
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
          <Stat label="Invested" value={fmtCurrency(result.invested, currency, { maximumFractionDigits: 0 })} />
          <Stat label="Interest earned" value={fmtCurrency(result.interest, currency, { maximumFractionDigits: 0 })} />
          <Stat label="Maturity value" value={fmtCurrency(result.maturity, currency, { maximumFractionDigits: 0 })} />
        </div>
        {mode === "rd" ? (
          <p className="mt-3 text-[11px] text-muted-foreground md:col-span-2">
            Estimated with monthly compounding — most Indian banks compound RDs quarterly, so actual
            maturity may differ slightly from your passbook.
          </p>
        ) : null}
      </Grid>
    </Card>
  );
}

/* ---------------------------------- PPF ------------------------------------ */

function PPFCalculator() {
  const [yearly, setYearly] = useState(150000);
  const [rate, setRate] = useState(7.1);
  const [years, setYears] = useState(15);

  const { invested, maturity, interest } = useMemo(
    () => calculatePPF(yearly, rate, years),
    [yearly, rate, years],
  );

  return (
    <Card>
      <h2 className="text-lg font-semibold">PPF Calculator</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Public Provident Fund — India's government-backed, tax-free 15-year savings scheme (extendable
        in 5-year blocks). Uses a sample rate; check the current PPF rate before relying on this.
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <Field
            label="Yearly contribution"
            value={yearly}
            onChange={setYearly}
            min={0}
            suffix="₹/yr"
          />
          <Field label="PPF interest rate" value={rate} onChange={setRate} suffix="% p.a." />
          <Field label="Duration" value={years} onChange={setYears} min={15} suffix="yrs" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
          <Stat label="Total contributed" value={fmtCurrency(invested, "INR", { maximumFractionDigits: 0 })} />
          <Stat label="Interest earned" value={fmtCurrency(interest, "INR", { maximumFractionDigits: 0 })} />
          <Stat label="Maturity value" value={fmtCurrency(maturity, "INR", { maximumFractionDigits: 0 })} />
        </div>
      </Grid>
    </Card>
  );
}

/* ----------------------------------- GST (India) ----------------------------------- */

const GST_PRESETS = [
  { id: "in5", label: "5%", rate: 5 },
  { id: "in12", label: "12%", rate: 12 },
  { id: "in18", label: "18%", rate: 18 },
  { id: "in28", label: "28%", rate: 28 },
  { id: "custom", label: "Custom rate", rate: -1 },
];

function GSTCalculator() {
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState(10000);
  const [preset, setPreset] = useState("in18");
  const [customRate, setCustomRate] = useState(18);

  const rate = preset === "custom" ? customRate : GST_PRESETS.find((p) => p.id === preset)?.rate ?? 18;

  const { base, tax: gstAmount, total } = useMemo(
    () => calculateTax(amount, rate, direction),
    [amount, rate, direction],
  );

  return (
    <Card>
      <h2 className="text-lg font-semibold">GST Calculator</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add India GST to a base amount, or work out the base amount from a GST-inclusive price.
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as "add" | "remove")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add GST to amount</SelectItem>
                <SelectItem value="remove">Remove GST (amount is inclusive)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field
            label={direction === "add" ? "Base amount" : "GST-inclusive amount"}
            value={amount}
            onChange={setAmount}
            min={0}
          />
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">GST slab</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GST_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {preset === "custom" ? (
            <Field label="Custom rate" value={customRate} onChange={setCustomRate} min={0} suffix="%" />
          ) : null}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
          <Stat label="Base amount" value={fmtCurrency(base, "INR", { maximumFractionDigits: 2 })} />
          <Stat label={`GST (${fmtNumber(rate, 0)}%)`} value={fmtCurrency(gstAmount, "INR", { maximumFractionDigits: 2 })} />
          <Stat label="Total" value={fmtCurrency(total, "INR", { maximumFractionDigits: 2 })} />
        </div>
      </Grid>
    </Card>
  );
}

/* ------------------------------------ VAT (General) --------------------------------- */

const VAT_PRESETS = [
  { id: "ae5", label: "UAE · 5%", rate: 5 },
  { id: "gb20", label: "UK · 20%", rate: 20 },
  { id: "eu19", label: "EU (DE) · 19%", rate: 19 },
  { id: "custom", label: "Custom rate", rate: -1 },
];

function VATCalculator() {
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [amount, setAmount] = useState(10000);
  const [preset, setPreset] = useState("ae5");
  const [customRate, setCustomRate] = useState(5);
  const [currency, setCurrency] = useState("AED");

  const rate = preset === "custom" ? customRate : VAT_PRESETS.find((p) => p.id === preset)?.rate ?? 5;

  const { base, tax: vatAmount, total } = useMemo(
    () => calculateTax(amount, rate, direction),
    [amount, rate, direction],
  );

  return (
    <Card>
      <h2 className="text-lg font-semibold">VAT Calculator</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Add VAT to a base amount, or work out the base amount from a VAT-inclusive price.
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as "add" | "remove")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Add VAT to amount</SelectItem>
                <SelectItem value="remove">Remove VAT (amount is inclusive)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field
            label={direction === "add" ? "Base amount" : "VAT-inclusive amount"}
            value={amount}
            onChange={setAmount}
            min={0}
          />
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">VAT rate</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {VAT_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {preset === "custom" ? (
            <Field label="Custom rate" value={customRate} onChange={setCustomRate} min={0} suffix="%" />
          ) : null}
          <CurrencyPicker value={currency} onChange={setCurrency} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
          <Stat label="Base amount" value={fmtCurrency(base, currency, { maximumFractionDigits: 2 })} />
          <Stat label={`VAT (${fmtNumber(rate, 0)}%)`} value={fmtCurrency(vatAmount, currency, { maximumFractionDigits: 2 })} />
          <Stat label="Total" value={fmtCurrency(total, currency, { maximumFractionDigits: 2 })} />
        </div>
      </Grid>
    </Card>
  );
}

/* ------------------------------- Fuel Cost ---------------------------------- */

function FuelCostCalculator({ data }: { data: MarketSnapshot }) {
  const [country, setCountry] = useState<CountryCode>("IN");
  const [fuelType, setFuelType] = useState<"petrol" | "diesel">("petrol");
  const [mileage, setMileage] = useState(15);
  const [dailyDistance, setDailyDistance] = useState(40);
  const [daysPerMonth, setDaysPerMonth] = useState(24);

  const def = COUNTRIES[country];
  const distanceUnit = def.fuelVolumeUnit === "gal" ? "mi" : "km";
  const volumeUnit = def.fuelVolumeUnit === "gal" ? "gal" : "L";

  const { pricePerUnit, monthlyCost, yearlyCost, volumePerMonth } = useMemo(() => {
    const fx = data.rates.rates[def.currency] ?? NaN;
    const crudeLocal = data.crude.pricePerBarrelUSD * fx;
    const spread = FUEL_SPREAD[country];
    const crudePerUnit = def.fuelVolumeUnit === "gal" ? crudeLocal / 42 : crudeLocal / 159;

    const derived = Number.isFinite(crudePerUnit) && crudePerUnit > 0
      ? crudePerUnit * spread[fuelType]
      : NaN;
    const fallback = FUEL_REFERENCE[country][fuelType];
    const pricePerUnit = Number.isFinite(derived) && derived > 0 ? derived : fallback;

    const { volumePerMonth, monthlyCost, yearlyCost } = calculateFuelCost(
      pricePerUnit,
      mileage,
      dailyDistance,
      daysPerMonth,
    );

    return { pricePerUnit, monthlyCost, yearlyCost, volumePerMonth };
  }, [country, fuelType, mileage, dailyDistance, daysPerMonth, data, def]);

  return (
    <Card>
      <h2 className="text-lg font-semibold">Fuel Cost Calculator</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Estimated monthly commute cost from today's live crude-derived {fuelType} price.
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Country</Label>
            <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRY_ORDER.map((c) => (
                  <SelectItem key={c} value={c}>{COUNTRIES[c].flag} {COUNTRIES[c].name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Fuel type</Label>
            <Select value={fuelType} onValueChange={(v) => setFuelType(v as "petrol" | "diesel")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="petrol">Petrol</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field
            label={`Mileage (${distanceUnit}/${volumeUnit})`}
            value={mileage}
            onChange={setMileage}
            min={0}
          />
          <Field
            label={`Daily distance (${distanceUnit})`}
            value={dailyDistance}
            onChange={setDailyDistance}
            min={0}
          />
          <Field label="Days driven per month" value={daysPerMonth} onChange={setDaysPerMonth} min={0} max={31} />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
          <Stat
            label={`${fuelType[0].toUpperCase()}${fuelType.slice(1)} price`}
            value={`${fmtCurrency(pricePerUnit, def.currency, { maximumFractionDigits: 2 })}/${volumeUnit}`}
          />
          <Stat
            label={`${volumeUnit} used / month`}
            value={Number.isFinite(volumePerMonth) ? `${fmtNumber(volumePerMonth, 1)} ${volumeUnit}` : "—"}
          />
          <Stat label="Monthly cost" value={fmtCurrency(monthlyCost, def.currency, { maximumFractionDigits: 0 })} />
          <Stat label="Yearly cost" value={fmtCurrency(yearlyCost, def.currency, { maximumFractionDigits: 0 })} />
        </div>
      </Grid>
    </Card>
  );
}

/* ---------------------------- Mutual Fund Lookup (India) -------------------- */

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

function MutualFundLookup() {
  const searchFn = useServerFn(searchMutualFunds);
  const navFn = useServerFn(getMutualFundNav);

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounced(query, 350);
  const [results, setResults] = useState<{ schemeCode: number; schemeName: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selected, setSelected] = useState<{ schemeCode: number; schemeName: string } | null>(null);
  const [nav, setNav] = useState<
    | { schemeCode: number; schemeName: string; fundHouse?: string; nav: number; navDate: string; change: number; changePercent: number }
    | null
  >(null);
  const [navLoading, setNavLoading] = useState(false);
  const [navError, setNavError] = useState<string | null>(null);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setResults([]);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    searchFn({ data: { q } })
      .then((res) => {
        if (cancelled) return;
        setResults(res.data);
        if (res.data.length === 0) setSearchError("No matching schemes found.");
      })
      .catch((e) => {
        if (!cancelled) setSearchError(e instanceof Error ? e.message : "Search failed");
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const selectScheme = (s: { schemeCode: number; schemeName: string }) => {
    setSelected(s);
    setResults([]);
    setQuery(s.schemeName);
    setNav(null);
    setNavError(null);
    setNavLoading(true);
    navFn({ data: { schemeCode: s.schemeCode } })
      .then((res) => {
        if (!res.data) {
          setNavError("NAV data unavailable for this scheme.");
          return;
        }
        setNav(res.data);
      })
      .catch((e) => setNavError(e instanceof Error ? e.message : "Failed to load NAV"))
      .finally(() => setNavLoading(false));
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold">Mutual Fund NAV Lookup</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Search any AMFI-registered Indian mutual fund scheme for its latest NAV and day change.
        Data via AMFI (mfapi.in), updated daily.
      </p>
      <div className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Search by scheme name</Label>
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setNav(null);
              setNavError(null);
            }}
            placeholder="e.g. HDFC Top 100, Parag Parikh Flexi Cap..."
          />
        </div>

        {searching ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
        {searchError && !selected ? <p className="text-xs text-muted-foreground">{searchError}</p> : null}

        {results.length > 0 && !selected ? (
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            {results.map((r) => (
              <button
                key={r.schemeCode}
                type="button"
                onClick={() => selectScheme(r)}
                className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-surface-alt"
              >
                {r.schemeName}
              </button>
            ))}
          </div>
        ) : null}

        {navLoading ? <p className="text-sm text-muted-foreground">Loading NAV…</p> : null}
        {navError ? <p className="text-sm text-muted-foreground">{navError}</p> : null}

        {nav ? (
          <div className="rounded-xl border border-border bg-surface-alt p-4">
            <p className="text-sm font-semibold text-foreground">{nav.schemeName}</p>
            {nav.fundHouse ? <p className="text-xs text-muted-foreground">{nav.fundHouse}</p> : null}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Latest NAV" value={fmtCurrency(nav.nav, "INR", { maximumFractionDigits: 2 })} />
              <Stat
                label="Day change"
                value={`${nav.changePercent >= 0 ? "+" : ""}${fmtNumber(nav.changePercent, 2)}%`}
              />
              <Stat label="As of" value={nav.navDate} />
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/* -------------------------------- Mortgage (US) ------------------------------ */

function MortgageCalculator() {
  const [homePrice, setHomePrice] = useState(400000);
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [rate, setRate] = useState(6.5);
  const [years, setYears] = useState(30);
  const [propertyTaxPct, setPropertyTaxPct] = useState(1.1);
  const [annualInsurance, setAnnualInsurance] = useState(1500);
  const [pmiPct, setPmiPct] = useState(0.5);

  const result = useMemo(
    () => calculateMortgage(homePrice, downPaymentPct, rate, years, propertyTaxPct, annualInsurance, pmiPct),
    [homePrice, downPaymentPct, rate, years, propertyTaxPct, annualInsurance, pmiPct],
  );

  return (
    <Card>
      <h2 className="text-lg font-semibold">Mortgage Calculator (US)</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Estimated monthly payment including principal, interest, property tax, homeowner's insurance,
        and PMI if your down payment is under 20%.
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <Field label="Home price" value={homePrice} onChange={setHomePrice} min={0} suffix="$" />
          <Field label="Down payment" value={downPaymentPct} onChange={setDownPaymentPct} min={0} max={100} suffix="%" />
          <Field label="Interest rate" value={rate} onChange={setRate} suffix="% APR" />
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Loan term</Label>
            <Select value={String(years)} onValueChange={(v) => setYears(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 years</SelectItem>
                <SelectItem value="20">20 years</SelectItem>
                <SelectItem value="30">30 years</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field label="Property tax" value={propertyTaxPct} onChange={setPropertyTaxPct} suffix="%/yr" />
          <Field label="Home insurance" value={annualInsurance} onChange={setAnnualInsurance} min={0} suffix="$/yr" />
          {downPaymentPct < 20 ? (
            <Field label="PMI rate" value={pmiPct} onChange={setPmiPct} min={0} suffix="%/yr" />
          ) : null}
        </div>
        <div className="mt-4 space-y-3">
          <Stat label="Loan amount" value={fmtCurrency(result.loanAmount, "USD", { maximumFractionDigits: 0 })} />
          <Stat label="Principal & interest" value={`${fmtCurrency(result.principalAndInterest, "USD", { maximumFractionDigits: 0 })}/mo`} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="Tax/mo" value={fmtCurrency(result.monthlyTax, "USD", { maximumFractionDigits: 0 })} />
            <Stat label="Insurance/mo" value={fmtCurrency(result.monthlyInsurance, "USD", { maximumFractionDigits: 0 })} />
            <Stat label="PMI/mo" value={fmtCurrency(result.monthlyPMI, "USD", { maximumFractionDigits: 0 })} />
          </div>
          <div className="rounded-xl border border-border bg-surface-alt p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-foreground">Total monthly payment</span>
              <span className="font-mono text-lg font-bold text-foreground">
                {fmtCurrency(result.totalMonthly, "USD", { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
          <Stat label="Total interest over loan term" value={fmtCurrency(result.totalInterest, "USD", { maximumFractionDigits: 0 })} />
        </div>
      </Grid>
    </Card>
  );
}

/* ------------------------------- 401(k) (US) --------------------------------- */

function Retirement401kCalculator() {
  const [currentAge, setCurrentAge] = useState(30);
  const [retireAge, setRetireAge] = useState(65);
  const [currentBalance, setCurrentBalance] = useState(20000);
  const [salary, setSalary] = useState(80000);
  const [contributionPct, setContributionPct] = useState(6);
  const [employerMatchPct, setEmployerMatchPct] = useState(3);
  const [returnRate, setReturnRate] = useState(7);

  const result = useMemo(
    () => calculate401k(currentAge, retireAge, currentBalance, salary, contributionPct, employerMatchPct, returnRate),
    [currentAge, retireAge, currentBalance, salary, contributionPct, employerMatchPct, returnRate],
  );

  return (
    <Card>
      <h2 className="text-lg font-semibold">401(k) Retirement Calculator (US)</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Projects your 401(k) balance at retirement, including employer match (up to your contribution
        rate, matched at the rate you specify).
      </p>
      <Grid>
        <div className="mt-4 space-y-4">
          <Field label="Current age" value={currentAge} onChange={setCurrentAge} min={16} max={100} />
          <Field label="Retirement age" value={retireAge} onChange={setRetireAge} min={16} max={100} />
          <Field label="Current 401(k) balance" value={currentBalance} onChange={setCurrentBalance} min={0} suffix="$" />
          <Field label="Annual salary" value={salary} onChange={setSalary} min={0} suffix="$/yr" />
          <Field label="Your contribution" value={contributionPct} onChange={setContributionPct} min={0} max={100} suffix="% of salary" />
          <Field label="Employer match" value={employerMatchPct} onChange={setEmployerMatchPct} min={0} max={100} suffix="% of salary" />
          <Field label="Expected annual return" value={returnRate} onChange={setReturnRate} suffix="%" />
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
          <Stat label="Your contributions (incl. starting balance)" value={fmtCurrency(result.totalContributed, "USD", { maximumFractionDigits: 0 })} />
          <Stat label="Employer match total" value={fmtCurrency(result.totalEmployerMatch, "USD", { maximumFractionDigits: 0 })} />
          <Stat label={`Projected balance at age ${retireAge}`} value={fmtCurrency(result.corpus, "USD", { maximumFractionDigits: 0 })} />
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground md:col-span-2">
          Simplified projection — doesn't account for annual contribution limit caps, salary growth, or
          fees. Check IRS.gov for current 401(k) contribution limits before relying on this.
        </p>
      </Grid>
    </Card>
  );
}

/* ------------------------------ Currency select --------------------------- */

const COMMON_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "JPY", "CNY", "AUD", "CAD"];

function CurrencyPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">Currency</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {COMMON_CURRENCIES.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

