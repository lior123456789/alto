"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { joinWaitlist } from "@/lib/waitlist";

export default function WaitlistLanding() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [showDevLinks, setShowDevLinks] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") setShowDevLinks(true);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrMsg(null);
    try {
      await joinWaitlist(email);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrMsg(err instanceof Error ? err.message : "Couldn't add you");
    }
  };

  return (
    <main className="min-h-screen bg-[#050507] text-white flex flex-col">
      {/* Backdrop glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-20%] h-[60vh] w-[60vw] -translate-x-1/2 rounded-full bg-sky-500/20 blur-[140px]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <span className="inline-block w-6 h-6 rounded-md bg-gradient-to-br from-sky-400 to-sky-600 grid place-items-center text-white text-xs font-bold">
            A
          </span>
          Alto
        </div>
        {showDevLinks && (
          <div className="flex items-center gap-4 text-xs text-white/40">
            <span className="rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200 px-2 py-0.5">
              dev preview
            </span>
            <Link href="/landing" className="hover:text-white">
              Full landing
            </Link>
            <Link href="/chat" className="hover:text-white">
              Chat
            </Link>
            <Link href="/billing" className="hover:text-white">
              Billing
            </Link>
            <Link href="/dashboard/coverage" className="hover:text-white">
              Coverage
            </Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-24 text-center">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-sky-300/80 mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Launching June 2026
        </span>

        <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] max-w-3xl">
          Skip the broker.
          <br />
          <span className="text-white/40">Get the best deal.</span>
        </h1>

        <p className="mt-6 max-w-xl text-base md:text-lg text-white/60">
          Alto is the AI that replaces brokers across insurance, mortgage, and
          real estate. One conversation, every provider, no commissions.
        </p>

        {status === "done" ? (
          <div className="mt-10 max-w-md w-full rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-6 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-300 mb-3" />
            <h2 className="text-lg font-semibold text-white">
              You&apos;re on the list.
            </h2>
            <p className="mt-1 text-sm text-white/60">
              We&apos;ll email you the moment Alto goes live.
            </p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            className="mt-10 w-full max-w-md flex flex-col sm:flex-row gap-2"
          >
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
              className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/30 focus:outline-none focus:border-sky-400/60 focus:bg-white/[0.06]"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-60"
            >
              {status === "loading" ? "Joining…" : "Join waitlist"}
              {status !== "loading" && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        )}

        {status === "error" && errMsg && (
          <p className="mt-3 text-sm text-rose-300">{errMsg}</p>
        )}

        <p className="mt-4 text-xs text-white/35">
          Early users get 3 months of Pro free.
        </p>
      </section>

      <footer className="relative z-10 px-6 py-8 text-center text-xs text-white/35 border-t border-white/[0.05]">
        Alto ·{" "}
        <a href="https://altobroker.us" className="hover:text-white/70">
          altobroker.us
        </a>
      </footer>
    </main>
  );
}
