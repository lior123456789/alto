// Rentcast — real rental + sale listings. Free tier covers ~50 calls/day.
// Sign up at app.rentcast.io/api for a key.
//
// Spec: https://app.rentcast.io/app/api
// Endpoint: GET https://api.rentcast.io/v1/listings/rental/long-term
//           GET https://api.rentcast.io/v1/listings/sale

export interface ListingSearchParams {
  type: "rental" | "sale";
  city?: string;
  state?: string;
  zip_code?: string;
  bedrooms?: number;
  max_price?: number;
}

export interface ListingResult {
  id: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode?: string;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  propertyType?: string;
  listingUrl?: string | null;
  photo?: string | null;
}

export interface ListingsResponse {
  ok: boolean;
  listings: ListingResult[];
  source: "rentcast" | "fallback";
  fallbackUrls?: { name: string; url: string }[];
  error?: string;
}

const RENTCAST_BASE = "https://api.rentcast.io/v1/listings";

export const isRentcastConfigured = () =>
  Boolean(process.env.RENTCAST_API_KEY);

function slugCity(city?: string): string {
  return (city ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");
}

function buildFallbackUrls(params: ListingSearchParams) {
  const city = slugCity(params.city);
  const state = (params.state ?? "").toLowerCase();
  const beds = params.bedrooms ?? 2;
  const maxPrice = params.max_price ?? 5000;

  const cityState = city && state ? `${city}-${state}` : "";
  return [
    {
      name: "Zillow",
      url: cityState
        ? `https://www.zillow.com/homes/for_rent/${cityState}/?beds=${beds}&price=0-${maxPrice}`
        : "https://www.zillow.com/homes/for_rent/",
    },
    {
      name: "Apartments.com",
      url: cityState
        ? `https://www.apartments.com/${cityState}/?max=${maxPrice}&beds=${beds}`
        : "https://www.apartments.com/",
    },
    {
      name: "Realtor.com",
      url:
        city && state
          ? `https://www.realtor.com/apartments/${city}_${state}?price_max=${maxPrice}&beds_min=${beds}`
          : "https://www.realtor.com/apartments/",
    },
  ];
}

export async function searchListings(
  params: ListingSearchParams,
): Promise<ListingsResponse> {
  if (!isRentcastConfigured()) {
    return {
      ok: true,
      listings: [],
      source: "fallback",
      fallbackUrls: buildFallbackUrls(params),
    };
  }

  const path = params.type === "sale" ? "/sale" : "/rental/long-term";
  const query = new URLSearchParams();
  if (params.city) query.set("city", params.city);
  if (params.state) query.set("state", params.state);
  if (params.zip_code) query.set("zipCode", params.zip_code);
  if (params.bedrooms) query.set("bedrooms", String(params.bedrooms));
  if (params.max_price) query.set("maxPrice", String(params.max_price));
  query.set("limit", "5");

  try {
    const res = await fetch(`${RENTCAST_BASE}${path}?${query.toString()}`, {
      headers: { "X-Api-Key": process.env.RENTCAST_API_KEY ?? "" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn(`[rentcast] ${res.status}`, await res.text());
      return {
        ok: true,
        listings: [],
        source: "fallback",
        fallbackUrls: buildFallbackUrls(params),
      };
    }
    const raw = (await res.json()) as unknown;
    const arr = Array.isArray(raw) ? raw : [];
    type RentcastListing = {
      id?: string;
      formattedAddress?: string;
      addressLine1?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      price?: number;
      bedrooms?: number;
      bathrooms?: number;
      squareFootage?: number;
      propertyType?: string;
      listingUrl?: string | null;
    };
    const listings: ListingResult[] = (arr as RentcastListing[]).map((r, i) => ({
      id: r.id ?? `r-${i}`,
      addressLine1: r.addressLine1 ?? r.formattedAddress ?? "Address withheld",
      city: r.city ?? params.city ?? "",
      state: r.state ?? params.state ?? "",
      zipCode: r.zipCode,
      price: r.price ?? 0,
      bedrooms: r.bedrooms,
      bathrooms: r.bathrooms,
      squareFootage: r.squareFootage,
      propertyType: r.propertyType,
      listingUrl: r.listingUrl ?? null,
      photo: null,
    }));

    if (listings.length === 0) {
      return {
        ok: true,
        listings: [],
        source: "fallback",
        fallbackUrls: buildFallbackUrls(params),
      };
    }
    return { ok: true, listings, source: "rentcast" };
  } catch (e) {
    console.warn("[rentcast] fetch failed:", e);
    return {
      ok: true,
      listings: [],
      source: "fallback",
      fallbackUrls: buildFallbackUrls(params),
      error: e instanceof Error ? e.message : "Rentcast error",
    };
  }
}
