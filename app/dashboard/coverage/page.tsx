"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  listCoverage,
  updateCoverageStatus,
  deleteCoverage,
  type CoverageItem,
  type CoverageStatus,
} from "@/lib/coverage";

const STATUS_STYLES: Record<CoverageStatus, string> = {
  shopping: "bg-amber-500/10 text-amber-300 border border-amber-400/30",
  applied: "bg-sky-500/10 text-sky-300 border border-sky-400/30",
  active: "bg-emerald-500/10 text-emerald-300 border border-emerald-400/30",
  cancelled: "bg-rose-500/10 text-rose-300 border border-rose-400/30",
};

export default function CoverageDashboardPage() {
  const [items, setItems] = useState<CoverageItem[]>([]);

  useEffect(() => {
    setItems(listCoverage());
  }, []);

  const refresh = () => setItems(listCoverage());

  const totalMonthly = items.reduce((s, i) => s + i.monthly_price, 0);
  const annualSpend = totalMonthly * 12;
  const savedVsBroker = Math.round(annualSpend * 0.12);

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/[0.05]">
        <Link
          href="/chat"
          className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to chat
        </Link>
        <h1 className="text-base font-semibold tracking-tight">My Coverage</h1>
        <div className="w-20" />
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-10 pb-24">
        {items.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-12 text-center">
            <h2 className="text-xl font-semibold text-white">
              Nothing saved yet
            </h2>
            <p className="mt-2 text-sm text-white/50 max-w-md mx-auto">
              Chat with Alto, get a quote you like, and say &ldquo;save
              it&rdquo; — your selection lands here.
            </p>
            <Link
              href="/chat"
              className="inline-block mt-6 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90"
            >
              Open chat →
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatTile
                label="Total monthly"
                value={`$${totalMonthly.toLocaleString()}/mo`}
              />
              <StatTile
                label="Saved vs broker"
                value={`$${savedVsBroker.toLocaleString()}/yr`}
                accent="emerald"
              />
              <StatTile
                label="Products covered"
                value={String(items.length)}
                accent="sky"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((item) => (
                <CoverageCard
                  key={item.id}
                  item={item}
                  onChange={refresh}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "sky" | "emerald";
}) {
  const tint =
    accent === "emerald"
      ? "text-emerald-300"
      : accent === "sky"
        ? "text-sky-300"
        : "text-white";
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
      <div className="text-[11px] text-white/40 uppercase tracking-wider">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${tint}`}>{value}</div>
    </div>
  );
}

function CoverageCard({
  item,
  onChange,
}: {
  item: CoverageItem;
  onChange: () => void;
}) {
  const onSetActive = () => {
    updateCoverageStatus(item.id, "active");
    onChange();
  };
  const onDelete = () => {
    if (confirm(`Remove ${item.provider} from your dashboard?`)) {
      deleteCoverage(item.id);
      onChange();
    }
  };

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{item.provider}</h3>
          <p className="text-xs text-white/50 mt-0.5 capitalize">
            {item.type} insurance
          </p>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-1 rounded-full uppercase tracking-wider ${STATUS_STYLES[item.status]}`}
        >
          {item.status}
        </span>
      </div>

      <div className="my-4">
        <span className="text-3xl font-semibold text-white">
          ${item.monthly_price.toLocaleString()}
        </span>
        <span className="text-sm text-white/50 ml-1">/mo</span>
        <p className="text-xs text-white/40 mt-0.5">
          ${item.annual_price.toLocaleString()}/yr
        </p>
      </div>

      <div className="bg-white/[0.02] rounded-xl p-3 mb-4 space-y-1.5">
        {Object.entries(item.coverage_details).map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between text-[13px]"
          >
            <span className="text-white/50 capitalize">
              {k.replace(/_/g, " ")}
            </span>
            <span className="text-white/90 font-mono">
              {typeof v === "number" ? formatNumber(v, k) : String(v)}
            </span>
          </div>
        ))}
      </div>

      {item.notes && (
        <p className="text-[11px] text-white/40 mb-3">{item.notes}</p>
      )}

      <div className="flex gap-2">
        {item.status !== "active" && (
          <button
            onClick={onSetActive}
            className="flex-1 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Mark as active
          </button>
        )}
        <button
          onClick={onDelete}
          className="flex-1 py-2 border border-white/10 hover:bg-white/[0.05] text-white/70 hover:text-white rounded-lg text-sm transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function formatNumber(n: number, key: string): string {
  const lower = key.toLowerCase();
  if (lower.includes("price") || lower.includes("amount") || lower.includes("loan")) {
    return `$${n.toLocaleString()}`;
  }
  if (lower.includes("rate")) return `${n}%`;
  if (n >= 10_000) return `$${(n / 1000).toFixed(0)}K`;
  return n.toLocaleString();
}
