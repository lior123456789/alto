import { NextRequest, NextResponse } from "next/server";
import { exchangePublicToken } from "@/lib/plaid";

export const runtime = "nodejs";

// Step 4: exchange the short-lived public_token for a long-lived access_token.
// access_token is stored server-side ONLY — never returned to the client.
export async function POST(req: NextRequest) {
  try {
    const { public_token, sessionId } = (await req.json()) as {
      public_token: string;
      sessionId: string;
    };
    if (!public_token || !sessionId) {
      return NextResponse.json(
        { ok: false, error: "public_token and sessionId required" },
        { status: 400 },
      );
    }
    const { itemId } = await exchangePublicToken(public_token, sessionId);
    return NextResponse.json({ ok: true, item_id: itemId });
  } catch (e) {
    const err = e as { response?: { data?: unknown }; message?: string };
    console.error("[plaid/exchange-token]", err?.response?.data ?? err);
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
