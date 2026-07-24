/**
 * Major Indian cities for city-specific landing pages (/gold-rate/$city,
 * /petrol-price/$city). These pages all show the same national/benchmark
 * rate — actual retail price barely varies city to city for gold beyond
 * local making charges and jeweller markups this app has no data source
 * for, and for fuel specifically, real city/state-level prices DO differ
 * meaningfully due to state VAT (which this app also doesn't have
 * per-state data for) — see FUEL_SPREAD's own comments in market-config.ts.
 * Serving the same underlying rate under a city-specific URL is standard
 * practice across virtually every gold-rate and fuel-price site in India
 * (people search "petrol price today in <their city>" far more than the
 * generic query), not a claim that MarketAtlas has real city-differentiated
 * pricing — every page using this list says so explicitly.
 */
export interface CityDef {
  slug: string;
  name: string;
  state: string;
}

export const INDIA_CITIES: CityDef[] = [
  { slug: "mumbai", name: "Mumbai", state: "Maharashtra" },
  { slug: "delhi", name: "Delhi", state: "Delhi" },
  { slug: "bangalore", name: "Bangalore", state: "Karnataka" },
  { slug: "chennai", name: "Chennai", state: "Tamil Nadu" },
  { slug: "kolkata", name: "Kolkata", state: "West Bengal" },
  { slug: "hyderabad", name: "Hyderabad", state: "Telangana" },
  { slug: "pune", name: "Pune", state: "Maharashtra" },
  { slug: "ahmedabad", name: "Ahmedabad", state: "Gujarat" },
  { slug: "jaipur", name: "Jaipur", state: "Rajasthan" },
  { slug: "lucknow", name: "Lucknow", state: "Uttar Pradesh" },
  { slug: "kanpur", name: "Kanpur", state: "Uttar Pradesh" },
  { slug: "nagpur", name: "Nagpur", state: "Maharashtra" },
  { slug: "indore", name: "Indore", state: "Madhya Pradesh" },
  { slug: "thane", name: "Thane", state: "Maharashtra" },
  { slug: "bhopal", name: "Bhopal", state: "Madhya Pradesh" },
  { slug: "visakhapatnam", name: "Visakhapatnam", state: "Andhra Pradesh" },
  { slug: "patna", name: "Patna", state: "Bihar" },
  { slug: "vadodara", name: "Vadodara", state: "Gujarat" },
  { slug: "ghaziabad", name: "Ghaziabad", state: "Uttar Pradesh" },
  { slug: "ludhiana", name: "Ludhiana", state: "Punjab" },
  { slug: "coimbatore", name: "Coimbatore", state: "Tamil Nadu" },
  { slug: "surat", name: "Surat", state: "Gujarat" },
  { slug: "kochi", name: "Kochi", state: "Kerala" },
  { slug: "chandigarh", name: "Chandigarh", state: "Chandigarh" },
];

/** @deprecated Use INDIA_CITIES — kept so the existing /gold-rate/$city page doesn't need touching. */
export const GOLD_RATE_CITIES = INDIA_CITIES;

export function findCity(slug: string): CityDef | undefined {
  return INDIA_CITIES.find((c) => c.slug === slug.toLowerCase());
}
