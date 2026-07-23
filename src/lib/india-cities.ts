/**
 * Major Indian cities for the /gold-rate/$city landing pages. These pages
 * all show the same national/benchmark gold & silver rate — actual retail
 * price barely varies city to city beyond local making charges and
 * jeweller-association markups this app has no data source for. Serving
 * the same underlying rate under a city-specific URL is standard practice
 * across virtually every gold-rate site in India (people search "gold rate
 * today in <their city>" far more than the generic query), not a claim
 * that MarketAtlas has real city-differentiated pricing — the page itself
 * says so explicitly.
 */
export interface CityDef {
  slug: string;
  name: string;
  state: string;
}

export const GOLD_RATE_CITIES: CityDef[] = [
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

export function findCity(slug: string): CityDef | undefined {
  return GOLD_RATE_CITIES.find((c) => c.slug === slug.toLowerCase());
}
