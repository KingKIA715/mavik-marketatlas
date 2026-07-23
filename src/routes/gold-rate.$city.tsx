import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMarketSnapshot, type MarketSnapshot } from "@/lib/market.functions";
import {
  KARAT_PURITY,
  GRAMS_PER_TROY_OUNCE,
  GRAMS_PER_SOVEREIGN,
  GRAMS_PER_TOLA,
  GRAMS_PER_KG,
  RETAIL_PREMIUM,
  INDIA_GST,
} from "@/lib/market-config";
import { GOLD_RATE_CITIES, findCity } from "@/lib/india-cities";
import { fmtCurrency } from "@/lib/format";
import { Header, Footer } from "@/components/Layout";
import { MobileNav } from "@/components/MobileNav";

const SITE = "https://mavik-marketatlas.lovable.app";

const snapshotQuery = (fetcher: () => Promise<MarketSnapshot>) =>
  queryOptions({
    queryKey: ["market-snapshot"],
    queryFn: fetcher,
    staleTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const Route = createFileRoute("/gold-rate/$city")({
  loader: async ({ context, params }) => {
    const city = findCity(params.city);
    if (!city) throw notFound();
    return context.queryClient.ensureQueryData(snapshotQuery(getMarketSnapshot));
  },
  head: ({ params }) => {
    const city = findCity(params.city);
    const cityName = city?.name ?? params.city;
    const title = `Gold Rate Today in ${cityName} — 22K & 24K Price Per Gram | MarketAtlas`;
    const description = `Today's gold rate in ${cityName}: live 24K, 22K, and 18K price per gram, per sovereign, and per tola, plus silver rate per gram and per kg. Updated hourly.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `${SITE}/gold-rate/${params.city}` },
      ],
      links: [{ rel: "canonical", href: `${SITE}/gold-rate/${params.city}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `What is today's gold rate in ${cityName}?`,
                acceptedAnswer: { "@type": "Answer", text: description },
              },
            ],
          }),
        },
      ],
    };
  },
  component: GoldRateCityPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold">City not found</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We don't have a dedicated page for that city yet.
      </p>
      <Link to="/" className="mt-6 inline-block text-primary underline">Back to dashboard</Link>
    </div>
  ),
});

function GoldRateCityPage() {
  const params = Route.useParams();
  const city = findCity(params.city)!; // loader already threw notFound() if missing
  const fetcher = useServerFn(getMarketSnapshot);
  const { data } = useSuspenseQuery(snapshotQuery(fetcher));

  const fx = data.rates.rates.INR ?? 0;
  const premium = RETAIL_PREMIUM.IN!;
  const goldPerGram24K = (data.metals.XAU / GRAMS_PER_TROY_OUNCE) * fx * premium.XAU;
  const silverPerGram = (data.metals.XAG / GRAMS_PER_TROY_OUNCE) * fx * premium.XAG;

  const karatRows = [24, 22, 18].map((k) => ({
    karat: k,
    perGram: goldPerGram24K * (KARAT_PURITY[k] ?? 1),
  }));
  const goldPerSovereign = goldPerGram24K * GRAMS_PER_SOVEREIGN * (KARAT_PURITY[22] ?? 1); // sovereign jewellery is conventionally 22K
  const goldPerTola = goldPerGram24K * GRAMS_PER_TOLA;
  const silverPerKg = silverPerGram * GRAMS_PER_KG;

  const goldWithGst22K = karatRows[1].perGram * (1 + INDIA_GST);

  const dateStr = new Date(data.fetchedAt).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header showBackLink="dashboard" subtitle={`Gold Rate in ${city.name}`} />

      <main className="mx-auto max-w-4xl px-6 pb-16 py-10">
        <nav className="mb-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Gold Rate in {city.name}</span>
        </nav>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Gold Rate Today in {city.name}, {city.state}
        </h1>

        {/* Featured-snippet-friendly: one unambiguous, bolded answer sentence right at the top, before any chart or table. */}
        <p className="mt-4 text-lg leading-relaxed">
          Today's gold rate in <strong>{city.name}</strong> is{" "}
          <strong>{fmtCurrency(karatRows[1].perGram, "INR", { maximumFractionDigits: 0 })} per gram for 22K gold</strong>{" "}
          and <strong>{fmtCurrency(karatRows[0].perGram, "INR", { maximumFractionDigits: 0 })} per gram for 24K gold</strong>, as of {dateStr}.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <caption className="sr-only">Gold rate per gram by purity in {city.name}</caption>
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Purity</th>
                <th className="px-4 py-2 text-right font-medium">Price per gram</th>
              </tr>
            </thead>
            <tbody>
              {karatRows.map((r) => (
                <tr key={r.karat} className="border-t border-border/40">
                  <td className="px-4 py-2 font-medium">{r.karat}K Gold</td>
                  <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(r.perGram, "INR", { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
              <tr className="border-t border-border/40">
                <td className="px-4 py-2 font-medium">22K Gold (1 sovereign / 8g)</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(goldPerSovereign, "INR", { maximumFractionDigits: 0 })}</td>
              </tr>
              <tr className="border-t border-border/40">
                <td className="px-4 py-2 font-medium">24K Gold (1 tola / 11.66g)</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(goldPerTola, "INR", { maximumFractionDigits: 0 })}</td>
              </tr>
              <tr className="border-t border-border/40">
                <td className="px-4 py-2 font-medium">22K Gold, incl. 3% GST (per gram)</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(goldWithGst22K, "INR", { maximumFractionDigits: 0 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="mt-10 text-xl font-semibold">Silver Rate Today in {city.name}</h2>
        <p className="mt-3">
          Silver is trading at <strong>{fmtCurrency(silverPerGram, "INR", { maximumFractionDigits: 2 })} per gram</strong>{" "}
          (<strong>{fmtCurrency(silverPerKg, "INR", { maximumFractionDigits: 0 })} per kg</strong>) in {city.name} today.
        </p>

        <section className="mt-10 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">About this rate</h2>
          <p>
            This is the benchmark gold and silver rate for India, applied uniformly across every city page on this
            site — actual price at a jeweller in {city.name} can differ slightly due to local making charges,
            jeweller-association markups, and city-specific taxes this app doesn't have a data source for. Treat
            this as a reliable daily reference point, not a specific shop's quoted price.
          </p>
          <p>
            Rates are derived from live international spot prices (COMEX gold and silver futures) converted to INR
            at the current exchange rate, with a retail premium applied to approximate Indian jewellery-market
            pricing. Updated hourly.
          </p>
        </section>

        <section className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6 text-sm">
          <Link to="/history/$symbol" params={{ symbol: "GC=F" }} className="text-primary underline">
            Full 10-year gold price history
          </Link>
          <Link to="/resources" className="text-primary underline">
            Gold investment &amp; GST calculators
          </Link>
          <Link to="/" className="text-primary underline">
            Live dashboard (all countries)
          </Link>
        </section>

        <section className="mt-10 border-t border-border pt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Gold rate in other cities</h2>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {GOLD_RATE_CITIES.filter((c) => c.slug !== city.slug).map((c) => (
              <Link key={c.slug} to="/gold-rate/$city" params={{ city: c.slug }} className="text-muted-foreground hover:text-foreground hover:underline">
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <MobileNav currentPath={`/gold-rate/${city.slug}`} />
    </div>
  );
}
