import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { getMarketSnapshot, type MarketSnapshot } from "@/lib/market.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import { GRAMS_PER_TROY_OUNCE } from "@/lib/market-config";
import {
  Calculator,
  TrendingUp,
  Home,
  Coins,
  Flame,
  ArrowLeftRight,
  PiggyBank,
  RefreshCw,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { triggerSync } from "@/lib/market.functions";

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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Financial Calculators
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Powered by live rates from the MarketAtlas dashboard.
          </p>
        </div>

        <Tabs defaultValue="sip" className="w-full">
          <TabsList className="mb-6 flex h-auto w-full flex-wrap gap-1 bg-surface-alt p-1">
            <TabsTrigger value="sip" className="gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> SIP
            </TabsTrigger>
            <TabsTrigger value="lumpsum" className="gap-1.5">
              <PiggyBank className="h-3.5 w-3.5" /> Lumpsum
            </TabsTrigger>
            <TabsTrigger value="emi" className="gap-1.5">
              <Home className="h-3.5 w-3.5" /> EMI
            </TabsTrigger>
            <TabsTrigger value="metal" className="gap-1.5">
              <Coins className="h-3.5 w-3.5" /> Gold/Silver
            </TabsTrigger>
            <TabsTrigger value="inflation" className="gap-1.5">
              <Flame className="h-3.5 w-3.5" /> Inflation
            </TabsTrigger>
            <TabsTrigger value="fx" className="gap-1.5">
              <ArrowLeftRight className="h-3.5 w-3.5" /> Currency
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sip">
            <SIPCalculator />
          </TabsContent>
          <TabsContent value="lumpsum">
            <LumpsumCalculator />
          </TabsContent>
          <TabsContent value="emi">
            <EMICalculator />
          </TabsContent>
          <TabsContent value="metal">
            <MetalCalculator data={data} />
          </TabsContent>
          <TabsContent value="inflation">
            <InflationCalculator />
          </TabsContent>
          <TabsContent value="fx">
            <CurrencyConverter data={data} />
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}

/* =====================================================================
 * HEADER
 * ===================================================================== */

function Header() {
  return (
    <header className="border-b border-border bg-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-3">
          <Link to="/" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Market<span className="text-[color:var(--brand)]">Atlas</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/"
              title="Dashboard"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-white/5 text-white transition-colors hover:bg-white/10"
            >
              <Home className="h-4 w-4" />
            </Link>
            <ThemeToggle className="h-9 w-9 rounded-md border-white/20 bg-white/5 text-white hover:bg-white/10" />
            <SyncButton />
          </div>
        </div>
        <div className="mt-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/70">
            Resources
          </span>
        </div>
      </div>
    </header>
  );
}

/* =====================================================================
/* =====================================================================
 * SYNC BUTTON
 * ===================================================================== */

function SyncButton() {
  const queryClient = useQueryClient();
  const sync = useServerFn(triggerSync);
  const [syncing, setSyncing] = useState(false);

  const onSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await sync();
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["market-snapshot"] });
      }
    } catch {
      // ignore
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onSync}
      disabled={syncing}
      title="Force refresh from upstream APIs"
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground transition-colors hover:bg-surface-alt",
        syncing && "cursor-wait opacity-70",
      )}
    >
      <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
    </button>
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
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  step?: string;
  min?: number;
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
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(parseFloat(e.target.value))}
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

  const { invested, future, gain } = useMemo(() => {
    const n = years * 12;
    const r = rate / 100 / 12;
    const fv = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    const inv = monthly * n;
    return { invested: inv, future: fv, gain: fv - inv };
  }, [monthly, years, rate]);

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

  const { future, gain } = useMemo(() => {
    const fv = amount * Math.pow(1 + rate / 100, years);
    return { future: fv, gain: fv - amount };
  }, [amount, years, rate]);

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

  const { emi, total, interest } = useMemo(() => {
    const n = years * 12;
    const r = rate / 100 / 12;
    const e =
      r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const t = e * n;
    return { emi: e, total: t, interest: t - principal };
  }, [principal, rate, years]);

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
  const pricePerOz = spotUsdOz * fx;
  const pricePerGram = pricePerOz / GRAMS_PER_TROY_OUNCE;

  const grams = amount / pricePerGram;
  const futureValue = amount * Math.pow(1 + growth / 100, years);
  const gain = futureValue - amount;

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

  const future = amount * Math.pow(1 + rate / 100, years);
  const purchasingPower = amount / Math.pow(1 + rate / 100, years);

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

/* =====================================================================
 * FOOTER
 * ===================================================================== */

function Footer() {
  return (
    <footer className="mt-8 border-t border-border px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-2 text-[11px] text-muted-foreground">
        <div className="flex flex-col gap-1">
          <span className="font-medium">
            © MarketAtlas · built by{" "}
            <span className="font-semibold text-foreground">MAVIK group</span>
          </span>
          <span className="text-[10px]">
            It is a Global financial hub for common people developed using the Lovable platform.
          </span>
        </div>
      </div>
    </footer>
  );
}
