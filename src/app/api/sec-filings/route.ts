import { NextRequest, NextResponse } from "next/server";
import { billionaires } from "@/data/billionaires";
import { SecFiling } from "@/lib/types";

const SEC_UA = "BillionaireCart/1.0 (billionaire-cart@example.com)";

// Cache: billionaireId -> { data, timestamp }
const cache = new Map<string, { data: SecFiling[]; ts: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });
  }

  const b = billionaires.find((x) => x.id === id);
  if (!b?.sec) {
    return NextResponse.json({ success: true, filings: [], note: "No SEC data for this billionaire" });
  }

  // Check cache
  const cached = cache.get(id);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ success: true, filings: cached.data });
  }

  try {
    const filings = await fetchSecFilings(b.sec.companyCik, b.sec.filingName, b.sec.ticker);
    cache.set(id, { data: filings, ts: Date.now() });
    return NextResponse.json({ success: true, filings });
  } catch (e) {
    console.error("SEC fetch error:", e);
    return NextResponse.json({ success: true, filings: [], error: "SEC API error" });
  }
}

async function fetchSecFilings(
  companyCik: string,
  filingName: string,
  ticker: string
): Promise<SecFiling[]> {
  // Step 1: Get recent filings from the company
  const subUrl = `https://data.sec.gov/submissions/CIK${companyCik}.json`;
  const subRes = await fetch(subUrl, {
    headers: { "User-Agent": SEC_UA, Accept: "application/json" },
  });
  if (!subRes.ok) return [];

  const subData = await subRes.json();
  const recent = subData?.filings?.recent;
  if (!recent) return [];

  const forms: string[] = recent.form || [];
  const accNums: string[] = recent.accessionNumber || [];
  const primaryDocs: string[] = recent.primaryDocument || [];
  const filedDates: string[] = recent.filingDate || [];

  // Collect Form 4 filing indices (up to 10 most recent)
  const form4Indices: number[] = [];
  for (let i = 0; i < forms.length && form4Indices.length < 10; i++) {
    if (forms[i] === "4") {
      form4Indices.push(i);
    }
  }

  if (form4Indices.length === 0) return [];

  // Step 2: Fetch and parse Form 4 XMLs (in parallel, max 5)
  const fetches = form4Indices.slice(0, 5).map(async (idx) => {
    const accDashed = accNums[idx].replace(/-/g, "");
    const accFormatted = accNums[idx];
    const cikClean = companyCik.replace(/^0+/, "");
    // Strip XSL stylesheet prefix (e.g., "xslF345X06/file.xml" -> "file.xml")
    const primaryDoc = primaryDocs[idx].replace(/^xsl[^/]*\//, "");
    const xmlUrl = `https://www.sec.gov/Archives/edgar/data/${cikClean}/${accDashed}/${primaryDoc}`;

    try {
      const xmlRes = await fetch(xmlUrl, {
        headers: { "User-Agent": SEC_UA, Accept: "application/xml" },
      });
      if (!xmlRes.ok) return [];
      const xml = await xmlRes.text();
      return parseForm4Xml(xml, filingName, ticker, filedDates[idx]);
    } catch {
      return [];
    }
  });

  const results = await Promise.all(fetches);
  const allFilings = results.flat();

  // Sort by date descending and return top 5
  allFilings.sort((a, b) => b.date.localeCompare(a.date));
  return allFilings.slice(0, 5);
}

function parseForm4Xml(xml: string, targetName: string, ticker: string, filedDate: string): SecFiling[] {
  const filings: SecFiling[] = [];

  // Check if this filing is from our target person (case-insensitive match)
  const nameUpper = targetName.toUpperCase();
  const ownerMatch = xml.match(/<rptOwnerName>([^<]+)<\/rptOwnerName>/i);
  if (ownerMatch) {
    const foundName = ownerMatch[1].toUpperCase().trim();
    // Check if name parts match (handle "MUSK ELON" vs "Musk Elon")
    const targetParts = nameUpper.split(/\s+/);
    const foundParts = foundName.split(/\s+/);
    const matches = targetParts.filter((p) => foundParts.some((fp) => fp.includes(p) || p.includes(fp)));
    if (matches.length < Math.min(targetParts.length, 2)) {
      return []; // Not our person
    }
  }

  // Parse non-derivative transactions
  const txRegex = /<nonDerivativeTransaction>([\s\S]*?)<\/nonDerivativeTransaction>/gi;
  let match;
  while ((match = txRegex.exec(xml)) !== null) {
    const block = match[1];
    const date = extractValue(block, "transactionDate") || filedDate;
    const code = extractTag(block, "transactionCode") || "";
    const shares = parseFloat(extractNestedValue(block, "transactionShares") || "0");
    const price = parseFloat(extractNestedValue(block, "transactionPricePerShare") || "0");
    const acqDisp = extractNestedValue(block, "transactionAcquiredDisposedCode") || "";
    const sharesAfter = parseFloat(extractNestedValue(block, "sharesOwnedFollowingTransaction") || "0");

    let type: SecFiling["type"] = "other";
    if (code === "P" || acqDisp === "A") type = "buy";
    else if (code === "S" || code === "F" || acqDisp === "D") type = "sell";
    else if (code === "M") type = "option";

    if (shares > 0) {
      filings.push({
        date,
        type,
        shares: Math.round(shares),
        pricePerShare: Math.round(price * 100) / 100,
        totalValue: Math.round(shares * price),
        ticker,
        sharesAfter: Math.round(sharesAfter),
      });
    }
  }

  return filings;
}

function extractValue(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>\\s*<value>([^<]+)<\\/value>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function extractTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([^<]+)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

function extractNestedValue(block: string, tag: string): string | null {
  // Looks for <tag><value>X</value></tag>
  const re = new RegExp(`<${tag}>\\s*<value>([^<]+)<\\/value>`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}
