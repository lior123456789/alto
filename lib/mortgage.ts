// Mortgage offer builder — uses LIVE Freddie Mac PMMS 30-yr fixed rate
// from FRED via lib/rates.ts, applies per-lender spreads, surfaces the
// user's profile so they can fill the lender's real form quickly.
//
// IMPORTANT: lender URLs are plain deep-links. Most consumer lenders
// reject pre-filled query params on quote forms for compliance reasons,
// so we don't attempt to. The MortgageOffersCard shows the profile for
// copy/paste alongside the apply button.

import {
  getCachedMortgageRate,
  getCached15YearRate,
  getLenderRates,
} from "./rates";

export interface MortgageProfile {
  purpose?: "purchase" | "refinance";
  city?: string;
  state?: string;
  zip_code?: string;
  property_value?: number;
  loan_amount?: number;
  down_payment?: number;
  credit_score_range?: "excellent" | "good" | "fair" | "poor";
  annual_income?: number;
  total_assets?: number;
  monthly_income?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
}

export interface MortgageOffer {
  lender: string;
  logo: string;
  estimatedRate30: number;
  estimatedMonthly30: number;
  estimatedRate15: number;
  estimatedMonthly15: number;
  applyUrl: string;
  note: string | null;
}

export interface MortgageOffersResponse {
  offers: MortgageOffer[];
  baseRate30: number;
  baseRate15: number;
  baseRateSource: "freddiemac" | "fred" | "fallback";
  baseRateAsOf?: string;
}

// Clean, honest deep-links — no pre-fill query params.
const LENDER_LINKS: Record<string, string> = {
  "Rocket Mortgage": "https://www.rocketmortgage.com/apply",
  "Better.com": "https://better.com/start",
  Credible: "https://www.credible.com/mortgage",
  "JP Morgan Chase": "https://www.chase.com/personal/mortgage",
  LoanDepot: "https://www.loandepot.com/purchase",
};

const LENDER_LOGOS: Record<string, string> = {
  "Rocket Mortgage": "/logos/rocket.svg",
  "Better.com": "/logos/better.svg",
  Credible: "/logos/credible.svg",
  "JP Morgan Chase": "/logos/chase.svg",
  LoanDepot: "/logos/loandepot.svg",
};

const LENDER_NOTES: Record<string, string | null> = {
  "Rocket Mortgage": null,
  "Better.com": "No origination fees",
  Credible: "Shops 8+ lenders in one application",
  "JP Morgan Chase": null,
  LoanDepot: null,
};

function monthlyPayment(loan: number, ratePct: number, years = 30): number {
  const monthlyRate = ratePct / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return Math.round(loan / n);
  const payment =
    (loan * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
  return Math.round(payment);
}

export async function buildMortgageOffers(
  profile: MortgageProfile,
): Promise<MortgageOffersResponse> {
  const [cached30, cached15] = await Promise.all([
    getCachedMortgageRate(),
    getCached15YearRate(),
  ]);
  const rates30 = getLenderRates(cached30.rate);
  const rates15 = getLenderRates(cached15.rate);
  const loan = profile.loan_amount ?? 0;

  const offers: MortgageOffer[] = Object.keys(rates30)
    .map((name) => {
      const r30 = rates30[name];
      const r15 = rates15[name];
      return {
        lender: name,
        logo: LENDER_LOGOS[name] ?? "",
        estimatedRate30: r30,
        estimatedMonthly30: loan ? monthlyPayment(loan, r30, 30) : 0,
        estimatedRate15: r15,
        estimatedMonthly15: loan ? monthlyPayment(loan, r15, 15) : 0,
        applyUrl: LENDER_LINKS[name] ?? "",
        note: LENDER_NOTES[name] ?? null,
      };
    })
    .sort((a, b) => a.estimatedRate30 - b.estimatedRate30);

  return {
    offers,
    baseRate30: cached30.rate,
    baseRate15: cached15.rate,
    baseRateSource: cached30.source,
    baseRateAsOf: cached30.asOf,
  };
}
