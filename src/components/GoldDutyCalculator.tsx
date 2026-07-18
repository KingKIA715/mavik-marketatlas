import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { fmtCurrency, fmtNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  COUNTRIES,
  COUNTRY_ORDER,
  GRAMS_PER_KG,
  GRAMS_PER_SOVEREIGN,
  GRAMS_PER_TOLA,
  GRAMS_PER_TROY_OUNCE,
  INDIA_GST,
  KARAT_PURITY,
  RETAIL_PREMIUM,
  type CountryCode,
} from "@/lib/market-config";

type WeightUnit = "gram" | "sovereign" | "tola" | "kg" | "ounce";

const UNIT_TO_GRAMS: Record<WeightUnit, number> = {
  gram: 1,
  sovereign: GRAMS_PER_SOVEREIGN,
  tola: GRAMS_PER_TOLA,
  kg: GRAMS_PER_KG,
  ounce: GRAMS_PER_TROY_OUNCE,
};

const UNIT_LABEL: Record<WeightUnit, string> = {
  gram: "Gram (g)",
  sovereign: "Sovereign / Pavan (8 g)",
  tola: "Tola (11.6638 g)",
  kg: "Kilogram (kg)",
  ounce: "Troy ounce (oz)",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** USD spot price per troy ounce for 24K gold (no duty, no GST). */
  spotUsdOz: number;
  /** USD → currency rate map (e.g. data.rates.rates from the snapshot). */
  usdRates: Record<string, number>;
  defaultCountry: CountryCode;
}

export function GoldDutyCalculator({ open, onOpenChange, spotUsdOz, usdRates, defaultCountry }: Props) {
  const [country, setCountry] = useState<CountryCode>(defaultCountry);
  const [karat, setKarat] = useState<24 | 22 | 18>(22);
  const [amount, setAmount] = useState("10");
  const [unit, setUnit] = useState<WeightUnit>("gram");
  const [includeGST, setIncludeGST] = useState(true);
  const [makingChargePct, setMakingChargePct] = useState("0");

  const def = COUNTRIES[country];
  const premiumMul = RETAIL_PREMIUM[country]?.XAU;
  const hasDutyModel = typeof premiumMul === "number";
  const fx = usdRates[def.currency];

  const result = useMemo(() => {
    const weightG = (Number(amount) || 0) * UNIT_TO_GRAMS[unit];
    const purity = KARAT_PURITY[karat] ?? 1;
    const makingPct = Math.max(0, Number(makingChargePct) || 0);

    if (!Number.isFinite(spotUsdOz) || !Number.isFinite(fx) || weightG <= 0) {
      return null;
    }

    const usdPerGram24K = spotUsdOz / GRAMS_PER_TROY_OUNCE;
    const localPerGram24K = usdPerGram24K * fx;
    const localPerGram = localPerGram24K * purity;

    const globalSpotValue = localPerGram * weightG; // before duty, before GST, before making
    const mul = premiumMul ?? 1;
    const dutyAmount = globalSpotValue * (mul - 1);
    const afterDuty = globalSpotValue * mul;

    const makingChargeAmount = afterDuty * (makingPct / 100);
    const taxableValue = afterDuty + makingChargeAmount;

    const gstRate = country === "IN" && includeGST ? INDIA_GST : 0;
    const gstAmount = taxableValue * gstRate;

    const total = taxableValue + gstAmount;

    return {
      weightG,
      globalSpotValue,
      dutyAmount,
      dutyPct: (mul - 1) * 100,
      makingChargeAmount,
      gstAmount,
      gstRate,
      total,
    };
  }, [amount, unit, karat, makingChargePct, spotUsdOz, fx, premiumMul, country, includeGST]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gold Landed-Cost Calculator</DialogTitle>
          <DialogDescription>
            Estimate what gold actually costs after import duty, GST and making charges — not just the
            global spot price.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Select value={country} onValueChange={(v) => setCountry(v as CountryCode)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {COUNTRIES[c].flag} {COUNTRIES[c].name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Purity</Label>
              <Select value={String(karat)} onValueChange={(v) => setKarat(Number(v) as 24 | 22 | 18)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24K (99.9%)</SelectItem>
                  <SelectItem value="22">22K (91.6%)</SelectItem>
                  <SelectItem value="18">18K (75%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Weight</Label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unit</Label>
              <Select value={unit} onValueChange={(v) => setUnit(v as WeightUnit)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(UNIT_LABEL) as WeightUnit[]).map((u) => (
                    <SelectItem key={u} value={u}>
                      {UNIT_LABEL[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Making charges (optional, % of duty-paid value)</Label>
            <Input
              type="number"
              inputMode="decimal"
              min="0"
              placeholder="0"
              value={makingChargePct}
              onChange={(e) => setMakingChargePct(e.target.value)}
              className="h-9"
            />
          </div>

          {country === "IN" ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 w-fit">
              <Switch id="calc-gst" checked={includeGST} onCheckedChange={setIncludeGST} />
              <Label htmlFor="calc-gst" className="cursor-pointer text-xs font-medium">
                Include 3% GST
              </Label>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-surface-alt p-4">
            {!result ? (
              <p className="text-sm text-muted-foreground">Enter a weight to see the breakdown.</p>
            ) : (
              <div className="space-y-2">
                <Row label="Global spot value" value={result.globalSpotValue} currency={def.currency} />
                {hasDutyModel ? (
                  <Row
                    label={`Import duty / premium (${fmtNumber(result.dutyPct, 1)}%)`}
                    value={result.dutyAmount}
                    currency={def.currency}
                  />
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    No import-duty data modeled for {def.name} yet — showing global spot only.
                  </p>
                )}
                {result.makingChargeAmount > 0 ? (
                  <Row label="Making charges" value={result.makingChargeAmount} currency={def.currency} />
                ) : null}
                {result.gstRate > 0 ? (
                  <Row
                    label={`GST (${fmtNumber(result.gstRate * 100, 0)}%)`}
                    value={result.gstAmount}
                    currency={def.currency}
                  />
                ) : null}
                <div className="my-1 border-t border-border" />
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-foreground">Total payable</span>
                  <span className="font-mono text-lg font-bold text-foreground">
                    {fmtCurrency(result.total, def.currency, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Simplified estimate from live spot price — actual invoices vary by jeweler, hallmarking
                  fees, and local tax rules.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, currency }: { label: string; value: number; currency: string }) {
  return (
    <div className={cn("flex items-baseline justify-between text-sm")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">
        {fmtCurrency(value, currency, { maximumFractionDigits: 0 })}
      </span>
    </div>
  );
}
