import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin-only email send. Gate with a shared token to keep this endpoint
// from being abused by anyone who finds the URL. The admin UI prompts
// once for the token and stores in sessionStorage.

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_API_TOKEN not set on server" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== expected) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const body = (await req.json()) as {
    to: string | string[];
    subject: string;
    html: string;
    replyTo?: string;
  };
  if (!body.to || !body.subject || !body.html) {
    return NextResponse.json(
      { ok: false, error: "to, subject, html required" },
      { status: 400 },
    );
  }
  const result = await sendEmail({
    to: body.to,
    subject: body.subject,
    html: body.html,
    replyTo: body.replyTo,
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
