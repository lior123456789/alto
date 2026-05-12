"use client";

import { ExternalLink, Home as HomeIcon } from "lucide-react";
import type { ListingResult } from "@/lib/realestate";

interface Props {
  listings: ListingResult[];
  fallbackUrls?: { name: string; url: string }[];
  source: "rentcast" | "fallback";
}

export function ListingsCard({ listings, fallbackUrls, source }: Props) {
  if (source === "fallback" || listings.length === 0) {
    return (
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-3">
          <HomeIcon className="w-4 h-4 text-sky-300" />
          <span className="text-[13px] font-medium text-white">
            Top places to keep searching
          </span>
        </div>
        <div className="space-y-2">
          {(fallbackUrls ?? []).map((f) => (
            <a
              key={f.name}
              href={f.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] transition-colors group"
            >
              <span className="text-[15px] text-white">{f.name}</span>
              <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-white" />
            </a>
          ))}
        </div>
        <p className="text-[11px] text-white/40 text-center mt-3">
          Each link is pre-filtered to your search.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((l, i) => (
        <div
          key={l.id}
          className={`rounded-2xl p-5 ${
            i === 0
              ? "bg-sky-500/[0.06] border border-sky-400/30"
              : "bg-white/[0.03] border border-white/[0.06]"
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-semibold text-white text-base">
                {l.addressLine1}
              </h3>
              <p className="text-[13px] text-white/50 mt-0.5">
                {l.city}
                {l.state ? `, ${l.state}` : ""}
                {l.zipCode ? ` ${l.zipCode}` : ""}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold text-white">
                ${l.price.toLocaleString()}
              </div>
              <div className="text-xs text-white/40">/month</div>
            </div>
          </div>

          <div className="flex gap-4 text-[13px] text-white/60 mb-4 border-t border-white/[0.06] pt-3">
            {l.bedrooms !== undefined && <span>{l.bedrooms} bed</span>}
            {l.bathrooms !== undefined && <span>{l.bathrooms} bath</span>}
            {l.squareFootage && (
              <span>{l.squareFootage.toLocaleString()} sqft</span>
            )}
            {l.propertyType && (
              <span className="text-white/40">· {l.propertyType}</span>
            )}
          </div>

          <a
            href={l.listingUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full py-3 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
              i === 0
                ? "bg-sky-500 hover:bg-sky-400 text-white"
                : "bg-white text-black hover:bg-white/90"
            }`}
          >
            View listing
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      ))}
    </div>
  );
}
