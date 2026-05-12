import type { InsuranceQuote, FetchQuotesParams } from "@/types";

// ─── User profile shape (everything Claude can put in <fetch_quotes>) ───

interface UserProfile {
  state?: string;
  zip_code?: string;
  city?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  age?: number;
  home_value?: number;
  home_age?: number;
  coverage_amount?: number;
  currently_insured?: boolean;
  current_insurer?: string;
  vehicle_count?: number;
  single_family?: boolean;
  months_insured?: number;
  military_service?: boolean;
}

// ─── Centralized provider ratings ────────────────────────────────────

interface ProviderRating {
  rating: number;
  claimsRating: "Excellent" | "Good" | "Fair";
  amBest: string;
}

const PROVIDER_RATINGS: Record<string, ProviderRating> = {
  Lemonade:     { rating: 4.3, claimsRating: "Good",      amBest: "A" },
  Progressive:  { rating: 4.1, claimsRating: "Excellent", amBest: "A+" },
  "State Farm": { rating: 4.5, claimsRating: "Excellent", amBest: "A++" },
  Allstate:     { rating: 3.9, claimsRating: "Good",      amBest: "A+" },
  Geico:        { rating: 4.2, claimsRating: "Excellent", amBest: "A++" },
  USAA:         { rating: 4.8, claimsRating: "Excellent", amBest: "A++" },
  Farmers:      { rating: 3.8, claimsRating: "Good",      amBest: "A" },
  Travelers:    { rating: 4.3, claimsRating: "Excellent", amBest: "A++" },
  Mercury:      { rating: 4.0, claimsRating: "Good",      amBest: "A" },
  Citizens:     { rating: 3.9, claimsRating: "Fair",      amBest: "A" },
};

// ─── Coverage amount calculator ──────────────────────────────────────

function calculateCoverageAmounts(profile: UserProfile) {
  const homeValue = profile.home_value || 300000;
  return {
    dwelling: Math.round((homeValue * 0.8) / 10000) * 10000,
    liability: homeValue > 500000 ? 300000 : 100000,
    deductible: profile.age && profile.age < 30 ? 1500 : 1000,
  };
}

// ─── State-specific provider universes ────────────────────────────────

const homeProvidersByState: Record<string, string[]> = {
  FL: ["Citizens", "Progressive", "State Farm"],
  CA: ["Lemonade", "Farmers", "Mercury"],
  TX: ["State Farm", "Allstate", "Progressive"],
  NY: ["Lemonade", "State Farm", "Travelers"],
  DEFAULT: ["Lemonade", "Progressive", "State Farm"],
};

// ─── HOME rate calculator ────────────────────────────────────────────

const HOME_BASES: Record<string, number> = {
  Lemonade: 47,
  Progressive: 52,
  "State Farm": 61,
  Allstate: 67,
  Farmers: 71,
  Citizens: 72,
  Mercury: 48,
  Travelers: 53,
};

const HOME_STATE_MULT: Record<string, number> = {
  FL: 2.0, LA: 1.9, TX: 1.6, CA: 1.5, OK: 1.4, KS: 1.3, NY: 1.2,
  GA: 1.2, NC: 1.15, SC: 1.15, AL: 1.15, MS: 1.15,
  OH: 0.9, VT: 0.8, ME: 0.75,
};

function calculateHomeRate(base: number, profile: UserProfile): number {
  let price = base;

  if (profile.home_value) {
    if (profile.home_value > 1_000_000) price *= 2.2;
    else if (profile.home_value > 750_000) price *= 1.8;
    else if (profile.home_value > 500_000) price *= 1.5;
    else if (profile.home_value > 300_000) price *= 1.2;
    else if (profile.home_value < 150_000) price *= 0.8;
  }

  const stateUC = (profile.state ?? "").toUpperCase();
  if (HOME_STATE_MULT[stateUC]) price *= HOME_STATE_MULT[stateUC];

  if (profile.home_age) {
    if (profile.home_age > 50) price *= 1.4;
    else if (profile.home_age > 30) price *= 1.2;
    else if (profile.home_age < 10) price *= 0.9;
  }

  if (profile.single_family === false) price *= 0.7;
  if (profile.military_service) price *= 0.88;
  if (profile.months_insured && profile.months_insured > 24) price *= 0.93;
  if (profile.currently_insured) price *= 0.95;

  price *= 0.92 + Math.random() * 0.16;
  return Math.max(15, Math.round(price));
}

