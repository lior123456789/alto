// Mortgage offer handoff — generates pre-filled application URLs for each
// lender from a collected profile. Each lender has its own URL surface;
// some accept rich query-param prefill, some only accept ZIP. For lenders
// without prefill support we still surface the profile so the user can
// copy-paste it into the form.

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
  estimatedRate: number;        // %, mock from credit + LTV
  estimatedMonthly: number;     // $, principal+interest only
  applyUrl: string;
  prefillSupported: boolean;
  note: string | null;
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
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
      )
      .join("&")
  );
};

// Rough rate estimate based on credit-score band and loan-to-value ratio.
// Sandbox-grade — replace with real lender APIs when partnered.
function estimateRate(profile: MortgageProfile): number {
  const base = 6.75; // baseline 30-yr fixed APR
  const credit = profile.credit_score_range ?? "good";
  const creditAdj =
    credit === "excellent"
      ? -0.4
      : credit === "good"
        ? 0
        : credit === "fair"
          ? 0.6
          : 1.4;

  const ltv =
    profile.property_value && profile.loan_amount
      ? profile.loan_amount / profile.property_value
      : 0.8;
  const ltvAdj = ltv > 0.9 ? 0.35 : ltv > 0.8 ? 0.15 : 0;

  return Number((base + creditAdj + ltvAdj).toFixed(2));
}

function monthlyPayment(loan: number, ratePct: number, years = 30): number {
  const monthlyRate = ratePct / 100 / 12;
  const n = years * 12;
  if (monthlyRate === 0) return Math.round(loan / n);
  const payment =
    (loan * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
  return Math.round(payment);
}

interface LenderSpec {
  name: string;
  logo: string;
  baseRateModifier: number; // small lender-specific spread
  prefillSupported: boolean;
  note: string | null;
  buildUrl: (profile: MortgageProfile) => string;
}

const LENDERS: LenderSpec[] = [
  {
    name: "Rocket Mortgage",
    logo: "/logos/rocket.svg",
    baseRateModifier: -0.05,
    prefillSupported: true,
    note: null,
    buildUrl: (p) =>
      "https://www.rocketmortgage.com/purchase/" +
      qs({
        purpose: p.purpose === "refinance" ? "refi" : "purchase",
        zip: p.zip_code,
        state: p.state,
        loan_amount: p.loan_amount,
        home_value: p.property_value,
        down_payment: p.down_payment,
        credit: p.credit_score_range,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        phone: p.phone_number,
        utm_source: "alto",
        utm_medium: "ai_chat",
      }),
  },
  {
    name: "Better.com",
    logo: "/logos/better.svg",
    baseRateModifier: 0,
    prefillSupported: true,
    note: "No origination fees",
    buildUrl: (p) =>
      "https://better.com/start" +
      qs({
        intent: p.purpose === "refinance" ? "refinance" : "purchase",
        zipcode: p.zip_code,
        state: p.state,
        loanAmount: p.loan_amount,
        homePrice: p.property_value,
        downPayment: p.down_payment,
        creditScore: p.credit_score_range,
        firstName: p.first_name,
        lastName: p.last_name,
        email: p.email,
        utm_source: "alto",
      }),
  },
  {
    name: "JP Morgan Chase",
    logo: "/logos/chase.svg",
    baseRateModifier: 0.1,
    prefillSupported: false,
    note: "Chase requires application on their site — your profile is summarized below for easy copy/paste.",
    buildUrl: (p) =>
      "https://www.chase.com/personal/mortgage/mortgage-purchase" +
      qs({
        zip: p.zip_code,
        utm_source: "alto",
      }),
  },
  {
    name: "Credible",
    logo: "/logos/credible.svg",
    baseRateModifier: 0.05,
    prefillSupported: true,
    note: "Shops 8+ lenders in one app",
    buildUrl: (p) =>
      "https://www.credible.com/mortgage/quote" +
      qs({
        purpose: p.purpose,
        zip_code: p.zip_code,
        state: p.state,
        loan_amount: p.loan_amount,
        property_value: p.property_value,
        credit_score: p.credit_score_range,
        annual_income: p.annual_income,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        utm_source: "alto",
      }),
  },
  {
    name: "LoanDepot",
    logo: "/logos/loandepot.svg",
    baseRateModifier: 0.15,
    prefillSupported: true,
    note: null,
    buildUrl: (p) =>
      "https://www.loandepot.com/purchase/quote" +
      qs({
        zip: p.zip_code,
        state: p.state,
        loan_amount: p.loan_amount,
        property_value: p.property_value,
        credit: p.credit_score_range,
        utm_source: "alto",
      }),
  },
];

export function buildMortgageOffers(
  profile: MortgageProfile,
): MortgageOffer[] {
  const baseRate = estimateRate(profile);
  const loan = profile.loan_amount ?? 0;

  return LENDERS.map((lender) => {
    const rate = Number((baseRate + lender.baseRateModifier).toFixed(2));
    return {
      lender: lender.name,
      logo: lender.logo,
      estimatedRate: rate,
      estimatedMonthly: loan ? monthlyPayment(loan, rate) : 0,
      applyUrl: lender.buildUrl(profile),
      prefillSupported: lender.prefillSupported,
      note: lender.note,
    };
  }).sort((a, b) => a.estimatedRate - b.estimatedRate);
}
