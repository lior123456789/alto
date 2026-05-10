"use client";

import { useEffect, useState, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Building2, ShieldCheck, LoaderIcon, CheckCircle2 } from "lucide-react";
import type { PlaidSummary } from "@/types";

interface Props {
  sessionId: string;
  onLinked: (summary: PlaidSummary) => void;
}

export function PlaidLinkCard({ sessionId, onLinked }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<PlaidSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/plaid/create-link-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const d = await r.json();
        if (!d.ok) throw new Error(d.error);
        setLinkToken(d.link_token);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Plaid setup failed");
      }
    })();
  }, [sessionId]);

  const onSuccess = useCallback(
    async (publicToken: string) => {
      setBusy(true);
      setErr(null);
      try {
        // Step 4: exchange public_token → access_token (server-side)
        const exchange = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken, sessionId }),
        });
        const exchangeData = await exchange.json();
        if (!exchangeData.ok) throw new Error(exchangeData.error);

        // Step 5: build Asset Report and pull the summary
        const assets = await fetch("/api/plaid/get-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const assetsData = await assets.json();
        if (!assetsData.ok) throw new Error(assetsData.error);

        setDone(assetsData.summary);
        onLinked(assetsData.summary);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Bank link failed");
      } finally {
        setBusy(false);
      }
    },
    [sessionId, onLinked],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  if (done) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-sky-500/5 border border-emerald-400/30 p-5">
        <div className="flex items-center gap-2 text-emerald-300 mb-3">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-[11px] font-medium uppercase tracking-wider">
            Bank linked · {done.primaryAccount}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Cash" value={`$${done.totalCash.toLocaleString()}`} />
          <Stat
            label="Total assets"
            value={`$${done.totalAssets.toLocaleString()}`}
          />
          <Stat
            label="Monthly income"
            value={`$${done.monthlyIncomeEstimate.toLocaleString()}`}
          />
        </div>
        <p className="mt-4 text-xs text-white/50">
          Alto is using these numbers to find the best mortgage offers for you.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-500/[0.10] to-indigo-500/[0.06] border border-sky-400/30 p-5">
      <div className="flex items-center gap-2 text-sky-300 mb-3">
        <Building2 className="w-4 h-4" />
        <span className="text-[11px] font-medium uppercase tracking-wider">
          Connect bank · 30 sec
        </span>
      </div>
      <h3 className="text-xl font-semibold text-white">
        Link your bank for accurate mortgage offers
      </h3>
      <p className="mt-1 text-sm text-white/60">
        Alto uses real income + assets from Plaid (the same secure tech your
        bank uses) to match you with lenders. Read-only — Alto never moves
        money.
      </p>

      <button
        onClick={() => open()}
        disabled={!ready || busy}
        className="mt-5 w-full bg-sky-500 hover:bg-sky-400 text-white rounded-xl py-3.5 font-medium text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {busy ? (
          <>
            <LoaderIcon className="w-4 h-4 animate-spin" />
            Pulling income & assets…
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            Connect bank with Plaid
          </>
        )}
      </button>

      {err && <p className="mt-3 text-xs text-red-400">{err}</p>}

      <p className="mt-3 text-[11px] text-white/40 text-center">
        Bank-grade encryption. Alto only sees account totals + income — never
        login credentials.
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
      <div className="text-base font-semibold text-white mt-0.5">{value}</div>
    </div>
  );
}
