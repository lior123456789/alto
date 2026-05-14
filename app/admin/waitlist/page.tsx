"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Send } from "lucide-react";
import { AltoLogo } from "@/components/ui/AltoLogo";
import {
  getFirebaseAuth,
  getFirebaseDb,
  onAuthStateChanged,
  signInWithGoogle,
} from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";

interface WaitlistEntry {
  id: string;
  email: string;
  source?: string;
  createdAt?: string;
  userAgent?: string;
}

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";
const TOKEN_KEY = "alto.admin.token";

export default function AdminWaitlistPage() {
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [sendStats, setSendStats] = useState<{ sent: number; failed: number } | null>(
    null,
  );

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setAuthReady(true);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setAuthEmail(u?.email ?? null);
      setAuthReady(true);
    });
  }, []);

  const isAdmin = useMemo(() => {
    if (!ADMIN_EMAIL) return false;
    return (
      authEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
    );
  }, [authEmail]);

  useEffect(() => {
    if (!isAdmin) return;
    const run = async () => {
      setLoading(true);
      setLoadErr(null);
      try {
        const db = getFirebaseDb();
        if (!db) throw new Error("Firestore not configured");
        const q = query(
          collection(db, "waitlist"),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(q);
        setEntries(
          snap.docs.map((d) => {
            const data = d.data() as {
              email: string;
              source?: string;
              createdAt?: Timestamp;
              userAgent?: string;
            };
            return {
              id: d.id,
              email: data.email,
              source: data.source,
              userAgent: data.userAgent,
              createdAt: data.createdAt
                ? new Date(data.createdAt.seconds * 1000).toISOString()
                : undefined,
            };
          }),
        );
      } catch (e) {
        setLoadErr(
          e instanceof Error ? e.message : "Failed to load waitlist",
        );
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [isAdmin]);

  const getAdminToken = (): string | null => {
    let t = sessionStorage.getItem(TOKEN_KEY);
    if (!t) {
      t = prompt("Paste ADMIN_API_TOKEN") ?? "";
      if (t) sessionStorage.setItem(TOKEN_KEY, t);
    }
    return t || null;
  };

  const handleBroadcast = async () => {
    if (!subject.trim() || !html.trim()) return;
    if (
      !confirm(
        `Send "${subject}" to ${entries.length} recipient${entries.length === 1 ? "" : "s"}?`,
      )
    )
      return;
    const token = getAdminToken();
    if (!token) return;
    setSending(true);
    setSendStats({ sent: 0, failed: 0 });

    let sent = 0;
    let failed = 0;
    for (const entry of entries) {
      try {
        const res = await fetch("/api/admin/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: entry.email,
            subject,
            html,
          }),
        });
        if (res.ok) sent++;
        else failed++;
      } catch {
        failed++;
      }
      setSendStats({ sent, failed });
    }
    setSending(false);
  };

  const copyAll = () => {
    navigator.clipboard.writeText(entries.map((e) => e.email).join(", "));
  };

  if (!authReady) {
    return (
      <main className="min-h-screen bg-[#050507] text-white grid place-items-center">
        <p className="text-white/40 text-sm">Loading…</p>
      </main>
    );
  }

  if (!authEmail) {
    return (
      <main className="min-h-screen bg-[#050507] text-white grid place-items-center px-6">
        <div className="max-w-sm w-full text-center rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8">
          <h1 className="text-xl font-semibold mb-2">Admin sign-in</h1>
          <p className="text-sm text-white/50 mb-6">
            Only the admin email can view waitlist signups.
          </p>
          <button
            onClick={() => signInWithGoogle().catch(() => {})}
            className="w-full py-3 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90"
          >
            Sign in with Google
          </button>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#050507] text-white grid place-items-center px-6">
        <div className="max-w-sm w-full text-center rounded-2xl bg-white/[0.03] border border-white/[0.06] p-8">
          <h1 className="text-xl font-semibold text-rose-300 mb-2">
            Not authorized
          </h1>
          <p className="text-sm text-white/50">
            {authEmail} is not the admin. Set{" "}
            <code>NEXT_PUBLIC_ADMIN_EMAIL</code> to match.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050507] text-white">
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/[0.05]">
        <Link href="/" className="hover:opacity-80">
          <AltoLogo size={22} wordmark textClassName="text-white" />
        </Link>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-white/40">Admin · Waitlist</span>
          <span className="text-white/30">·</span>
          <span className="text-white/60">{authEmail}</span>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 pt-10 pb-24 space-y-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatTile label="Total signups" value={String(entries.length)} />
          <StatTile
            label="Last 24h"
            value={String(
              entries.filter((e) => {
                if (!e.createdAt) return false;
                return (
                  Date.now() - new Date(e.createdAt).getTime() <
                  86_400_000
                );
              }).length,
            )}
            accent="sky"
          />
          <StatTile
            label="Last 7d"
            value={String(
              entries.filter((e) => {
                if (!e.createdAt) return false;
                return (
                  Date.now() - new Date(e.createdAt).getTime() <
                  7 * 86_400_000
                );
              }).length,
            )}
            accent="emerald"
          />
        </div>

        {/* Broadcast composer */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h2 className="text-lg font-semibold mb-1">Send broadcast</h2>
          <p className="text-xs text-white/50 mb-5">
            Sends to all {entries.length} waitlist email
            {entries.length === 1 ? "" : "s"} via Resend. Goes one-at-a-time so
            you see per-recipient status.
          </p>
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full mb-3 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm placeholder:text-white/30 focus:outline-none focus:border-sky-400/60"
          />
          <textarea
            placeholder="HTML body (you can paste raw HTML — the email goes out as-is)"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            rows={10}
            className="w-full mb-4 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm font-mono placeholder:text-white/30 focus:outline-none focus:border-sky-400/60"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleBroadcast}
              disabled={
                sending || !subject.trim() || !html.trim() || entries.length === 0
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {sending
                ? `Sending… ${sendStats?.sent ?? 0}/${entries.length}`
                : `Send to all (${entries.length})`}
            </button>
            {sendStats && !sending && (
              <span className="text-xs text-white/60">
                Sent {sendStats.sent} · Failed {sendStats.failed}
              </span>
            )}
          </div>
        </div>

        {/* Signups table */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Signups</h2>
            <button
              onClick={copyAll}
              disabled={entries.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-xs text-white/70 hover:text-white disabled:opacity-40"
            >
              <Copy className="w-3 h-3" />
              Copy all emails
            </button>
          </div>
          {loading && <p className="text-sm text-white/50">Loading…</p>}
          {loadErr && (
            <p className="text-sm text-rose-300">
              {loadErr} — make sure your Firestore rules grant{" "}
              <code>list</code>/<code>read</code> on{" "}
              <code>waitlist</code> to your admin email.
            </p>
          )}
          {!loading && !loadErr && entries.length === 0 && (
            <p className="text-sm text-white/50">No signups yet.</p>
          )}
          {entries.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-white/40">
                    <th className="py-2 font-medium">Email</th>
                    <th className="py-2 font-medium">Source</th>
                    <th className="py-2 font-medium">Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr
                      key={e.id}
                      className="border-t border-white/[0.04]"
                    >
                      <td className="py-2.5 font-mono">{e.email}</td>
                      <td className="py-2.5 text-white/50 text-xs">
                        {e.source ?? "—"}
                      </td>
                      <td className="py-2.5 text-white/50 text-xs">
                        {e.createdAt
                          ? new Date(e.createdAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
      <div className={`mt-1 text-3xl font-semibold ${tint}`}>{value}</div>
    </div>
  );
}
