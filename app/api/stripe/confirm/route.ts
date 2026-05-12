import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Called by the success page with the Checkout session id. Verifies that
// the session is paid, then returns the tier so the client can persist
// to Firestore. (We don't have firebase-admin SDK; client writes the
// tier under its own uid, which is fine — Stripe is the source of truth
// and the success_url only opens after Stripe redirects.)

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { sessionId: string };
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 500 },
    );
  }
  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.retrieve(body.sessionId);
    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json(
        { error: "Session not paid", status: session.status },
        { status: 402 },
      );
    }
    const tier = (session.metadata?.plan as "pro" | "business") ?? "pro";
    return NextResponse.json({
      tier,
      uid: session.client_reference_id,
      customerId:
        typeof session.customer === "string"
          ? session.customer
          : (session.customer?.id ?? null),
      subscriptionId:
        typeof session.subscription === "string"
          ? session.subscription
          : (session.subscription?.id ?? null),
    });
  } catch (e) {
    console.error("[stripe confirm]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Confirm failed" },
      { status: 500 },
    );
  }
}
