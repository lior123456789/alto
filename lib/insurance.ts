import type { InsuranceQuote, FetchQuotesParams } from "@/types";

// Helper: build a query string, dropping empty values.
function qs(params: Record<string, string | number | undefined | null>) {
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
}

export async function fetchInsuranceQuotes(
  params: FetchQuotesParams,
): Promise<InsuranceQuote[]> {
  // Phase 1: mock pricing. URLs below are real pre-fill deep links so when
  // the user clicks, they land on a partially-completed quote form.

  const zip = params.zip_code || "";
  const profile = (params.profile ?? {}) as {
    state?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    coverage_amount?: number;
  };
  const state = profile.state ?? "";
  const coverage = profile.coverage_amount ?? 300000;

  const lemonadeUrl =
    "https://www.lemonade.com/homeowners" +
    qs({
      zip,
      state,
      coverage,
      utm_source: "alto",
      utm_medium: "ai_chat",
    });

  const progressiveUrl =
    "https://www.progressive.com/homeowners/quote/" +
    qs({
      zip,
      state,
      coverage_amount: coverage,
      utm_source: "alto",
      utm_medium: "ai_chat",
    });

  const stateFarmUrl =
    "https://www.statefarm.com/insurance/home-and-property/homeowners" +
    qs({
      zip,
      state,
      utm_source: "alto",
      utm_medium: "ai_chat",
    });

  const mockQuotes: InsuranceQuote[] = [
    {
      provider: "Lemonade",
      providerLogo: "/logos/lemonade.svg",
      monthlyPrice: 47,
      annualPrice: 564,
      coverage: { dwelling: coverage, liability: 100000, deductible: 1000 },
      highlights: [
        "Instant claims via app",
        "Certified B Corp",
        "Quote pre-filled with your info",
      ],
      applyUrl: lemonadeUrl,
      rating: 4.3,
      claimsRating: "Good",
    },
    {
      provider: "Progressive",
      providerLogo: "/logos/progressive.svg",
      monthlyPrice: 52,
      annualPrice: 624,
      coverage: { dwelling: coverage, liability: 100000, deductible: 1000 },
      highlights: [
        "Bundle discount with auto",
        "24/7 claims support",
        "Quote form pre-filled with zip + state",
      ],
      applyUrl: progressiveUrl,
      rating: 4.1,
      claimsRating: "Excellent",
    },
    {
      provider: "State Farm",
      providerLogo: "/logos/statefarm.svg",
      monthlyPrice: 61,
      annualPrice: 732,
      coverage: { dwelling: coverage, liability: 100000, deductible: 500 },
      highlights: [
        "Lower deductible",
        "Local agent support",
        "Longest track record",
      ],
      applyUrl: stateFarmUrl,
      rating: 4.5,
      claimsRating: "Excellent",
    },
  ];

  return mockQuotes.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
}
