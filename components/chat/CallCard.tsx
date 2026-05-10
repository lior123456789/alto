"use client";

import { Phone, Clock } from "lucide-react";
import type { LeadAccepted } from "@/types";

const VERTICAL_LABEL: Record<LeadAccepted["vertical"], string> = {
  auto: "Auto insurance",
  home: "Home insurance",
  renters: "Renters insurance",
};

export function CallCard({ lead }: { lead: LeadAccepted }) {
  const handleCall = () => {
    if (!lead.callNumber) return;
    window.location.href = `tel:${lead.callNumber.replace(/[^+\d]/g, "")}`;
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-500/[0.12] to-cyan-500/[0.06] border border-sky-400/30 p-5">
      <div className="flex items-center gap-2 text-[11px] font-medium text-sky-300 mb-3">
        <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse" />
        Live · {VERTICAL_LABEL[lead.vertical]} agent ready
      </div>

      <h3 className="text-xl font-semibold text-white">
        Connect now — no broker, no wait
      </h3>
      <p className="mt-1 text-sm text-white/60">
        Tap to call. You&apos;ll be routed straight to a licensed agent who can
        bind a policy today.
      </p>

      {lead.callNumber ? (
        <button
          onClick={handleCall}
          className="mt-5 w-full bg-sky-500 hover:bg-sky-400 text-white rounded-xl py-4 font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Phone className="w-4 h-4" />
          Call {lead.callNumber}
        </button>
      ) : (
        <div className="mt-5 w-full bg-white/[0.05] border border-white/10 text-white/60 rounded-xl py-4 text-sm text-center">
          Phone routing not yet configured. Check back shortly.
        </div>
      )}

      <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-white/40">
        <Clock className="w-3 h-3" />
        Connect within {lead.durationSeconds}s for the agent match · Ref{" "}
        {lead.uuid.slice(0, 8)}
      </div>
    </div>
  );
}
