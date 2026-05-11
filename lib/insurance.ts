import type { InsuranceQuote, FetchQuotesParams } from "@/types";

// ─── Profile shape (everything Claude can stuff into <fetch_quotes>) ───

interface UserProfile {
  state?: string;
  zip_code?: string;
  city?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  age?: number;
  home_value?: number;
  coverage_amount?: number;
  currently_insured?: boolean;
  current_insurer?: string;
  vehicle_count?: number;
  single_family?: boolean;
  months_insured?: number;
  military_service?: boolean;
}

// ─── Provider universe by state ───

const providersByState: Record<string, string[]> = {
  FL: ["Citizens", "Progressive", "State Farm"],
  CA: ["Lemonade", "Farmers", "Mercury"],
  TX: ["State Farm", "Allstate", "Progressive"],
  NY: ["Lemonade", "State Farm", "Travelers"],
  DEFAULT: ["Lemonade", "Progressive", "State Farm"],
};

// Coastal / catastrophe-exposed states get a regional uplift
const HIGH_RISK_STATES = new Set([
  "FL",
  "LA",
  "MS",
  "AL",
  "GA",
  "NC",
  "SC",
  "TX",
  "CA",
]);

// ─── Coverage calculator ───

function calculateCoverage(profile: UserProfile) {
  return {
    dwelling: profile.home_value
      ? Math.round(profile.home_value / 50000) * 50000
      : 250000,
    liability: (profile.home_value ?? 0) > 500000 ? 300000 : 100000,
    deductible: profile.age && profile.age < 30 ? 1500 : 1000,
  };
}

// ─── Price calculator (the function that was missing) ───

function calculateMockPrice(basePrice: number, profile: UserProfile): number {
  let price = basePrice;

  // Home value is the biggest driver
  if (profile.home_value) {
    const factor = profile.home_value / 300000; // 300K = neutral baseline
    price = price * Math.pow(factor, 0.7); // dampened scaling so $1M ≠ 3.3x
  }

  // Younger holders pay more
  if (profile.age) {
    if (profile.age < 25) price *= 1.25;
    else if (profile.age < 30) price *= 1.1;
    else if (profile.age >= 60) price *= 0.95;
  }

  // Loyalty discount
  if (profile.currently_insured) price *= 0.92;

  // Catastrophe-state uplift
  const stateUC = (profile.state ?? "").toUpperCase();
  if (HIGH_RISK_STATES.has(stateUC)) price *= 1.15;

  // Military discount
  if (profile.military_service) price *= 0.9;

  // Single-family vs condo/townhome
  if (profile.single_family === false) price *= 0.85;

  // Round to nearest dollar so the UI looks clean
  return Math.max(15, Math.round(price));
}

// ─── Provider metadata ───

interface ProviderMeta {
  basePrice: number;
  rating: number;
  claimsRating: "Excellent" | "Good" | "Fair";
  highlights: (profile: UserProfile) => string[];
  urlBuilder: (zip: string, state: string, coverage: number) => string;
  logo: string;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";
  return (
    "?" +
    entries
      .map(
        ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      )
      .join("&")
  );
};

