import { NextRequest, NextResponse } from "next/server";
import {
  submitLeadToEverQuote,
  isEverQuoteConfigured,
  type AltoUserProfile,
} from "@/lib/everquote";
import { createServerClient } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    profile: AltoUserProfile;
    conversationId: string;
  };
  const { profile, conversationId } = body;

  if (!isEverQuoteConfigured()) {
    return NextResponse.json(
      {
        success: false,
        reason:
          "EverQuote API isn't configured — set EVERQUOTE_USERNAME / EVERQUOTE_PASSWORD on the server.",
      },
      { status: 503 },
    );
  }

  try {
    const { response, earnedCents } = await submitLeadToEverQuote(profile);

    // Best-effort persist; never block the response on Supabase
    try {
      const supabase = createServerClient();
      if (supabase) {
        await supabase.from("leads").insert({
          conversation_id: conversationId,
          provider: "everquote",
          vertical: profile.insurance_type,
          everquote_uuid: response.uuid,
          status: response.accept ? "accepted" : "rejected",
          bid_cents: response.bid_cents,
          duration_seconds: response.duration_seconds,
          referral_fee: earnedCents / 100,
        });
      }
    } catch (e) {
      console.error("[everquote] supabase write failed:", e);
    }

    if (!response.accept) {
      return NextResponse.json({
        success: false,
        reason: response.reason || "EverQuote did not accept this lead",
        uuid: response.uuid,
      });
    }

    return NextResponse.json({
      success: true,
      uuid: response.uuid,
      earnedDollars: (earnedCents / 100).toFixed(2),
      callNumber: process.env.EVERQUOTE_CALL_NUMBER,
      durationSeconds: response.duration_seconds,
    });
  } catch (err) {
    console.error("[everquote] submission error:", err);
    return NextResponse.json(
      {
        success: false,
        reason: err instanceof Error ? err.message : "API error",
      },
      { status: 500 },
    );
  }
}
