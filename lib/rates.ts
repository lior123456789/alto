// Live 30-year fixed mortgage rate from FRED (Freddie Mac PMMS, series
// MORTGAGE30US). Updates every Thursday. We cache in-process for 24h so
// we don't hammer FRED on every chat turn.

import { getPmmsLatest } from "./freddiemac";

const FRED_BASE =
  "https://api.stlouisfed.org/fred/series/observations" +
  "?sort_order=desc&limit=1&file_type=json";
const FRED_URL = `${FRED_BASE}&series_id=MORTGAGE30US`;
const FRED_URL_15 = `${FRED_BASE}&series_id=MORTGAGE15US`;

const FALLBACK_30YR = 6.9;
const FALLBACK_15YR = 6.1;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface CachedRate {
  rate: number;
  fetchedAt: number;
  source: "freddiemac" | "fred" | "fallback";
  asOf?: string;
}

let cached30: CachedRate | null = null;
let cached15: CachedRate | null = null;

async function fetchFred(url: string, fallback: number): Promise<CachedRate> {
  const key = process.env.FRED_API_KEY;
  if (!key) return { rate: fallback, fetchedAt: Date.now(), source: "fallback" };
  try {
    const res = await fetch(`${url}&api_key=${key}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`FRED ${res.status}`);
    const data = (await res.json()) as {
      observations?: { value: string; date: string }[];
    };
    const obs = data.observations?.[0];
    if (!obs) throw new Error("no observations");
    const rate = parseFloat(obs.value);
    if (!Number.isFinite(rate)) throw new Error("non-numeric rate");
    return {
      rate,
      fetchedAt: Date.now(),
      source: "fred",
      asOf: obs.date,
    };
  } catch (e) {
    console.warn("[rates] FRED fetch failed, using fallback:", e);
    return { rate: fallback, fetchedAt: Date.now(), source: "fallback" };
  }
}

// Try Freddie Mac (canonical PMMS xlsx) first, then FRED, then hardcoded.
async function fetchBoth(): Promise<{
  thirty: CachedRate;
  fifteen: CachedRate;
}> {
  try {
    const pmms = await getPmmsLatest();
    return {
      thirty: {
        rate: pmms.thirtyYear,
        fetchedAt: Date.now(),
        source: "freddiemac",
        asOf: pmms.asOf,
      },
      fifteen: {
        rate: pmms.fifteenYear,
        fetchedAt: Date.now(),
        source: "freddiemac",
        asOf: pmms.asOf,
      },
    };
  } catch (e) {
    console.warn("[rates] Freddie Mac PMMS failed, trying FRED:", e);
  }
  const [thirty, fifteen] = await Promise.all([
    fetchFred(FRED_URL, FALLBACK_30YR),
    fetchFred(FRED_URL_15, FALLBACK_15YR),
  ]);
  return { thirty, fifteen };
}

export async function getLiveMortgageRate() {
  const { thirty } = await fetchBoth();
  return thirty;
}

export async function getCachedMortgageRate(): Promise<CachedRate> {
  if (cached30 && Date.now() - cached30.fetchedAt < ONE_DAY_MS) return cached30;
  const { thirty, fifteen } = await fetchBoth();
  cached30 = thirty;
  cached15 = fifteen;
  return thirty;
}

export async function getCached15YearRate(): Promise<CachedRate> {
  if (cached15 && Date.now() - cached15.fetchedAt < ONE_DAY_MS) return cached15;
  const { thirty, fifteen } = await fetchBoth();
  cached30 = thirty;
  cached15 = fifteen;
  return fifteen;
}

const LENDER_SPREADS: Record<string, number> = {
  "Rocket Mortgage": -0.05,
  "Better.com": -0.1,
  Credible: 0,
  "JP Morgan Chase": 0.05,
  LoanDepot: 0.1,
};

export function getLenderRates(baseRate: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [lender, spread] of Object.entries(LENDER_SPREADS)) {
    out[lender] = Number((baseRate + spread).toFixed(2));
  }
  return out;
}

export async function getAllMortgageRates() {
  const [r30, r15] = await Promise.all([
    getCachedMortgageRate(),
    getCached15YearRate(),
  ]);
  return {
    thirtyYear: {
      baseRate: r30.rate,
      source: r30.source,
      perLender: getLenderRates(r30.rate),
    },
    fifteenYear: {
      baseRate: r15.rate,
      source: r15.source,
      perLender: getLenderRates(r15.rate),
    },
  };
}