// ─── AUTO rate calculator ────────────────────────────────────────────

const AUTO_PROVIDERS: { provider: string; base: number; militaryOnly?: boolean }[] = [
  { provider: "Geico", base: 89 },
  { provider: "Progressive", base: 97 },
  { provider: "State Farm", base: 103 },
  { provider: "Allstate", base: 112 },
  { provider: "USAA", base: 78, militaryOnly: true },
];

const AUTO_STATE_MULT: Record<string, number> = {
  MI: 2.1, FL: 1.8, LA: 1.7, NY: 1.6, NJ: 1.5,
  CA: 1.4, TX: 1.3, OH: 0.9, ME: 0.8, VT: 0.75,
};

function calculateAutoRate(base: number, profile: UserProfile): number {
  let price = base;

  if (profile.age) {
    if (profile.age < 25) price *= 1.8;
    else if (profile.age < 30) price *= 1.3;
    else if (profile.age >= 65) price *= 1.2;
  }

  if (profile.vehicle_count) {
    if (profile.vehicle_count === 2) price *= 1.7;
    else if (profile.vehicle_count >= 3) price *= 2.3;
  }

  const stateUC = (profile.state ?? "").toUpperCase();
  if (AUTO_STATE_MULT[stateUC]) price *= AUTO_STATE_MULT[stateUC];

  if (profile.currently_insured) price *= 0.88;
  if (profile.military_service) price *= 0.85;
  if (profile.months_insured && profile.months_insured > 24) price *= 0.93;
  if (profile.months_insured && profile.months_insured > 60) price *= 0.88;

  price *= 0.9 + Math.random() * 0.2;
  return Math.max(20, Math.round(price));
}

// ─── RENTERS ─────────────────────────────────────────────────────────

const RENTERS_BASE = 18;
const RENTERS_STATE_MULT: Record<string, number> = {
  FL: 1.4, CA: 1.3, NY: 1.3, TX: 1.1, OH: 0.85, ME: 0.8,
};

function calculateRentersRate(base: number, profile: UserProfile): number {
  let price = base;
  const stateUC = (profile.state ?? "").toUpperCase();
  if (RENTERS_STATE_MULT[stateUC]) price *= RENTERS_STATE_MULT[stateUC];
  if (profile.age && profile.age < 25) price *= 1.15;
  price *= 0.9 + Math.random() * 0.2;
  return Math.max(8, Math.round(price));
}

// ─── Profile-aware highlights ────────────────────────────────────────

function getProviderHighlights(provider: string, profile: UserProfile): string[] {
  const map: Record<string, string[]> = {
    Lemonade: [
      "Instant claims via app",
      profile.age && profile.age < 35
        ? "Popular with younger homeowners"
        : "Certified B Corp",
      "No paperwork — fully digital",
    ],
    Progressive: [
      profile.vehicle_count && profile.vehicle_count > 1
        ? "Multi-vehicle discount available"
        : "Bundle home + auto and save",
      "24/7 claims support",
      profile.months_insured && profile.months_insured > 12
        ? "Loyalty rewards program"
        : "Easy online quote",
    ],
    "State Farm": [
      "Largest home insurer in the US",
      profile.state?.toUpperCase() === "FL"
        ? "Strong hurricane coverage options"
        : "Local agent support",
      "A++ AM Best financial strength",
    ],
    Geico: [
      profile.military_service ? "Military discount applied" : "Lowest base rates",
      "Fast online claims",
      "97% customer satisfaction",
    ],
    USAA: [
      "Exclusive to military families",
      "Highest customer satisfaction in industry",
      "A++ AM Best financial strength",
    ],
    Allstate: [
      "Claim Forgiveness on first claim",
      profile.vehicle_count && profile.vehicle_count > 1
        ? "Multi-policy savings"
        : "Bundle home + auto for discount",
      "24/7 mobile claims",
    ],
    Farmers: [
      "Quote-and-bind in 10 minutes",
      profile.state?.toUpperCase() === "CA"
        ? "Strong CA wildfire underwriting"
        : "Smart Plan flexibility",
      "Multi-policy discount",
    ],
    Citizens: [
      "FL state-backed insurer of last resort",
      "Coverage when private market won't bind",
      "Hurricane-aware pricing",
    ],
    Mercury: [
      "CA-specialist pricing",
      "Multi-policy discount up to 15%",
      "Local agent network",
    ],
    Travelers: [
      profile.state?.toUpperCase() === "NY"
        ? "Strong NY-market expertise"
        : "Green-home rebuild upgrades",
      "Identity-fraud coverage included",
      "A++ AM Best financial strength",
    ],
  };
  return map[provider] || ["Competitive rates", "24/7 support", "Easy claims process"];
}

