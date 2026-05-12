"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Building2 } from "lucide-react";
import type { MortgageOfferLite, MortgageProfileLite } from "@/types";

interface Props {
  offers: MortgageOfferLite[];
  profile: MortgageProfileLite;
}

export function MortgageOffersCard({ offers, profile }: Props) {
  const [copied, setCopied] = useState(false);

  const profileSummary = buildProfileSummary(profile);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(profileSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* clipboard might be blocked */
    }
  };

  return (
    <div className="space-y-3">
      {/* Offer list */}
      {offers.map((offer, i) => (
        <div
          key={offer.lender}
          className={`rounded-2xl p-5 ${
            i === 0
              ? "bg-sky-500/[0.06] border border-sky-400/30"
              : "bg-white/[0.03] border border-white/[0.06]"
          }`}
        >
          {i === 0 && (
            <div className="text-[11px] font-medium text-sky-300 bg-sky-500/10 px-2 py-1 rounded-full inline-block mb-3">
              Lowest rate
            </div>
          )}
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white/40" />
                <h3 className="font-semibold text-white text-base">
                  {offer.lender}
                </h3>
              </div>
              {offer.note && (
                <div className="text-[12px] text-white/50 mt-1.5 max-w-md">
                  {offer.note}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-white">
                {offer.estimatedRate}%
              </div>
              <div className="text-xs text-white/40">est. APR</div>
            </div>
          </div>

          {offer.estimatedMonthly > 0 && (
            <div className="flex justify-between text-sm border-t border-white/[0.06] pt-3 mb-4">
              <span className="text-white/50">Est. monthly payment</span>
              <span className="text-white font-medium">
                ${offer.estimatedMonthly.toLocaleString()}/mo
              </span>
            </div>
          )}

          <a
            href={offer.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              i === 0
                ? "bg-sky-500 hover:bg-sky-400 text-white"
                : "bg-white text-black hover:bg-white/90"
            }`}
          >
            {offer.prefillSupported
              ? "Apply — profile pre-filled"
              : "Apply on lender site"}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {!offer.prefillSupported && (
            <p className="text-[11px] text-white/40 text-center mt-2">
              Copy your profile below to paste into their form.
            </p>
          )}
        </div>
      ))}

      {/* Copy-able profile summary — for lenders without prefill support */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-medium text-white/50 uppercase tracking-wider">
            Your application profile
          </div>
          <button
            onClick={handleCopy}
            className="text-[12px] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> Copy
              </>
            )}
          </button>
        </div>
        <pre className="text-[12px] text-white/70 whitespace-pre-wrap font-mono leading-relaxed">
          {profileSummary}
        </pre>
      </div>
    </div>
  );
}

function buildProfileSummary(p: MortgageProfileLite): string {
  const lines: string[] = [];
  if (p.first_name || p.last_name)
    lines.push(`Name: ${[p.first_name, p.last_name].filter(Boolean).join(" ")}`);
  if (p.email) lines.push(`Email: ${p.email}`);
  if (p.phone_number) lines.push(`Phone: ${p.phone_number}`);
  if (p.city || p.state || p.zip_code)
    lines.push(
      `Property location: ${[p.city, p.state].filter(Boolean).join(", ")} ${p.zip_code ?? ""}`.trim(),
    );
  if (p.property_value)
    lines.push(`Property value: $${p.property_value.toLocaleString()}`);
  if (p.loan_amount)
    lines.push(`Loan amount: $${p.loan_amount.toLocaleString()}`);
  if (p.down_payment)
    lines.push(`Down payment: $${p.down_payment.toLocaleString()}`);
  if (p.credit_score_range)
    lines.push(`Credit range: ${p.credit_score_range}`);
  if (p.annual_income)
    lines.push(`Annual income: $${p.annual_income.toLocaleString()}`);
  if (p.total_assets)
    lines.push(`Liquid assets: $${p.total_assets.toLocaleString()}`);
  return lines.join("\n");
}
