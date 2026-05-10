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
    return NextResponse.json({ ok: true, link_token: linkToken });
  } catch (e) {
    const err = e as { response?: { data?: unknown }; message?: string };
    const plaidPayload = err?.response?.data;
    console.error("[plaid/create-link-token]", plaidPayload ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "Plaid error",
        plaid: plaidPayload ?? null,
      },
      { status: 500 },
    );
  }
}
