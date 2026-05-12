"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getFirebaseAuth, onAuthStateChanged } from "@/lib/firebase";
import { setUserTier, type SubscriptionTier } from "@/lib/subscription";

export default function BillingSuccessPage() {
  const params = useSearchParams();
  const sessionId = params?.get("session_id");
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [tier, setTier] = useState<SubscriptionTier>("pro");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!sessionId) {
        setStatus("error");
        setErrorMsg("Missing session id");
        return;
      }
      try {
        const res = await fetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = (await res.json()) as {
          tier?: SubscriptionTier;
          customerId?: string;
          subscriptionId?: string;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Confirm failed");

        const auth = getFirebaseAuth();
        const user = auth?.currentUser;
        if (!user) {
          // Wait once for auth to initialize, then retry — Stripe redirect
          // can land before Firebase hydrates the session.
          await new Promise<void>((resolve) => {
            if (!auth) return resolve();
            const off = onAuthStateChanged(auth, () => {
              off();
              resolve();
            });
            setTimeout(resolve, 2500);
          });
        }
        const auth2 = getFirebaseAuth();
        const uid = auth2?.currentUser?.uid;
        if (!uid) throw new Error("Signed out — cannot apply upgrade");
        const newTier = data.tier ?? "pro";
        await setUserTier(uid, newTier, {
          stripeCustomerId: data.customerId,
          stripeSubscriptionId: data.subscriptionId,
        });
        if (cancelled) return;
        setTier(newTier);
        setStatus("done");
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(e instanceof Error ? e.message : "Upgrade failed");
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <main className="min-h-screen bg-[#050507] text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8 text-center">
        {status === "working" && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-sky-400/40 border-t-sky-400 animate-spin" />
            <h1 className="text-xl font-semibold">Finalizing your upgrade…</h1>
            <p className="mt-2 text-sm text-white/50">
              Confirming payment with Stripe.
            </p>
          </>
        )}
        {status === "done" && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-400" />
            <h1 className="text-2xl font-semibold">
              Welcome to Alto {tier === "business" ? "Business" : "Pro"}
            </h1>
            <p className="mt-2 text-sm text-white/60">
              All features unlocked. Mortgage, real estate, scenario modeling,
              and Plaid bank-linking are now available.
            </p>
            <Link
              href="/chat"
              className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90"
            >
              Back to chat →
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-xl font-semibold text-rose-300">
              Upgrade couldn&apos;t complete
            </h1>
            <p className="mt-2 text-sm text-white/60">
              {errorMsg ?? "Something went wrong."}
            </p>
            <Link
              href="/billing"
              className="mt-6 inline-block px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20"
            >
              Try again
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
