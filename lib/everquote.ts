// EverQuote Inbound Call Integration v2.1.0
// Pays Alto per connected call — bid_cents in response = your revenue

const EVERQUOTE_BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://calls.everquote.com"
    : "https://calls.staging.everquote.com";

const EVERQUOTE_USERNAME = process.env.EVERQUOTE_USERNAME ?? "";
const EVERQUOTE_PASSWORD = process.env.EVERQUOTE_PASSWORD ?? "";

const everquoteConfigured = () =>
  Boolean(EVERQUOTE_USERNAME && EVERQUOTE_PASSWORD);

const authHeader = () =>
  "Basic " +
  Buffer.from(`${EVERQUOTE_USERNAME}:${EVERQUOTE_PASSWORD}`).toString("base64");

// ───────────── Types ─────────────

export interface EverQuoteResponse {
  accept: boolean;
  bid_cents: number;
  duration_seconds: number;
  reason: string;
  uuid: string;
}

export interface AutoParams {
  phone_number: string;
  zip_code?: string;
  sms_consent?: boolean;
  currently_insured?: boolean;
  homeowner?: boolean;
  vehicle_count?: number;
  current_insurer?: string;
  consumer_intent?: boolean;
  age?: number;
  military_service?: boolean;
  months_insured?: number;
  first_name?: string;
  last_name?: string;
  street_address?: string;
  city?: string;
  state?: string;
  email?: string;
  subid?: string;
}

export interface HomeParams {
  phone_number: string;
  zip_code?: string;
  sms_consent?: boolean;
  single_family?: boolean;
  military_service?: boolean;
  months_insured?: number;
  first_name?: string;
  last_name?: string;
  street_address?: string;
  city?: string;
  state?: string;
  email?: string;
  subid?: string;
}

export interface RentersParams {
  phone_number: string;
  zip_code?: string;
  sms_consent?: boolean;
  subid?: string;
}

export type InsuranceType = "auto" | "home" | "renters";

export interface AltoUserProfile {
  insurance_type: InsuranceType;
  phone_number: string;
  zip_code?: string;
  state?: string;
  city?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  sms_consent?: boolean;
  vehicle_count?: number;
  currently_insured?: boolean;
  current_insurer?: string;
  age?: number;
  single_family?: boolean;
  months_insured?: number;
  military_service?: boolean;
  session_id: string;
}

// ───────────── Raw API calls ─────────────

async function postEverQuote<T>(path: string, params: T): Promise<EverQuoteResponse> {
  if (!everquoteConfigured()) {
    throw new Error(
      "EverQuote not configured — set EVERQUOTE_USERNAME and EVERQUOTE_PASSWORD",
    );
  }
  const res = await fetch(`${EVERQUOTE_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`EverQuote ${path} ${res.status}: ${error}`);
  }
  return res.json();
}

export const submitAutoLead = (p: AutoParams) =>
  postEverQuote<AutoParams>("/ivr_integration/auto", p);

export const submitHomeLead = (p: HomeParams) =>
  postEverQuote<HomeParams>("/ivr_integration/home", p);

export const submitRentersLead = (p: RentersParams) =>
  postEverQuote<RentersParams>("/ivr_integration/renters", p);

// ───────────── Smart router ─────────────

export async function submitLeadToEverQuote(
  profile: AltoUserProfile,
): Promise<{ response: EverQuoteResponse; earnedCents: number }> {
  const sharedParams = {
    phone_number: profile.phone_number,
    zip_code: profile.zip_code,
    state: profile.state,
    city: profile.city,
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: profile.email,
    sms_consent: profile.sms_consent ?? false,
    subid: profile.session_id,
  };

  let response: EverQuoteResponse;

  switch (profile.insurance_type) {
    case "auto":
      response = await submitAutoLead({
        ...sharedParams,
        vehicle_count: profile.vehicle_count,
        currently_insured: profile.currently_insured,
        current_insurer: profile.current_insurer,
        age: profile.age,
        military_service: profile.military_service,
        months_insured: profile.months_insured,
        consumer_intent: true,
        homeowner: false,
      });
      break;
    case "home":
      response = await submitHomeLead({
        ...sharedParams,
        single_family: profile.single_family,
        military_service: profile.military_service,
        months_insured: profile.months_insured,
      });
      break;
    case "renters":
      response = await submitRentersLead(sharedParams);
      break;
    default:
      throw new Error(`Unknown insurance type: ${profile.insurance_type}`);
  }

  const earnedCents = response.accept ? response.bid_cents : 0;
  return { response, earnedCents };
}

export const isEverQuoteConfigured = everquoteConfigured;
