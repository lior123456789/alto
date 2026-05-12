import { NextRequest, NextResponse } from "next/server";
import { sendEmail, waitlistWelcomeHtml } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { ok: false, error: "Invalid email" },
      { status: 400 },
    );
  }
  const result = await sendEmail({
    to: email,
    subject: "You're on the Alto waitlist",
    html: waitlistWelcomeHtml(),
    replyTo: process.env.ADMIN_EMAIL ?? undefined,
  });
  if (!result.ok) {
    // Don't fail the user's signup if email fails — log and return 200
    console.warn("[waitlist welcome] send failed:", result.error);
    return NextResponse.json({ ok: false, error: result.error });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
