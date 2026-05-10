import { NextRequest, NextResponse } from "next/server";
import { trackLead } from "@/lib/leads";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      conversationId: string;
      provider: string;
      vertical: string;
      monthlyPrice: number;
    };
    await trackLead(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Lead error" },
      { status: 500 },
    );
  }
}
