import { NextRequest, NextResponse } from "next/server";
import { billionaires } from "@/data/billionaires";
import { WikiData } from "@/lib/types";

// Cache: wikiTitle -> { data, timestamp }
const cache = new Map<string, { data: WikiData; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
  }

  const b = billionaires.find((x) => x.id === id);
  if (!b?.wikiTitle) {
    return NextResponse.json({ success: true, wiki: null });
  }

  // Check cache
  const cached = cache.get(b.wikiTitle);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ success: true, wiki: cached.data });
  }

  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(b.wikiTitle)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "BillionaireCart/1.0 (billionaire-cart@example.com)",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ success: true, wiki: null });
    }

    const data = await res.json();
    const wiki: WikiData = {
      summary: data.extract || "",
      thumbnail: data.thumbnail?.source || null,
    };

    cache.set(b.wikiTitle, { data: wiki, ts: Date.now() });
    return NextResponse.json({ success: true, wiki });
  } catch {
    return NextResponse.json({ success: true, wiki: null });
  }
}
