import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRICE_IDS: Record<string, string | undefined> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY,
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
  business_yearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY,
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    plan: "pro" | "business";
    period: "monthly" | "yearly";
    uid: string | null;
    email?: string | null;
  };

  const key = `${body.plan}_${body.period}`;
  const priceId = PRICE_IDS[key];
  const secret = process.env.STRIPE_SECRET_KEY;

  // Dev fallback — no Stripe prices configured yet. The client will flip
  // the Firestore tier directly. This is gated on the server response so
  // the client can't trivially self-upgrade in prod (in prod, priceId &
  // secret will be set, and this branch is skipped).
  if (!priceId || !secret) {
    return NextResponse.json({
      mode: "dev_flip",
      tier: body.plan,
      reason: !secret
        ? "STRIPE_SECRET_KEY missing"
        : `${key} price ID not configured`,
    });
  }

  if (!body.uid) {
    return NextResponse.json(
      { error: "Sign in to upgrade" },
      { status: 401 },
    );
  }

  try {
    const stripe = new Stripe(secret);
    const origin =
      req.headers.get("origin") ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing`,
      client_reference_id: body.uid,
      customer_email: body.email ?? undefined,
      metadata: {
        uid: body.uid,
        plan: body.plan,
        period: body.period,
      },
      subscription_data: {
        metadata: {
          uid: body.uid,
          plan: body.plan,
        },
      },
      allow_promotion_codes: true,
    });
    return NextResponse.json({ mode: "stripe", url: session.url });
  } catch (e) {
    console.error("[stripe checkout]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 500 },
    );
  }
}
