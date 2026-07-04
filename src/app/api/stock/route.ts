import { NextRequest, NextResponse } from "next/server";
import { billionaires } from "@/data/billionaires";
import { StockData } from "@/lib/types";

// Cache: ticker -> { data, timestamp }
const cache = new Map<string, { data: StockData; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const runtime = "edge";

// Yahoo Finance unofficial quote endpoint (no API key required)
async function fetchYahooQuote(ticker: string): Promise<StockData | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BillionaireCart/1.0)",
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta) return null;

    const price = meta.regularMarketPrice ?? 0;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      ticker,
      price: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
  }

  const b = billionaires.find((x) => x.id === id);
  if (!b?.ticker) {
    return NextResponse.json({ success: true, stock: null, note: "No ticker for this billionaire" });
  }

  // Check cache
  const cached = cache.get(b.ticker);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ success: true, stock: cached.data });
  }

  const stock = await fetchYahooQuote(b.ticker);
  if (stock) {
    cache.set(b.ticker, { data: stock, ts: Date.now() });
    return NextResponse.json({ success: true, stock });
  }

  return NextResponse.json({ success: true, stock: null, error: "Could not fetch stock data" });
}
