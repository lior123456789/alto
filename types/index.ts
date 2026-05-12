export type Vertical = "insurance" | "mortgage" | "real_estate";
export type InsuranceType = "home" | "renters" | "auto" | "life";
export type LeadStatus = "clicked" | "applied" | "converted";

export interface AutoCoverage {
  liability: string;
  collision: string;
  comprehensive: string;
  uninsuredMotorist: string;
}

export interface InsuranceQuote {
  provider: string;
  providerLogo: string;
  monthlyPrice: number;
  annualPrice: number;
  /** Which insurance vertical this quote is for — drives card rendering. */
  type: "home" | "renters" | "auto" | "life";
  coverage: {
    dwelling: number;
    liability: number;
    deductible: number;
  };
  /** Auto-specific coverage breakdown, only populated when type === "auto". */
  autoCoverage?: AutoCoverage;
  highlights: string[];
  applyUrl: string;
  rating: number;
  claimsRating: "Excellent" | "Good" | "Fair";
}

export interface LeadAccepted {
  uuid: string;
  callNumber: string | null;
  durationSeconds: number;
  earnedDollars: string;
  vertical: "auto" | "home" | "renters";
}

export interface PlaidSummary {
  totalCash: number;
  totalAssets: number;
  monthlyIncomeEstimate: number;
  annualIncomeEstimate: number;
  accountCount: number;
  primaryAccount: string | null;
}

export interface MortgageOfferLite {
  lender: string;
  logo: string;
  estimatedRate30: number;
  estimatedMonthly30: number;
  estimatedRate15: number;
  estimatedMonthly15: number;
  applyUrl: string;
  note: string | null;
}

export interface MortgageRateMeta {
  baseRate30: number;
  baseRate15: number;
  baseRateSource: "freddiemac" | "fred" | "fallback";
  baseRateAsOf?: string;
}

export interface MortgageProfileLite {
  city?: string;
  state?: string;
  zip_code?: string;
  property_value?: number;
  loan_amount?: number;
  down_payment?: number;
  credit_score_range?: string;
  annual_income?: number;
  total_assets?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  /** Typewriter progress — assistant only. Prefix of `content` that's currently visible. */
  revealedContent?: string;
  quotes?: InsuranceQuote[];
  quoteWarnings?: string[];
  leadAccepted?: LeadAccepted;
  plaidConnect?: boolean;
  plaidSummary?: PlaidSummary;
  mortgageOffers?: MortgageOfferLite[];
  mortgageProfile?: MortgageProfileLite;
  mortgageRateMeta?: MortgageRateMeta;
  listings?: {
    listings: import("@/lib/realestate").ListingResult[];
    source: "rentcast" | "fallback";
    fallbackUrls?: { name: string; url: string }[];
  };
}

export interface FetchQuotesParams {
  sessionId?: string;
  vertical: Vertical;
  type: InsuranceType;
  zip_code: string;
  profile: Record<string, unknown>;
}