const PROVIDER_META: Record<string, ProviderMeta> = {
  Lemonade: {
    basePrice: 45,
    rating: 4.3,
    claimsRating: "Good",
    logo: "/logos/lemonade.svg",
    highlights: () => [
      "Instant claims via app",
      "Certified B Corp",
      "Quote pre-filled with your info",
    ],
    urlBuilder: (zip, state, coverage) =>
      "https://www.lemonade.com/homeowners" +
      qs({ zip, state, coverage, utm_source: "alto", utm_medium: "ai_chat" }),
  },
  Progressive: {
    basePrice: 50,
    rating: 4.1,
    claimsRating: "Excellent",
    logo: "/logos/progressive.svg",
    highlights: () => [
      "Bundle discount with auto",
      "24/7 claims support",
      "Pre-filled quote form",
    ],
    urlBuilder: (zip, state, coverage) =>
      "https://www.progressive.com/homeowners/quote/" +
      qs({
        zip,
        state,
        coverage_amount: coverage,
        utm_source: "alto",
        utm_medium: "ai_chat",
      }),
  },
  "State Farm": {
    basePrice: 58,
    rating: 4.5,
    claimsRating: "Excellent",
    logo: "/logos/statefarm.svg",
    highlights: () => [
      "Lower deductible options",
      "Local agent support",
      "Longest track record",
    ],
    urlBuilder: (zip, state) =>
      "https://www.statefarm.com/insurance/home-and-property/homeowners" +
      qs({ zip, state, utm_source: "alto", utm_medium: "ai_chat" }),
  },
  Citizens: {
    basePrice: 72,
    rating: 3.9,
    claimsRating: "Fair",
    logo: "/logos/citizens.svg",
    highlights: () => [
      "FL state-backed insurer of last resort",
      "Coverage available when private market won't bind",
      "Hurricane-aware pricing",
    ],
    urlBuilder: (zip, state) =>
      "https://www.citizensfla.com/quote-application" +
      qs({ zip, state, utm_source: "alto" }),
  },
  Farmers: {
    basePrice: 55,
    rating: 4.2,
    claimsRating: "Good",
    logo: "/logos/farmers.svg",
    highlights: () => [
      "Quote-and-bind in 10 minutes",
      "Smart Plan flexibility",
      "Strong CA wildfire underwriting",
    ],
    urlBuilder: (zip, state, coverage) =>
      "https://www.farmers.com/homeowners-insurance/quote/" +
      qs({ zip, state, coverage_amount: coverage, utm_source: "alto" }),
  },
  Mercury: {
    basePrice: 48,
    rating: 4.0,
    claimsRating: "Good",
    logo: "/logos/mercury.svg",
    highlights: () => [
      "CA-specialist pricing",
      "Multi-policy discount up to 15%",
      "Local agent network",
    ],
    urlBuilder: (zip, state, coverage) =>
      "https://www.mercuryinsurance.com/get-a-quote/homeowners" +
      qs({ zip, state, coverage_amount: coverage, utm_source: "alto" }),
  },
  Allstate: {
    basePrice: 56,
    rating: 4.2,
    claimsRating: "Good",
    logo: "/logos/allstate.svg",
    highlights: () => [
      "Claim Forgiveness on first claim",
      "Bundle savings with auto",
      "24/7 mobile claims",
    ],
    urlBuilder: (zip, state, coverage) =>
      "https://www.allstate.com/home-insurance/quote" +
      qs({ zip, state, coverage_amount: coverage, utm_source: "alto" }),
  },
  Travelers: {
    basePrice: 53,
    rating: 4.3,
    claimsRating: "Excellent",
    logo: "/logos/travelers.svg",
    highlights: () => [
      "Strong NY-market expertise",
      "Green-home rebuild upgrades",
      "Identity-fraud coverage included",
    ],
    urlBuilder: (zip, state, coverage) =>
      "https://www.travelers.com/home-insurance/quote" +
      qs({ zip, state, coverage_amount: coverage, utm_source: "alto" }),
  },
};

// ─── The function the chat route calls ───

export async function fetchInsuranceQuotes(
  params: FetchQuotesParams,
): Promise<InsuranceQuote[]> {
  const profile = (params.profile ?? {}) as UserProfile;

  // Debug: confirm profile is actually flowing through. If this logs `{}`
  // the bug is upstream — Claude isn't including profile fields in the
  // <fetch_quotes> JSON.
  console.log("[fetchInsuranceQuotes] userProfile at quote time:", profile);

  const state = (profile.state ?? "").toUpperCase();
  const zip = params.zip_code || profile.zip_code || "";
  const coverage = calculateCoverage(profile);

  const providerNames =
    providersByState[state] ?? providersByState.DEFAULT;

  const quotes: InsuranceQuote[] = providerNames
    .map((name) => {
      const meta = PROVIDER_META[name];
      if (!meta) return null;
      const monthlyPrice = calculateMockPrice(meta.basePrice, profile);
      return {
        provider: name,
        providerLogo: meta.logo,
        monthlyPrice,
        annualPrice: monthlyPrice * 12,
        coverage,
        highlights: meta.highlights(profile),
        applyUrl: meta.urlBuilder(zip, state, coverage.dwelling),
        rating: meta.rating,
        claimsRating: meta.claimsRating,
      } satisfies InsuranceQuote;
    })
    .filter((q): q is InsuranceQuote => q !== null);

  return quotes.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
}
