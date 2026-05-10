export type Vertical = "insurance" | "mortgage" | "real_estate";
export type InsuranceType = "home" | "renters" | "auto" | "life";
export type LeadStatus = "clicked" | "applied" | "converted";

export interface InsuranceQuote {
  provider: string;
  providerLogo: string;
  monthlyPrice: number;
  annualPrice: number;
  coverage: {
    dwelling: number;
    liability: number;
    deductible: number;
  };
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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  quotes?: InsuranceQuote[];
  leadAccepted?: LeadAccepted;
  plaidConnect?: boolean;
  plaidSummary?: PlaidSummary;
}

export interface FetchQuotesParams {
  vertical: Vertical;
  type: InsuranceType;
  zip_code: string;
  profile: Record<string, unknown>;
}
