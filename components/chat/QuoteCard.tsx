"use client";

import type { InsuranceQuote } from "@/types";

interface QuoteCardProps {
  quote: InsuranceQuote;
  isRecommended?: boolean;
  conversationId: string;
}

export function QuoteCard({
  quote,
  isRecommended,
  conversationId,
}: QuoteCardProps) {
  const handleApply = async () => {
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          provider: quote.provider,
          vertical: "insurance",
          monthlyPrice: quote.monthlyPrice,
        }),
      });
    } catch {
      /* lead tracking is best-effort */
    }
    window.open(quote.applyUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className={`rounded-2xl p-5 ${
        isRecommended
          ? "bg-sky-500/[0.06] border border-sky-400/30"
          : "bg-white/[0.03] border border-white/[0.06]"
      }`}
    >
      {isRecommended && (
        <div className="text-[11px] font-medium text-sky-300 bg-sky-500/10 px-2 py-1 rounded-full inline-block mb-3">
          Alto&apos;s pick
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-semibold text-white text-base">
            {quote.provider}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-sm text-white/60">{quote.rating}</span>
            <span className="text-white/30 mx-1">·</span>
            <span className="text-sm text-white/60">
              Claims: {quote.claimsRating}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold text-white">
            ${quote.monthlyPrice}
          </div>
          <div className="text-xs text-white/40">/month</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4 py-3 border-t border-b border-white/[0.06]">
        <Stat label="Dwelling" value={`$${(quote.coverage.dwelling / 1000).toFixed(0)}K`} />
        <Stat label="Liability" value={`$${(quote.coverage.liability / 1000).toFixed(0)}K`} />
        <Stat label="Deductible" value={`$${quote.coverage.deductible.toLocaleString()}`} />
      </div>

      <ul className="mb-5 space-y-1.5">
        {quote.highlights.map((h) => (
          <li
            key={h}
            className="text-sm text-white/70 flex items-center gap-2"
          >
            <span className="text-sky-400">✓</span> {h}
          </li>
        ))}
      </ul>

      <button
        onClick={handleApply}
        className={`w-full py-3 rounded-xl font-medium text-sm transition-all ${
          isRecommended
            ? "bg-sky-500 text-white hover:bg-sky-400"
            : "bg-white text-black hover:bg-white/90"
        }`}
      >
        Continue at {quote.provider} →
      </button>

      <p className="text-[10px] text-white/30 text-center mt-3 leading-relaxed">
        Rates and coverage estimates are based on the information you
        provided and current market data. Final rates are determined by
        each provider upon full application review. Alto is not a
        licensed insurance agent or mortgage broker.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-white/40 uppercase tracking-wider">
        {label}
      </div>
      <div className="text-sm font-medium text-white mt-0.5">{value}</div>
    </div>
  );
}
