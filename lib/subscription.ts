"use client";

// Subscription tier — stored on `users/{uid}` in Firestore.
// Anonymous (signed-out) users are always "free".
// On the server, tier is read from the user doc inside webhooks /
// gated API routes. Client gates use `useSubscription()`.

import { useEffect, useState } from "react";
import {
  getFirebaseAuth,
  getFirebaseDb,
  onAuthStateChanged,
} from "@/lib/firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

export type SubscriptionTier = "free" | "pro" | "business";

export interface TierLimits {
  maxConversationsPerMonth: number; // Infinity = unlimited
  maxCoverageItems: number;
  canUseMortgage: boolean;
  canUseRealEstate: boolean;
  canUseLifeEvent: boolean; // life-event modeling
  canUsePlaid: boolean;
  canSaveHistory: boolean;
  canExport: boolean;
  canSetRateAlerts: boolean;
  canCompareScenarios: boolean;
  whiteLabel: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    maxConversationsPerMonth: 5,
    maxCoverageItems: 1,
    canUseMortgage: false,
    canUseRealEstate: false,
    canUseLifeEvent: false,
    canUsePlaid: false,
    canSaveHistory: false,
    canExport: false,
    canSetRateAlerts: false,
    canCompareScenarios: false,
    whiteLabel: false,
  },
  pro: {
    maxConversationsPerMonth: Number.POSITIVE_INFINITY,
    maxCoverageItems: Number.POSITIVE_INFINITY,
    canUseMortgage: true,
    canUseRealEstate: true,
    canUseLifeEvent: true,
    canUsePlaid: true,
    canSaveHistory: true,
    canExport: true,
    canSetRateAlerts: true,
    canCompareScenarios: true,
    whiteLabel: false,
  },
  business: {
    maxConversationsPerMonth: Number.POSITIVE_INFINITY,
    maxCoverageItems: Number.POSITIVE_INFINITY,
    canUseMortgage: true,
    canUseRealEstate: true,
    canUseLifeEvent: true,
    canUsePlaid: true,
    canSaveHistory: true,
    canExport: true,
    canSetRateAlerts: true,
    canCompareScenarios: true,
    whiteLabel: true,
  },
};

// ─── Firestore read/write ────────────────────────────────────────────

export async function getUserTier(uid: string): Promise<SubscriptionTier> {
  const db = getFirebaseDb();
  if (!db) return "free";
  const snap = await getDoc(doc(db, "users", uid));
  const tier = snap.data()?.subscriptionTier as SubscriptionTier | undefined;
  return tier ?? "free";
}

export async function setUserTier(
  uid: string,
  tier: SubscriptionTier,
  extras: Record<string, unknown> = {},
) {
  const db = getFirebaseDb();
  if (!db) return;
  await setDoc(
    doc(db, "users", uid),
    {
      subscriptionTier: tier,
      subscriptionUpdatedAt: serverTimestamp(),
      ...extras,
    },
    { merge: true },
  );
}

// ─── Hook ────────────────────────────────────────────────────────────

export function useSubscription(): {
  tier: SubscriptionTier;
  limits: TierLimits;
  uid: string | null;
  loading: boolean;
} {
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const db = getFirebaseDb();
    if (!auth || !db) {
      setLoading(false);
      return;
    }
    let unsubFs: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubFs) {
        unsubFs();
        unsubFs = null;
      }
      if (!user) {
        setUid(null);
        setTier("free");
        setLoading(false);
        return;
      }
      setUid(user.uid);
      unsubFs = onSnapshot(doc(db, "users", user.uid), (snap) => {
        const t = (snap.data()?.subscriptionTier as SubscriptionTier) ?? "free";
        setTier(t);
        setLoading(false);
      });
    });
    return () => {
      unsubAuth();
      if (unsubFs) unsubFs();
    };
  }, []);

  return { tier, limits: TIER_LIMITS[tier], uid, loading };
}

// ─── Conversation counter (free-tier rate limit) ─────────────────────
//
// Free tier gets N conversations per calendar month. Tracked client-side
// on the user doc — server can re-validate from the same field.

export async function bumpConversationCount(uid: string): Promise<number> {
  const db = getFirebaseDb();
  if (!db) return 0;
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  const data = snap.data() ?? {};
  const monthKey = currentMonthKey();
  const current =
    data.conversationCountMonth === monthKey
      ? (data.conversationCount as number) ?? 0
      : 0;
  const next = current + 1;
  await setDoc(
    ref,
    {
      conversationCount: next,
      conversationCountMonth: monthKey,
    },
    { merge: true },
  );
  return next;
}

export async function getConversationCount(uid: string): Promise<number> {
  const db = getFirebaseDb();
  if (!db) return 0;
  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.data() ?? {};
  if (data.conversationCountMonth !== currentMonthKey()) return 0;
  return (data.conversationCount as number) ?? 0;
}

function currentMonthKey(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
