import { NextRequest, NextResponse } from "next/server";
import { getFinancialSummary } from "@/lib/plaid";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = (await req.json()) as { sessionId: string };
    const summary = await getFinancialSummary(sessionId);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Plaid error" },
      { status: 500 },
    );
  }
}
