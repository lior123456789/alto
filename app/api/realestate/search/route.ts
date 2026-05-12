import { NextRequest, NextResponse } from "next/server";
import { searchListings, type ListingSearchParams } from "@/lib/realestate";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const params = (await req.json()) as ListingSearchParams;
    const result = await searchListings(params);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { ok: false, listings: [], source: "fallback", error: e instanceof Error ? e.message : "search error" },
      { status: 500 },
    );
  }
}
