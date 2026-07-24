import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMarketSnapshot, type MarketSnapshot } from "@/lib/market.functions";
import { FUEL_SPREAD, FUEL_REFERENCE } from "@/lib/market-config";
import { calculateFuelCost } from "@/lib/calculators";
import { INDIA_CITIES, findCity } from "@/lib/india-cities";
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

export const Route = createFileRoute("/petrol-price/$city")({
  loader: async ({ context, params }) => {
    const city = findCity(params.city);
    if (!city) throw notFound();
    return context.queryClient.ensureQueryData(snapshotQuery(getMarketSnapshot));
  },
  head: ({ params }) => {
    const city = findCity(params.city);
    const cityName = city?.name ?? params.city;
    const title = `Petrol & Diesel Price Today in ${cityName} | MarketAtlas`;
    const description = `Today's petrol and diesel price in ${cityName}: live per-litre rates derived from crude oil trends, plus a monthly fuel cost estimate for a typical daily commute. Updated hourly.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `${SITE}/petrol-price/${params.city}` },
      ],
      links: [{ rel: "canonical", href: `${SITE}/petrol-price/${params.city}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              {
                "@type": "Question",
                name: `What is today's petrol price in ${cityName}?`,
                acceptedAnswer: { "@type": "Answer", text: description },
              },
            ],
          }),
        },
      ],
    };
  },
  component: PetrolPriceCityPage,
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

function PetrolPriceCityPage() {
  const params = Route.useParams();
  const city = findCity(params.city)!; // loader already threw notFound() if missing
  const fetcher = useServerFn(getMarketSnapshot);
  const { data } = useSuspenseQuery(snapshotQuery(fetcher));

  const fx = data.rates.rates.INR ?? 0;
  const crudeLocal = data.crude.pricePerBarrelUSD * fx;
  const crudePerLitre = crudeLocal / 159;
  const spread = FUEL_SPREAD.IN;

  const derivedPetrol = crudePerLitre * spread.petrol;
  const derivedDiesel = crudePerLitre * spread.diesel;
  const petrolPrice = Number.isFinite(derivedPetrol) && derivedPetrol > 0 ? derivedPetrol : FUEL_REFERENCE.IN.petrol;
  const dieselPrice = Number.isFinite(derivedDiesel) && derivedDiesel > 0 ? derivedDiesel : FUEL_REFERENCE.IN.diesel;

  // A typical commute — 40km/day, 15km/L — as a concrete "what this means
  // for me" number, using the same pure function the Fuel Cost calculator
  // itself uses (calculators.ts), so this figure always matches what that
  // calculator would show for the same inputs.
  const petrolMonthly = calculateFuelCost(petrolPrice, 15, 40, 26);
  const dieselMonthly = calculateFuelCost(dieselPrice, 18, 40, 26);

  const dateStr = new Date(data.fetchedAt).toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header showBackLink="dashboard" subtitle={`Petrol Price in ${city.name}`} />

      <main className="mx-auto max-w-4xl px-6 pb-16 py-10">
        <nav className="mb-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Petrol Price in {city.name}</span>
        </nav>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Petrol &amp; Diesel Price Today in {city.name}, {city.state}
        </h1>

        <p className="mt-4 text-lg leading-relaxed">
          Today's estimated petrol price in <strong>{city.name}</strong> is{" "}
          <strong>{fmtCurrency(petrolPrice, "INR", { maximumFractionDigits: 2 })} per litre</strong>, and diesel is{" "}
          <strong>{fmtCurrency(dieselPrice, "INR", { maximumFractionDigits: 2 })} per litre</strong>, as of {dateStr}.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full text-sm">
            <caption className="sr-only">Fuel price per litre in {city.name}</caption>
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Fuel</th>
                <th className="px-4 py-2 text-right font-medium">Price per litre</th>
                <th className="px-4 py-2 text-right font-medium">Est. monthly cost*</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border/40">
                <td className="px-4 py-2 font-medium">Petrol</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(petrolPrice, "INR", { maximumFractionDigits: 2 })}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(petrolMonthly.monthlyCost, "INR", { maximumFractionDigits: 0 })}</td>
              </tr>
              <tr className="border-t border-border/40">
                <td className="px-4 py-2 font-medium">Diesel</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(dieselPrice, "INR", { maximumFractionDigits: 2 })}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtCurrency(dieselMonthly.monthlyCost, "INR", { maximumFractionDigits: 0 })}</td>
              </tr>
            </tbody>
          </table>
          <p className="border-t border-border/40 px-4 py-2 text-xs text-muted-foreground">
            *Petrol estimate: 40km/day at 15 km/L. Diesel estimate: 40km/day at 18 km/L. 26 driving days/month.
            Use the <Link to="/resources" className="underline hover:text-foreground">Fuel Cost Calculator</Link> for your own numbers.
          </p>
        </div>

        <section className="mt-10 space-y-3 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">About this price</h2>
          <p>
            This is a single India-wide benchmark price, tracked against today's international crude oil trend —
            not a live feed of the exact pump price posted in {city.name} today. Real petrol and diesel prices in
            India vary meaningfully from state to state (sometimes by ₹5–10 per litre) because of state-level VAT,
            which this app doesn't yet have a per-state data source for. If you need the exact price at a specific
            pump, check your fuel retailer's app — treat this as a directional daily reference, not a quote.
          </p>
          <p>
            Petrol and diesel prices in India are also administratively revised by state oil marketing companies in
            occasional jumps rather than moving with crude every day, so on days crude has moved a lot since the
            last official revision, this estimate can drift from the actual posted price until the next revision
            catches up.
          </p>
        </section>

        <section className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6 text-sm">
          <Link to="/resources" className="text-primary underline">
            Fuel Cost Calculator
          </Link>
          <Link to="/gold-rate/$city" params={{ city: city.slug }} className="text-primary underline">
            Gold rate in {city.name}
          </Link>
          <Link to="/" className="text-primary underline">
            Live dashboard (all countries)
          </Link>
        </section>

        <section className="mt-10 border-t border-border pt-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Petrol price in other cities</h2>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
            {INDIA_CITIES.filter((c) => c.slug !== city.slug).map((c) => (
              <Link key={c.slug} to="/petrol-price/$city" params={{ city: c.slug }} className="text-muted-foreground hover:text-foreground hover:underline">
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <MobileNav currentPath={`/petrol-price/${city.slug}`} />
    </div>
  );
}