// ─── Pre-fill deep-link URL helpers ──────────────────────────────────

const qs = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";
  return (
    "?" +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&")
  );
};

function homeApplyUrl(provider: string, profile: UserProfile, dwelling: number): string {
  const zip = profile.zip_code ?? "";
  const state = (profile.state ?? "").toUpperCase();
  const common = { zip, state, utm_source: "alto", utm_medium: "ai_chat" };
  switch (provider) {
    case "Lemonade":     return "https://www.lemonade.com/homeowners" + qs({ ...common, coverage: dwelling });
    case "Progressive":  return "https://www.progressive.com/homeowners/quote/" + qs({ ...common, coverage_amount: dwelling });
    case "State Farm":   return "https://www.statefarm.com/insurance/home-and-property/homeowners" + qs(common);
    case "Citizens":     return "https://www.citizensfla.com/quote-application" + qs(common);
    case "Farmers":      return "https://www.farmers.com/homeowners-insurance/quote/" + qs({ ...common, coverage_amount: dwelling });
    case "Mercury":      return "https://www.mercuryinsurance.com/get-a-quote/homeowners" + qs({ ...common, coverage_amount: dwelling });
    case "Allstate":     return "https://www.allstate.com/home-insurance/quote" + qs({ ...common, coverage_amount: dwelling });
    case "Travelers":    return "https://www.travelers.com/home-insurance/quote" + qs({ ...common, coverage_amount: dwelling });
    default:             return "https://www.google.com/search?q=" + encodeURIComponent(`${provider} home insurance quote`);
  }
}

function autoApplyUrl(provider: string, profile: UserProfile): string {
  const zip = profile.zip_code ?? "";
  const state = (profile.state ?? "").toUpperCase();
  const common = { zip, state, utm_source: "alto" };
  switch (provider) {
    case "Geico":        return "https://www.geico.com/auto-insurance/" + qs(common);
    case "Progressive":  return "https://www.progressive.com/auto/quote/" + qs(common);
    case "State Farm":   return "https://www.statefarm.com/insurance/auto" + qs(common);
    case "Allstate":     return "https://www.allstate.com/auto-insurance/quote" + qs(common);
    case "USAA":         return "https://www.usaa.com/inet/wc/insurance_auto_main" + qs(common);
    default:             return "https://www.google.com/search?q=" + encodeURIComponent(`${provider} auto insurance quote`);
  }
}

function rentersApplyUrl(provider: string, profile: UserProfile): string {
  const zip = profile.zip_code ?? "";
  const state = (profile.state ?? "").toUpperCase();
  const common = { zip, state, utm_source: "alto" };
  switch (provider) {
    case "Lemonade":     return "https://www.lemonade.com/renters" + qs(common);
    case "Progressive":  return "https://www.progressive.com/renters/quote/" + qs(common);
    case "State Farm":   return "https://www.statefarm.com/insurance/home-and-property/renters" + qs(common);
    case "Travelers":    return "https://www.travelers.com/renters-insurance/quote" + qs(common);
    default:             return "https://www.google.com/search?q=" + encodeURIComponent(`${provider} renters insurance quote`);
  }
}

// ─── Public entry point ──────────────────────────────────────────────

