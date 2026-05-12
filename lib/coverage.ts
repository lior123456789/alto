"use client";

// Coverage storage layer.
//
// • Signed-in users  → Firestore at  users/{uid}/coverage/{coverageId}
// • Anonymous users  → localStorage  (alto.coverage.v1)
// • On first sign-in any localStorage items are migrated into Firestore
//   and then cleared locally.
//
// Schema is identical in both stores so the dashboard reads the same
// shape regardless of source.

import {
  getFirebaseDb,
  getFirebaseAuth,
  onAuthStateChanged,
} from "@/lib/firebase";
import { getUserTier, TIER_LIMITS } from "@/lib/subscription";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  type Timestamp,
} from "firebase/firestore";

export type CoverageType = "auto" | "home" | "renters" | "mortgage";
export type CoverageStatus =
  | "shopping"
  | "applied"
  | "active"
  | "cancelled";

export interface CoverageItem {
  id: string;
  sessionId: string;
  provider: string;
  type: CoverageType;
  monthly_price: number;
  annual_price: number;
  coverage_details: Record<string, unknown>;
  status: CoverageStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SaveCoveragePayload {
  provider: string;
  type: CoverageType;
  monthly_price: number;
  coverage: Record<string, unknown>;
  status?: CoverageStatus;
  notes?: string;
}

// ─── localStorage (anonymous) ─────────────────────────────────────────

const LS_KEY = "alto.coverage.v1";

function lsReadAll(): CoverageItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as CoverageItem[]) : [];
  } catch {
    return [];
  }
}

function lsWriteAll(items: CoverageItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function lsClear() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_KEY);
}

// ─── Firestore (signed-in) ────────────────────────────────────────────

function currentUserUid(): string | null {
  const auth = getFirebaseAuth();
  return auth?.currentUser?.uid ?? null;
}

function tsToIso(ts: Timestamp | { seconds: number } | undefined): string {
  if (!ts) return new Date().toISOString();
  const seconds =
    "seconds" in ts ? (ts as { seconds: number }).seconds : Date.now() / 1000;
  return new Date(seconds * 1000).toISOString();
}

async function fsList(uid: string): Promise<CoverageItem[]> {
  const db = getFirebaseDb();
  if (!db) return [];
  const q = query(
    collection(db, "users", uid, "coverage"),
    orderBy("updatedAt", "desc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      sessionId: data.sessionId ?? "",
      provider: data.provider,
      type: data.type,
      monthly_price: data.monthlyPrice ?? 0,
      annual_price: data.annualPrice ?? 0,
      coverage_details: data.coverageDetails ?? {},
      status: data.status ?? "shopping",
      notes: data.notes,
      created_at: tsToIso(data.createdAt),
      updated_at: tsToIso(data.updatedAt),
    } as CoverageItem;
  });
}

async function fsUpsert(
  uid: string,
  payload: SaveCoveragePayload,
  sessionId: string,
): Promise<CoverageItem> {
  const db = getFirebaseDb();
  if (!db) throw new Error("Firestore unavailable");
  // De-dupe by (uid, type) — one coverage per type per user
  const existing = await fsList(uid);
  const match = existing.find((c) => c.type === payload.type);
  const docId =
    match?.id ??
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2));

  const ref = doc(db, "users", uid, "coverage", docId);
  const fields = {
    sessionId,
    provider: payload.provider,
    type: payload.type,
    monthlyPrice: payload.monthly_price,
    annualPrice: payload.monthly_price * 12,
    coverageDetails: payload.coverage,
    status: payload.status ?? "shopping",
    notes: payload.notes ?? null,
    updatedAt: serverTimestamp(),
    ...(match ? {} : { createdAt: serverTimestamp() }),
  };
  await setDoc(ref, fields, { merge: true });

  const now = new Date().toISOString();
  return {
    id: docId,
    sessionId,
    provider: payload.provider,
    type: payload.type,
    monthly_price: payload.monthly_price,
    annual_price: payload.monthly_price * 12,
    coverage_details: payload.coverage,
    status: payload.status ?? "shopping",
    notes: payload.notes,
    created_at: match?.created_at ?? now,
    updated_at: now,
  };
}

async function fsUpdateStatus(uid: string, id: string, status: CoverageStatus) {
  const db = getFirebaseDb();
  if (!db) return;
  await updateDoc(doc(db, "users", uid, "coverage", id), {
    status,
    updatedAt: serverTimestamp(),
  });
}

async function fsDelete(uid: string, id: string) {
  const db = getFirebaseDb();
  if (!db) return;
  await deleteDoc(doc(db, "users", uid, "coverage", id));
}

// ─── Public API — dispatches by auth state ────────────────────────────

