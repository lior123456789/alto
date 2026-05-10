import { NextRequest, NextResponse } from "next/server";
import { fetchInsuranceQuotes } from "@/lib/insurance";
import type { FetchQuotesParams } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const params = (await req.json()) as FetchQuotesParams;
    const quotes = await fetchInsuranceQuotes(params);
    return NextResponse.json({ ok: true, quotes });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Quote error" },
      { status: 500 },
    );
  }
}
