"use client";

// Client-side coverage store. localStorage today; swap to Firestore by
// changing only the four functions in this file. Schema is stable.

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

const KEY = "alto.coverage.v1";

function readAll(): CoverageItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CoverageItem[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: CoverageItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export interface SaveCoveragePayload {
  provider: string;
  type: CoverageType;
  monthly_price: number;
  coverage: Record<string, unknown>;
  status?: CoverageStatus;
  notes?: string;
}

export function saveCoverage(
  payload: SaveCoveragePayload,
  sessionId: string,
): CoverageItem {
  const items = readAll();
  const now = new Date().toISOString();
  // Upsert by (sessionId, type)
  const idx = items.findIndex(
    (i) => i.sessionId === sessionId && i.type === payload.type,
  );
  const item: CoverageItem = {
    id:
      idx >= 0
        ? items[idx].id
        : (typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2)),
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
  writeAll(items);
  return item;
}

export function listCoverage(): CoverageItem[] {
  return readAll().sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export function updateCoverageStatus(id: string, status: CoverageStatus) {
  const items = readAll();
  const idx = items.findIndex((i) => i.id === id);
  if (idx < 0) return;
  items[idx] = {
    ...items[idx],
    status,
    updated_at: new Date().toISOString(),
  };
  writeAll(items);
}

export function deleteCoverage(id: string) {
  const items = readAll().filter((i) => i.id !== id);
  writeAll(items);
}
