// Pulls weekly 30-yr + 15-yr fixed-rate mortgage data directly from
// Freddie Mac's Primary Mortgage Market Survey (PMMS) Excel feed.
//
// Source:  https://www.freddiemac.com/pmms/docs/historicalweeklydata.xlsx
// Schema:  col 0 = Excel-serial date, col 1 = 30-yr FRM, col 3 = 15-yr FRM
// Updated: every Thursday around 13:00 UTC

import * as XLSX from "xlsx";

const PMMS_URL =
  "https://www.freddiemac.com/pmms/docs/historicalweeklydata.xlsx";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface PmmsLatest {
  thirtyYear: number;
  fifteenYear: number;
  asOf: string; // ISO date of the observation
  source: "freddiemac";
}

interface CacheEntry {
  data: PmmsLatest;
  fetchedAt: number;
}

let cached: CacheEntry | null = null;

// Excel serial day → JS Date (Excel epoch is 1899-12-30, accounting for
// the 1900 leap-year bug; serial 1 == 1900-01-01).
function excelSerialToDate(serial: number): Date {
  // Days between 1899-12-30 (Excel "day 0") and 1970-01-01 = 25569.
  const ms = (serial - 25569) * 86400_000;
  return new Date(ms);
}

async function fetchAndParse(): Promise<PmmsLatest> {
  const res = await fetch(PMMS_URL, {
    // Freddie Mac is occasionally slow; give it 10s
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Freddie Mac PMMS ${res.status}`);
  const ab = await res.arrayBuffer();
  const wb = XLSX.read(ab, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
  });

  // Walk backwards looking for the last row where col 0 is an Excel
  // serial number and col 1 is a numeric rate. Disclaimers and blank
  // rows live at the bottom; data is above them.
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    if (!r || r.length < 4) continue;
    const serial = r[0];
    const r30 = r[1];
    const r15 = r[3];
    if (
      typeof serial === "number" &&
      typeof r30 === "number" &&
      typeof r15 === "number" &&
      Number.isFinite(r30) &&
      Number.isFinite(r15)
    ) {
      const date = excelSerialToDate(serial);
      return {
        thirtyYear: Number(r30.toFixed(2)),
        fifteenYear: Number(r15.toFixed(2)),
        asOf: date.toISOString().slice(0, 10),
        source: "freddiemac",
      };
    }
  }
  throw new Error("No valid data row found in PMMS sheet");
}

export async function getPmmsLatest(): Promise<PmmsLatest> {
  if (cached && Date.now() - cached.fetchedAt < ONE_WEEK_MS) {
    return cached.data;
  }
  const data = await fetchAndParse();
  cached = { data, fetchedAt: Date.now() };
  return data;
}
