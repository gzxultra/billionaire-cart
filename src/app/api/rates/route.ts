import { NextResponse } from "next/server";

export const runtime = "edge";

// Cache exchange rates for 1 hour
let cache: { rates: Record<string, number>; ts: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

const SUPPORTED_CURRENCIES = ["CNY", "EUR", "GBP", "JPY", "KRW", "INR", "BRL", "CAD", "AUD", "CHF"];

async function fetchRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL) return cache.rates;

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) throw new Error(`Rate API ${res.status}`);
    const json = await res.json();

    if (!json.rates || typeof json.rates !== "object") {
      throw new Error("Invalid rate response");
    }

    const rates: Record<string, number> = { USD: 1 };
    for (const code of SUPPORTED_CURRENCIES) {
      if (typeof json.rates[code] === "number") {
        rates[code] = json.rates[code];
      }
    }

    cache = { rates, ts: now };
    return rates;
  } catch (e) {
    if (cache) return cache.rates;
    console.error("Rate fetch failed:", e);
    return { USD: 1 };
  }
}

export async function GET() {
  const rates = await fetchRates();
  return NextResponse.json({
    success: true,
    base: "USD",
    rates,
    updatedAt: cache?.ts ?? Date.now(),
  });
}
