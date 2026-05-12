"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Building2, Sparkles } from "lucide-react";
import type { MortgageOfferLite, MortgageProfileLite } from "@/types";

interface Props {
  offers: MortgageOfferLite[];
  profile: MortgageProfileLite;
  baseRate?: number;
  baseRateSource?: "fred" | "fallback";
}

interface ProfileField {
  label: string;
  value: string;
}

export function MortgageOffersCard({
  offers,
  profile,
  baseRate,
  baseRateSource,
}: Props) {
  const fields = buildProfileFields(profile);
  const fullProfileText = fields
    .map((f) => `${f.label}: ${f.value}`)
    .join("\n");

  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyField = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      /* ignore */
    }
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(fullProfileText);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2200);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-3">
      {/* Banner — explains the flow */}
      <div className="rounded-2xl bg-sky-500/[0.08] border border-sky-400/30 px-4 py-3 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-sky-300 mt-0.5 shrink-0" />
        <p className="text-[13px] leading-relaxed text-white/85">
          Your profile is ready. Click any lender to start your application —
          use the profile card below to fill out their form in under 2 minutes.
        </p>
      </div>

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
            Apply at {offer.lender} →
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ))}

      {/* Rate disclaimer — directly under the offers list */}
      <p className="text-[11px] text-white/40 text-center px-4">
        Rates shown are based on the current Freddie Mac PMMS weekly average
        {baseRate ? ` (${baseRate}%)` : ""}
        {baseRateSource === "fallback" ? " — cached fallback" : ""}. Your
        actual rate depends on credit score, loan size, and lender review.
      </p>

      {/* Profile reference card — copy each field or the whole thing */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[13px] font-semibold text-white">
              Your application profile
            </div>
            <div className="text-[11px] text-white/40 mt-0.5">
              Tap any value to copy it. Use this while filling out the
              lender&apos;s form.
            </div>
          </div>
          <button
            onClick={copyAll}
            className="text-[12px] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 transition-colors shrink-0"
          >
            {copiedAll ? (
              <>
                <Check className="w-3 h-3" /> Copied all
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> Copy full profile
              </>
            )}
          </button>
        </div>
        <div className="space-y-1.5">
          {fields.map((f) => {
            const isCopied = copiedKey === f.label;
            return (
              <button
                key={f.label}
                onClick={() => copyField(f.label, f.value)}
                className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left group"
              >
                <span className="text-[11px] text-white/40 uppercase tracking-wider w-32 shrink-0">
                  {f.label}
                </span>
                <span className="text-[13px] text-white/90 font-mono flex-1 truncate">
                  {f.value}
                </span>
                <span className="text-white/30 group-hover:text-white/80 transition-colors shrink-0">
                  {isCopied ? (
                    <Check className="w-3.5 h-3.5 text-sky-300" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function buildProfileFields(p: MortgageProfileLite): ProfileField[] {
  const fields: ProfileField[] = [];
  const fullName = [p.first_name, p.last_name].filter(Boolean).join(" ");
  if (fullName) fields.push({ label: "Full name", value: fullName });
  if (p.email) fields.push({ label: "Email", value: p.email });
  if (p.phone_number) fields.push({ label: "Phone", value: p.phone_number });
  if (p.zip_code) fields.push({ label: "Zip code", value: p.zip_code });
  if (p.state) fields.push({ label: "State", value: p.state });
  if (p.city) fields.push({ label: "City", value: p.city });
  if (p.property_value)
    fields.push({
      label: "Home price",
      value: `$${p.property_value.toLocaleString()}`,
    });
  if (p.loan_amount)
    fields.push({
      label: "Loan amount",
      value: `$${p.loan_amount.toLocaleString()}`,
    });
  if (p.down_payment)
    fields.push({
      label: "Down payment",
      value: `$${p.down_payment.toLocaleString()}`,
    });
  if (p.credit_score_range)
    fields.push({ label: "Credit range", value: p.credit_score_range });
  if (p.annual_income)
    fields.push({
      label: "Annual income",
      value: `$${p.annual_income.toLocaleString()}`,
    });
  if (p.total_assets)
    fields.push({
      label: "Liquid assets",
      value: `$${p.total_assets.toLocaleString()}`,
    });
  return fields;
}