export async function fetchInsuranceQuotes(
  params: FetchQuotesParams,
): Promise<InsuranceQuote[]> {
  const profile = (params.profile ?? {}) as UserProfile;
  const type = params.type ?? "home";

  console.log(
    `[fetchInsuranceQuotes] type=${type} userProfile:`,
    profile,
  );

  if (type === "auto") return getAutoQuotes(profile);
  if (type === "renters") return getRentersQuotes(profile);
  return getHomeQuotes(profile);
}

function getHomeQuotes(profile: UserProfile): InsuranceQuote[] {
  const state = (profile.state ?? "").toUpperCase();
  const providers = homeProvidersByState[state] ?? homeProvidersByState.DEFAULT;
  const coverage = calculateCoverageAmounts(profile);

  return providers
    .map((provider) => {
      const base = HOME_BASES[provider];
      if (!base) return null;
      const monthlyPrice = calculateHomeRate(base, profile);
      const r = PROVIDER_RATINGS[provider] ?? {
        rating: 4.0,
        claimsRating: "Good" as const,
        amBest: "A",
      };
      return {
        provider,
        providerLogo: `/logos/${provider.toLowerCase().replace(/\s+/g, "")}.svg`,
        monthlyPrice,
        annualPrice: monthlyPrice * 12,
        coverage,
        highlights: getProviderHighlights(provider, profile),
        applyUrl: homeApplyUrl(provider, profile, coverage.dwelling),
        rating: r.rating,
        claimsRating: r.claimsRating,
      } satisfies InsuranceQuote;
    })
    .filter((q): q is InsuranceQuote => q !== null)
    .sort((a, b) => a.monthlyPrice - b.monthlyPrice);
}

function getAutoQuotes(profile: UserProfile): InsuranceQuote[] {
  let providers = AUTO_PROVIDERS;
  if (!profile.military_service) {
    providers = providers.filter((p) => !p.militaryOnly);
  }
  // Auto doesn't use dwelling/liability/deductible in the same way; we
  // surface placeholders that the user understands.
  const coverage = {
    dwelling: 0,
    liability: 100_000,
    deductible: profile.age && profile.age < 25 ? 1000 : 500,
  };

  return providers
    .map(({ provider, base }) => {
      const monthlyPrice = calculateAutoRate(base, profile);
      const r = PROVIDER_RATINGS[provider] ?? {
        rating: 4.0,
        claimsRating: "Good" as const,
        amBest: "A",
      };
      return {
        provider,
        providerLogo: `/logos/${provider.toLowerCase().replace(/\s+/g, "")}.svg`,
        monthlyPrice,
        annualPrice: monthlyPrice * 12,
        coverage,
        highlights: getProviderHighlights(provider, profile),
        applyUrl: autoApplyUrl(provider, profile),
        rating: r.rating,
        claimsRating: r.claimsRating,
      } satisfies InsuranceQuote;
    })
    .sort((a, b) => a.monthlyPrice - b.monthlyPrice);
}

function getRentersQuotes(profile: UserProfile): InsuranceQuote[] {
  const providers = ["Lemonade", "Progressive", "State Farm", "Travelers"];
  const coverage = {
    dwelling: 0,
    liability: 100_000,
    deductible: 500,
  };

  return providers
    .map((provider) => {
      const monthlyPrice = calculateRentersRate(RENTERS_BASE, profile);
      const r = PROVIDER_RATINGS[provider] ?? {
        rating: 4.0,
        claimsRating: "Good" as const,
        amBest: "A",
      };
      return {
        provider,
        providerLogo: `/logos/${provider.toLowerCase().replace(/\s+/g, "")}.svg`,
        monthlyPrice,
        annualPrice: monthlyPrice * 12,
        coverage,
        highlights: getProviderHighlights(provider, profile),
        applyUrl: rentersApplyUrl(provider, profile),
        rating: r.rating,
        claimsRating: r.claimsRating,
      } satisfies InsuranceQuote;
    })
    .sort((a, b) => a.monthlyPrice - b.monthlyPrice);
}

// Exported for tests / future consumers
export {
  calculateHomeRate,
  calculateAutoRate,
  calculateRentersRate,
  calculateCoverageAmounts,
  getProviderHighlights,
  PROVIDER_RATINGS,
};
