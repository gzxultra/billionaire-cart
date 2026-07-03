import { NextRequest, NextResponse } from "next/server";
import { validateUrl } from "@/lib/url-validator";
import { classifyProduct } from "@/lib/asset-classifier";
import { ParsedProduct } from "@/lib/types";

// Simple in-memory cache
const cache = new Map<string, ParsedProduct>();

// Rate limiting — per IP
const rateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // per minute

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

function extractMetaTags(html: string): { title: string; price: string; image: string; description: string } {
  const getMetaContent = (property: string): string => {
    // Try og: tags first
    const ogMatch = html.match(
      new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i")
    ) || html.match(
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, "i")
    );
    if (ogMatch) return ogMatch[1];

    // Try name= tags
    const nameMatch = html.match(
      new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, "i")
    ) || html.match(
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, "i")
    );
    return nameMatch ? nameMatch[1] : "";
  };

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

  return {
    title: getMetaContent("og:title") || getMetaContent("twitter:title") || (titleMatch ? titleMatch[1].trim() : ""),
    price: "",
    image: getMetaContent("og:image") || getMetaContent("twitter:image"),
    description: getMetaContent("og:description") || getMetaContent("description") || "",
  };
}

function extractPrice(html: string): number {
  // Look for common price patterns
  const patterns = [
    /\$\s*([\d,]+(?:\.\d{2})?)/g,
    /price["':\s]*["']?\$?([\d,]+(?:\.\d{2})?)/gi,
    /"price"\s*:\s*"?([\d,.]+)"?/gi,
    /amount["':\s]*"?([\d,.]+)"?/gi,
  ];

  const prices: number[] = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const val = parseFloat(match[1].replace(/,/g, ""));
      if (val > 0 && val < 1_000_000_000) {
        prices.push(val);
      }
    }
  }

  // Return the most likely price (first reasonable one)
  return prices.length > 0 ? prices[0] : 0;
}

async function parseWithAI(html: string, url: string): Promise<Partial<ParsedProduct> | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Truncate HTML to ~8k chars for the LLM
  const truncated = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 8000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Extract product information from this webpage text. Return JSON with: title (string), price (number in USD, 0 if unknown), imageUrl (string or null), description (string, max 100 chars). Only return the JSON object, nothing else.",
          },
          {
            role: "user",
            content: `URL: ${url}\n\nPage content:\n${truncated}`,
          },
        ],
        temperature: 0,
        max_tokens: 300,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!checkRate(ip)) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded. Try again in a minute." },
      { status: 429 }
    );
  }

  let body: { url: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { url } = body;
  if (!url) {
    return NextResponse.json(
      { success: false, error: "URL is required" },
      { status: 400 }
    );
  }

  // Validate URL
  const validation = validateUrl(url);
  if (!validation.valid) {
    return NextResponse.json(
      { success: false, error: validation.error },
      { status: 400 }
    );
  }

  // Check cache
  const cached = cache.get(url);
  if (cached) {
    return NextResponse.json({ success: true, product: cached });
  }

  try {
    // Fetch the page
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch URL (${res.status})` },
        { status: 422 }
      );
    }

    const html = await res.text();

    // Extract meta tags
    const meta = extractMetaTags(html);
    let price = extractPrice(html);

    // Try AI extraction
    const aiResult = await parseWithAI(html, url);

    const title = aiResult?.title || meta.title || new URL(url).hostname;
    if (aiResult?.price && aiResult.price > 0) price = aiResult.price;
    const imageUrl = aiResult?.imageUrl || meta.image || null;
    const description = aiResult?.description || meta.description || "";

    // Classify
    const { assetClass, monthlyOverhead } = classifyProduct(title, price);

    const product: ParsedProduct = {
      title,
      price: price || 99.99, // fallback price
      imageUrl,
      description: description.slice(0, 200),
      sourceUrl: url,
      assetClass,
      monthlyOverhead,
    };

    // Cache it
    cache.set(url, product);

    return NextResponse.json({ success: true, product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse URL";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
