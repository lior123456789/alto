import { NextRequest, NextResponse } from "next/server";
import { exchangePublicToken, getFinancialSummary } from "@/lib/plaid";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { publicToken, sessionId } = (await req.json()) as {
      publicToken: string;
      sessionId: string;
    };
    await exchangePublicToken(publicToken, sessionId);
    const summary = await getFinancialSummary(sessionId);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Plaid error" },
      { status: 500 },
    );
  }
}
