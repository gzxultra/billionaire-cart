import { NextResponse } from "next/server";

export const runtime = "edge";

// Cache Forbes data for 5 minutes
let cache: { data: ForbesBillionaire[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export interface ForbesBillionaire {
  uri: string;
  rank: number;
  name: string;
  netWorthM: number; // millions USD
  source: string;
  country: string;
  industries: string[];
  photoUrl: string | null;
  archivedWorthM: number; // last year's worth in millions
}

async function fetchForbes(): Promise<ForbesBillionaire[]> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) return cache.data;

  try {
    const res = await fetch(
      "https://www.forbes.com/forbesapi/person/rtb/0/position/true.json?limit=50",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) throw new Error(`Forbes API ${res.status}`);
    const json = await res.json();

    const persons = json?.personList?.personsLists;
    if (!Array.isArray(persons)) throw new Error("Unexpected Forbes format");

    const data: ForbesBillionaire[] = persons.map(
      (p: Record<string, unknown>) => ({
        uri: String(p.uri ?? ""),
        rank: Number(p.rank ?? 0),
        name: String(p.personName ?? ""),
        netWorthM: Number(p.finalWorth ?? 0),
        source: String(p.source ?? ""),
        country: String(p.countryOfCitizenship ?? ""),
        industries: Array.isArray(p.industries) ? p.industries : [],
        photoUrl: p.squareImage ? String(p.squareImage) : null,
        archivedWorthM: Number(p.archivedWorth ?? 0),
      })
    );

    cache = { data, ts: now };
    return data;
  } catch (e) {
    // Return cached data even if stale, or empty
    if (cache) return cache.data;
    console.error("Forbes fetch failed:", e);
    return [];
  }
}

export async function GET() {
  const data = await fetchForbes();
  return NextResponse.json({
    success: true,
    billionaires: data,
    updatedAt: cache?.ts ?? Date.now(),
  });
}
