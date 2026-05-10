// Plaid integration — link_token → public_token → access_token → asset_report_token
// Sandbox-first. access_token + asset_report_token are server-only and never
// returned to the frontend.

import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";

const PLAID_ENV = (process.env.PLAID_ENV ?? "sandbox") as
  | "sandbox"
  | "development"
  | "production";

const config = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID ?? "",
      "PLAID-SECRET": process.env.PLAID_SECRET ?? "",
    },
  },
});

let _client: PlaidApi | null = null;
function client(): PlaidApi {
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    throw new Error("Plaid not configured — set PLAID_CLIENT_ID / PLAID_SECRET");
  }
  if (!_client) _client = new PlaidApi(config);
  return _client;
}

export const isPlaidConfigured = () =>
  Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);

// ─── Server-only token store ────────────────────────────────────────
// In production: persist to Supabase keyed by sessionId. For sandbox MVP,
// in-memory maps survive per server process.
const accessTokens = new Map<string, string>();
const assetReportTokens = new Map<string, string>();

export function rememberAccessToken(sessionId: string, token: string) {
  accessTokens.set(sessionId, token);
}
export function getAccessToken(sessionId: string): string | null {
  return accessTokens.get(sessionId) ?? null;
}
export function rememberAssetReportToken(sessionId: string, token: string) {
  assetReportTokens.set(sessionId, token);
}
export function getAssetReportToken(sessionId: string): string | null {
  return assetReportTokens.get(sessionId) ?? null;
}

// ─── Step 1: Link token ─────────────────────────────────────────────
// Sandbox-friendly: products: ['assets']. country_codes: ['US'].
export async function createLinkToken(sessionId: string) {
  const res = await client().linkTokenCreate({
    user: { client_user_id: sessionId },
    client_name: "Alto",
    products: [Products.Assets],
    country_codes: [CountryCode.Us],
    language: "en",
  });
  return res.data.link_token;
}

// ─── Step 4: Exchange public_token → access_token ───────────────────
export async function exchangePublicToken(
  publicToken: string,
  sessionId: string,
) {
  const res = await client().itemPublicTokenExchange({
    public_token: publicToken,
  });
  rememberAccessToken(sessionId, res.data.access_token);
  return { itemId: res.data.item_id };
}

// ─── Step 5: Create + retrieve an Asset Report ──────────────────────
// Returns a FinancialSummary built from the report. Polls assetReportGet
// until the report is ready (sandbox usually completes in a few seconds).

export interface FinancialSummary {
  totalCash: number;
  totalAssets: number;
  monthlyIncomeEstimate: number;
  annualIncomeEstimate: number;
  accountCount: number;
  primaryAccount: string | null;
}

const DAYS_REQUESTED = 90;
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 12; // ~18s max wait

export async function createAndFetchAssetReport(
  sessionId: string,
): Promise<FinancialSummary> {
  const accessToken = getAccessToken(sessionId);
  if (!accessToken) throw new Error("No Plaid access_token for this session");

  const c = client();

  // Create the asset report
  const createRes = await c.assetReportCreate({
    access_tokens: [accessToken],
    days_requested: DAYS_REQUESTED,
  });
  const assetReportToken = createRes.data.asset_report_token;
  rememberAssetReportToken(sessionId, assetReportToken);

  // Poll for the report — Plaid generates async; sandbox completes fast.
  let report:
    | Awaited<ReturnType<typeof c.assetReportGet>>["data"]
    | null = null;
  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    try {
      const getRes = await c.assetReportGet({
        asset_report_token: assetReportToken,
      });
      report = getRes.data;
      break;
    } catch (e) {
      const err = e as { response?: { data?: { error_code?: string } } };
      const code = err?.response?.data?.error_code;
      if (code === "PRODUCT_NOT_READY") {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }
      throw e;
    }
  }
  if (!report) throw new Error("Asset report generation timed out");

  // Compute summary from the report
  const items = report.report.items ?? [];
  let totalCash = 0;
  let totalAssets = 0;
  let accountCount = 0;
  let primaryAccount: string | null = null;
  let inflows30d = 0;
  const cutoff = new Date(Date.now() - 30 * 86400_000)
    .toISOString()
    .slice(0, 10);

  for (const item of items) {
    for (const a of item.accounts ?? []) {
      accountCount += 1;
      if (!primaryAccount && a.name) primaryAccount = a.name;
      const balance = a.balances?.current ?? 0;
      const t = String(a.type ?? "").toLowerCase();
      if (t === "depository") totalCash += balance;
      if (t === "depository" || t === "investment") totalAssets += balance;
      for (const tx of a.transactions ?? []) {
        if (tx.date && tx.date >= cutoff && (tx.amount ?? 0) < 0) {
          inflows30d += Math.abs(tx.amount ?? 0);
        }
      }
    }
  }

  return {
    totalCash: Math.round(totalCash),
    totalAssets: Math.round(totalAssets),
    monthlyIncomeEstimate: Math.round(inflows30d),
    annualIncomeEstimate: Math.round(inflows30d * 12),
    accountCount,
    primaryAccount,
  };
}
