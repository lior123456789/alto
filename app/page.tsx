"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import FlowArt, { FlowSection } from "@/components/ui/story-scroll";
import { ScrollTiltedGrid } from "@/components/ui/scroll-tilted-grid";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { joinWaitlist } from "@/lib/waitlist";

export default function LandingPage() {
  return (
    <main className="bg-[#050507] text-white">
      {/* Top-right floating nav (no logo) */}
      <div className="fixed top-5 right-6 z-50 flex items-center gap-5">
        <a
          href="#waitlist"
          className="text-sm font-medium text-white/70 hover:text-white"
        >
          Join waitlist
        </a>
      </div>

      {/* HERO — flat single shade, waitlist form swapped in */}
      <section
        id="waitlist"
        className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-12 relative bg-[#050507]"
      >
        <WaitlistHero />
      </section>

      {/* WHAT IT DOES — ContainerScroll showing chat mockup */}
      <section className="bg-black">
        <ContainerScroll
          titleComponent={
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400/80">
                One conversation. Every provider.
              </p>
              <h2 className="mt-3 text-4xl md:text-6xl font-semibold tracking-tight text-white">
                Watch Alto work.
              </h2>
              <p className="mt-4 max-w-xl mx-auto text-white/60">
                Plain English in. Real quotes out. No tabs, no spreadsheets, no
                broker phone calls.
              </p>
            </div>
          }
        >
          <div className="h-full w-full bg-gradient-to-br from-[#0a0a14] to-[#0a1424] p-6 md:p-10 flex flex-col gap-4 overflow-hidden">
            <ChatBubble role="user">
              Buying a $375k home, need home insurance. What are my options?
            </ChatBubble>
            <ChatBubble role="alto">
              Got it. Quick check — any pets, pool, or trampoline on the
              property? They affect liability rates.
            </ChatBubble>
            <ChatBubble role="user">No on all three.</ChatBubble>
            <ChatBubble role="alto">
              Pulled live quotes for your area. State Farm is $98/mo with the
              lowest deductible. Travelers is $105/mo with green-rebuild
              upgrades. Allstate is $112/mo with claim forgiveness.
              <br />
              <br />
              My pick: State Farm — strong A++ rating and you save ~$168/yr
              vs. Allstate.
            </ChatBubble>
            <div className="grid grid-cols-3 gap-3 mt-2">
              <QuoteMini name="State Farm" price={98} pick />
              <QuoteMini name="Travelers" price={105} />
              <QuoteMini name="Allstate" price={112} />
            </div>
          </div>
        </ContainerScroll>
      </section>

      {/* STORY SCROLL — pinned full-screen sections */}
      <FlowArt aria-label="How Alto works">
        <FlowSection
          aria-label="Who we are"
          style={{ backgroundColor: "#0a0a14", color: "#fff" }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400/80">
            01 — Why Alto
          </p>
          <hr className="my-[2vw] border-none border-t border-white/20" />
          <div>
            <h2 className="text-[clamp(3.5rem,12vw,14rem)] font-bold leading-[0.85] uppercase tracking-tight">
              Brokers
              <br />
              Take
              <br />
              Too Much
            </h2>
          </div>
          <hr className="my-[2vw] border-none border-t border-white/20" />
          <p className="mt-auto max-w-[50ch] text-[clamp(1rem,2.5vw,2rem)] font-normal leading-relaxed text-white/70">
            Insurance brokers take 15% commissions. Mortgage brokers, 1–2% of
            the loan. Real estate agents, 5–6% of the price. Alto replaces all
            three with AI.
          </p>
        </FlowSection>

        <FlowSection
          aria-label="The mission"
          style={{ backgroundColor: "#000", color: "#fff" }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400/80">
            02 — How it works
          </p>
          <hr className="my-[2vw] border-none border-t border-white/30" />
          <div>
            <h2 className="text-[clamp(3.5rem,12vw,14rem)] font-bold leading-[0.85] uppercase tracking-tight">
              Talk.
              <br />
              Compare.
              <br />
              Apply.
            </h2>
          </div>
          <hr className="my-[2vw] border-none border-t border-white/30" />
          <div className="flex flex-wrap gap-[3vw]">
            <div className="min-w-[180px] flex-1">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-sky-400">
                01 — Tell Alto
              </p>
              <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed text-white/60">
                Plain English. Insurance, mortgage, or a home. Alto figures out
                what to ask next.
              </p>
            </div>
            <div className="min-w-[180px] flex-1">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-sky-400">
                02 — Alto shops
              </p>
              <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed text-white/60">
                Live partner APIs. Real rates. No call-back. No back-and-forth.
              </p>
            </div>
            <div className="min-w-[180px] flex-1">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-sky-400">
                03 — Apply direct
              </p>
              <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed text-white/60">
                One click to the lender or insurer. No price markup. No call
                back later.
              </p>
            </div>
          </div>
        </FlowSection>

        <FlowSection
          aria-label="Three verticals"
          style={{ backgroundColor: "#0a1424", color: "#fff" }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400/80">
            03 — Three verticals
          </p>
          <hr className="my-[2vw] border-none border-t border-white/30" />
          <div>
            <h2 className="text-[clamp(3.5rem,12vw,14rem)] font-bold leading-[0.85] uppercase tracking-tight">
              One
              <br />
              Conversation.
              <br />
              Three Wins.
            </h2>
          </div>
          <hr className="my-[2vw] border-none border-t border-white/30" />
          <div className="flex flex-wrap gap-[3vw]">
            <div className="min-w-[180px] flex-1">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-sky-400">
                Insurance
              </p>
              <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed text-white/60">
                Home, renters, auto, life. Live quotes from Lemonade, Progressive,
                State Farm, more.
              </p>
            </div>
            <div className="min-w-[180px] flex-1">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-sky-400">
                Mortgage
              </p>
              <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed text-white/60">
                Purchase or refi. Rates from Rocket, Better.com, Credible —
                ranked for you.
              </p>
            </div>
            <div className="min-w-[180px] flex-1">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider text-sky-400">
                Real estate
              </p>
              <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed text-white/60">
                Buy, rent, or sell. Listings + iBuyer offers from Opendoor,
                Redfin, Realtor.com.
              </p>
            </div>
          </div>
        </FlowSection>

        <FlowSection
          aria-label="The math"
          style={{ backgroundColor: "#0ea5e9", color: "#000" }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em]">
            04 — Real savings
          </p>
          <hr className="my-[2vw] border-none border-t border-black/40" />
          <div>
            <h2 className="text-[clamp(3.5rem,12vw,14rem)] font-bold leading-[0.85] uppercase tracking-tight">
              The
              <br />
              Math
              <br />
              Just Works.
            </h2>
          </div>
          <hr className="my-[2vw] border-none border-t border-black/40" />
          <div className="flex flex-wrap gap-[3vw]">
            <div className="min-w-[180px] flex-1">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider">
                $800
              </p>
              <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed opacity-80">
                Average yearly savings on home insurance vs. agent-quoted rates.
              </p>
            </div>
            <div className="min-w-[180px] flex-1">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider">
                0.4%
              </p>
              <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed opacity-80">
                Average mortgage-rate improvement vs. the user&apos;s primary
                bank.
              </p>
            </div>
            <div className="min-w-[180px] flex-1">
              <p className="mb-2 text-sm font-bold uppercase tracking-wider">
                $0
              </p>
              <p className="text-[clamp(0.85rem,1.3vw,1.05rem)] leading-relaxed opacity-80">
                Broker fees. Alto is free to use — always.
              </p>
            </div>
          </div>
        </FlowSection>

        <FlowSection
          aria-label="Get started"
          style={{ backgroundColor: "#000", color: "#fff" }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400/80">
            05 — Start
          </p>
          <hr className="my-[2vw] border-none border-t border-white/30" />
          <div>
            <h2 className="text-[clamp(3.5rem,12vw,14rem)] font-bold leading-[0.85] uppercase tracking-tight">
              Ready?
              <br />
              Join
              <br />
              Alto.
            </h2>
          </div>
          <hr className="my-[2vw] border-none border-t border-white/30" />
          <div className="mt-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
            <p className="max-w-[50ch] text-[clamp(1rem,2.5vw,2rem)] font-normal leading-relaxed text-white/70">
              30 seconds to your first quote — at launch. Early users get 3
              months of Pro free.
            </p>
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2 bg-white text-black px-6 py-4 rounded-2xl font-medium text-lg hover:bg-white/90 transition-all whitespace-nowrap"
            >
              <Sparkles className="w-5 h-5" />
              Join waitlist →
            </a>
          </div>
        </FlowSection>
      </FlowArt>

      {/* WAITLIST — visual flourish */}
      <section className="bg-black border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto px-6 pt-24 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400/80">
            Launching soon
          </p>
          <h2 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
            Join the waitlist — launching June 2026.
          </h2>
        </div>
        <ScrollTiltedGrid loop />
      </section>

      {/* FINAL CTA — waitlist */}
      <section className="bg-[#050507] py-32 px-6 text-center">
        <h2 className="text-4xl md:text-6xl font-semibold tracking-tight">
          Find your best rate
          <br />
          <span className="text-white/40">in 30 seconds.</span>
        </h2>
        <a
          href="#waitlist"
          className="inline-block mt-10 bg-white text-black px-8 py-4 rounded-2xl font-medium text-lg hover:bg-white/90"
        >
          Join waitlist →
        </a>
        <p className="mt-4 text-xs text-white/40">
          Free to use at launch. No commissions. No bias.
        </p>
      </section>

      <footer className="bg-black px-6 py-12 text-center text-sm text-white/40 border-t border-white/[0.05]">
        Alto ·{" "}
        <a href="https://altobroker.us" className="hover:text-white/70">
          altobroker.us
        </a>
      </footer>
    </main>
  );
}

function WaitlistHero() {
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
    <div className="relative z-10 w-full max-w-3xl mx-auto text-center">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.2em] text-sky-300/80 mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        Launching June 2026
      </span>

      <h1 className="text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
        Skip the broker.
        <br />
        <span className="text-white/40">Get the best deal.</span>
      </h1>

      <p className="mt-6 max-w-xl mx-auto text-base md:text-lg text-white/60">
        Alto is the AI that replaces brokers across insurance, mortgage, and
        real estate. One conversation, every provider, no commissions.
      </p>

      {status === "done" ? (
        <div className="mt-10 max-w-md w-full mx-auto rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-6">
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
          className="mt-10 w-full max-w-md mx-auto flex flex-col sm:flex-row gap-2"
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

      {showDevLinks && (
        <div className="mt-10 flex items-center justify-center gap-4 text-xs text-white/40">
          <span className="rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200 px-2 py-0.5">
            dev preview
          </span>
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
    </div>
  );
}

function ChatBubble({
  role,
  children,
}: {
  role: "user" | "alto";
  children: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? "bg-white text-black"
            : "bg-white/[0.06] text-white/90 border border-white/[0.05]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function QuoteMini({
  name,
  price,
  pick,
}: {
  name: string;
  price: number;
  pick?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        pick
          ? "bg-sky-500/10 border-sky-400/40"
          : "bg-white/[0.03] border-white/[0.05]"
      }`}
    >
      {pick && (
        <div className="text-[10px] font-medium text-sky-300 mb-1">
          Alto&apos;s pick
        </div>
      )}
      <div className="text-sm font-medium text-white/90">{name}</div>
      <div className="text-2xl font-bold text-white mt-1">${price}</div>
      <div className="text-xs text-white/40">/mo</div>
    </div>
  );
}