export async function saveCoverage(
  payload: SaveCoveragePayload,
  sessionId: string,
): Promise<CoverageItem> {
  const uid = currentUserUid();
  if (uid) {
    // Free-tier cap: max 1 saved coverage item. New saves UPDATE the
    // existing one of the same type (handled in fsUpsert), but adding
    // a *second* type would push past the cap.
    const tier = await getUserTier(uid);
    const cap = TIER_LIMITS[tier].maxCoverageItems;
    if (Number.isFinite(cap)) {
      const existing = await fsList(uid);
      const sameType = existing.find((c) => c.type === payload.type);
      if (!sameType && existing.length >= cap) {
        throw new Error(
          `Free plan limited to ${cap} saved coverage — upgrade to Pro for unlimited.`,
        );
      }
    }
    return fsUpsert(uid, payload, sessionId);
  }

  // Anonymous → localStorage
  const items = lsReadAll();
  // Anonymous users default to free-tier limits.
  const cap = TIER_LIMITS.free.maxCoverageItems;
  if (Number.isFinite(cap)) {
    const sameType = items.find((i) => i.type === payload.type);
    if (!sameType && items.length >= cap) {
      throw new Error(
        `Free plan limited to ${cap} saved coverage — upgrade to Pro for unlimited.`,
      );
    }
  }
  const now = new Date().toISOString();
  const idx = items.findIndex(
    (i) => i.sessionId === sessionId && i.type === payload.type,
  );
  const item: CoverageItem = {
    id:
      idx >= 0
        ? items[idx].id
        : typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2),
    sessionId,
    provider: payload.provider,
    type: payload.type,
    monthly_price: payload.monthly_price,
    annual_price: payload.monthly_price * 12,
    coverage_details: payload.coverage,
    status: payload.status ?? "shopping",
    notes: payload.notes,
    created_at: idx >= 0 ? items[idx].created_at : now,
    updated_at: now,
  };
  if (idx >= 0) items[idx] = item;
  else items.push(item);
  lsWriteAll(items);
  return item;
}

// Sync version — used by the dashboard for snappy first render.
// Always reads localStorage. Firestore data overlays in via subscribe().
export function listCoverage(): CoverageItem[] {
  return lsReadAll().sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

// Async version + real-time subscription for the signed-in path.
export function subscribeCoverage(
  cb: (items: CoverageItem[]) => void,
): () => void {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();
  if (!auth || !db) {
    // No Firebase — emit localStorage once and return a no-op
    cb(listCoverage());
    return () => {};
  }

  let unsubFirestore: (() => void) | null = null;

  const handleAuthChange = async (user: ReturnType<typeof currentUserUid>) => {
    if (user) {
      // Migrate any anonymous localStorage items into Firestore once
      const local = lsReadAll();
      if (local.length > 0) {
        for (const i of local) {
          await fsUpsert(
            user,
            {
              provider: i.provider,
              type: i.type,
              monthly_price: i.monthly_price,
              coverage: i.coverage_details,
              status: i.status,
              notes: i.notes,
            },
            i.sessionId,
          ).catch(() => {});
        }
        lsClear();
      }
      // Subscribe to Firestore live updates
      const q = query(
        collection(db, "users", user, "coverage"),
        orderBy("updatedAt", "desc"),
      );
      unsubFirestore = onSnapshot(q, (snap) => {
        const items = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            sessionId: data.sessionId ?? "",
            provider: data.provider,
            type: data.type,
            monthly_price: data.monthlyPrice ?? 0,
            annual_price: data.annualPrice ?? 0,
            coverage_details: data.coverageDetails ?? {},
            status: data.status ?? "shopping",
            notes: data.notes,
            created_at: tsToIso(data.createdAt),
            updated_at: tsToIso(data.updatedAt),
          } as CoverageItem;
        });
        cb(items);
      });
    } else {
      if (unsubFirestore) unsubFirestore();
      unsubFirestore = null;
      cb(listCoverage());
    }
  };

  const unsubAuth = onAuthStateChanged(auth, (u) => {
    handleAuthChange(u?.uid ?? null);
  });
  // Emit synchronous initial state
  handleAuthChange(auth.currentUser?.uid ?? null);

  return () => {
    unsubAuth();
    if (unsubFirestore) unsubFirestore();
  };
}

export async function updateCoverageStatus(
  id: string,
  status: CoverageStatus,
) {
  const uid = currentUserUid();
  if (uid) {
    await fsUpdateStatus(uid, id, status);
    return;
  }
  const items = lsReadAll();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return;
  items[idx] = {
    ...items[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  lsWriteAll(items);
}

export async function deleteCoverage(id: string) {
  const uid = currentUserUid();
  if (uid) {
    await fsDelete(uid, id);
    return;
  }
  const items = lsReadAll().filter((i) => i.id !== id);
  lsWriteAll(items);
}
