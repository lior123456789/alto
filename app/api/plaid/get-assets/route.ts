import { NextRequest, NextResponse } from "next/server";
import { createAndFetchAssetReport } from "@/lib/plaid";

export const runtime = "nodejs";

// Step 5: build the Asset Report from the stored access_token, poll until
// it's ready, and return only the derived FinancialSummary to the client.
// asset_report_token is stored server-side ONLY.
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = (await req.json()) as { sessionId: string };
    if (!sessionId) {
      return NextResponse.json(
        { ok: false, error: "sessionId required" },
        { status: 400 },
      );
    }
    const summary = await createAndFetchAssetReport(sessionId);
    return NextResponse.json({ ok: true, summary });
  } catch (e) {
    const err = e as { response?: { data?: unknown }; message?: string };
    console.error("[plaid/get-assets]", err?.response?.data ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Plaid error",
        plaid: err?.response?.data ?? null,
      },
      { status: 500 },
    );
  }
}
