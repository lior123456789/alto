import { NextRequest, NextResponse } from "next/server";
import { createLinkToken, isPlaidConfigured } from "@/lib/plaid";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isPlaidConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Plaid not configured" },
      { status: 503 },
    );
  }
  try {
    const { sessionId } = (await req.json()) as { sessionId: string };
    const linkToken = await createLinkToken(sessionId);
    return NextResponse.json({ ok: true, linkToken });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Plaid error" },
      { status: 500 },
    );
  }
}
