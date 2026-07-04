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

// ─── JSON-LD / Schema.org structured data extraction ─────────────────
interface JsonLdProduct {
  name?: string;
  description?: string;
  image?: string | string[] | { url?: string };
  offers?: {
    price?: string | number;
    priceCurrency?: string;
    lowPrice?: string | number;
    highPrice?: string | number;
  } | Array<{
    price?: string | number;
    priceCurrency?: string;
    lowPrice?: string | number;
  }>;
  brand?: string | { name?: string };
  sku?: string;
}

function extractJsonLd(html: string): Partial<ParsedProduct> | null {
  const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      const products: JsonLdProduct[] = [];

      // Handle @graph arrays
      if (data["@graph"]) {
        for (const item of data["@graph"]) {
          if (item["@type"] === "Product" || item["@type"]?.includes?.("Product")) {
            products.push(item);
          }
        }
      }
      // Direct Product type
      if (data["@type"] === "Product" || data["@type"]?.includes?.("Product")) {
        products.push(data);
      }
      // Array of objects
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item["@type"] === "Product" || item["@type"]?.includes?.("Product")) {
            products.push(item);
          }
        }
      }

      if (products.length > 0) {
        const p = products[0];
        let price = 0;
        let currency = "USD";

        if (p.offers) {
          const offer = Array.isArray(p.offers) ? p.offers[0] : p.offers;
          if (offer) {
            const rawPrice = offer.price ?? offer.lowPrice ?? 0;
            price = typeof rawPrice === "string" ? parseFloat(rawPrice.replace(/[^0-9.]/g, "")) : rawPrice;
            currency = offer.priceCurrency || "USD";
          }
        }

        let imageUrl: string | null = null;
        if (typeof p.image === "string") imageUrl = p.image;
        else if (Array.isArray(p.image)) imageUrl = p.image[0] || null;
        else if (p.image && typeof p.image === "object" && "url" in p.image) imageUrl = p.image.url || null;

        const brand = typeof p.brand === "string" ? p.brand : p.brand?.name;
        const title = brand && p.name && !p.name.includes(brand)
          ? `${brand} ${p.name}`
          : (p.name || "");

        if (title || price > 0) {
          return {
            title: title || undefined,
            price: price || undefined,
            imageUrl: imageUrl || undefined,
            description: p.description?.slice(0, 200) || undefined,
          };
        }
      }
    } catch {
      // Invalid JSON-LD, try next script block
    }
  }

  return null;
}

// ─── Product meta tags (product:price:amount etc.) ──────────────────
function extractProductMeta(html: string): { price?: number; currency?: string; brand?: string } {
  const getMetaContent = (property: string): string => {
    const m = html.match(
      new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i")
    ) || html.match(
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, "i")
    );
    return m ? m[1] : "";
  };

  const priceStr = getMetaContent("product:price:amount")
    || getMetaContent("product:price")
    || getMetaContent("og:price:amount");
  const currency = getMetaContent("product:price:currency")
    || getMetaContent("og:price:currency");
  const brand = getMetaContent("product:brand")
    || getMetaContent("og:brand");

  const price = priceStr ? parseFloat(priceStr.replace(/[^0-9.]/g, "")) : undefined;

  return {
    price: price && price > 0 ? price : undefined,
    currency: currency || undefined,
    brand: brand || undefined,
  };
}

// ─── Amazon ASIN extraction ─────────────────────────────────────────
function extractAmazonData(html: string, url: string): Partial<ParsedProduct> | null {
  // Only process Amazon URLs
  if (!/amazon\.(com|co\.uk|de|fr|co\.jp|ca|com\.au|in)/i.test(url)) return null;

  // Extract ASIN from URL
  const asinMatch = url.match(/\/(?:dp|gp\/product|exec\/obidos\/asin)\/([A-Z0-9]{10})/i)
    || html.match(/"asin"\s*:\s*"([A-Z0-9]{10})"/i);

  let title = "";
  const titleMatch = html.match(/id="productTitle"[^>]*>\s*([^<]+)/i)
    || html.match(/id="title"[^>]*>\s*<span[^>]*>\s*([^<]+)/i);
  if (titleMatch) title = titleMatch[1].trim();

  // Amazon-specific price patterns
  let price = 0;
  const pricePatterns = [
    /class="a-price-whole">([0-9,]+)<[^]*?class="a-price-fraction">(\d{2})/,
    /id="priceblock_ourprice"[^>]*>\s*\$\s*([\d,]+(?:\.\d{2})?)/i,
    /id="priceblock_dealprice"[^>]*>\s*\$\s*([\d,]+(?:\.\d{2})?)/i,
    /"priceAmount"\s*:\s*([\d.]+)/,
  ];
  for (const pat of pricePatterns) {
    const m = html.match(pat);
    if (m) {
      price = m[2]
        ? parseFloat(`${m[1].replace(/,/g, "")}.${m[2]}`)
        : parseFloat(m[1].replace(/,/g, ""));
      if (price > 0) break;
    }
  }

  if (!title && !price) return null;

  return {
    title: title || undefined,
    price: price || undefined,
    description: asinMatch ? `ASIN: ${asinMatch[1]}` : undefined,
  };
}

// ─── OG / Twitter / standard meta tags ──────────────────────────────
function extractMetaTags(html: string): { title: string; price: string; image: string; description: string; favicon: string } {
  const getMetaContent = (property: string): string => {
    const ogMatch = html.match(
      new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, "i")
    ) || html.match(
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, "i")
    );
    if (ogMatch) return ogMatch[1];

    const nameMatch = html.match(
      new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, "i")
    ) || html.match(
      new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, "i")
    );
    return nameMatch ? nameMatch[1] : "";
  };

  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

  // Extract favicon
  const faviconMatch = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);

  return {
    title: getMetaContent("og:title") || getMetaContent("twitter:title") || (titleMatch ? titleMatch[1].trim() : ""),
    price: "",
    image: getMetaContent("og:image") || getMetaContent("twitter:image"),
    description: getMetaContent("og:description") || getMetaContent("description") || "",
    favicon: faviconMatch ? faviconMatch[1] : "",
  };
}

// ─── Price extraction (regex fallback) ──────────────────────────────
function extractPrice(html: string): number {
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

  return prices.length > 0 ? prices[0] : 0;
}

// ─── AI extraction (optional, last resort) ──────────────────────────
async function parseWithAI(html: string, url: string): Promise<Partial<ParsedProduct> | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

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

// ─── Resolve relative URLs ──────────────────────────────────────────
function resolveUrl(href: string, baseUrl: string): string {
  if (!href) return "";
  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")) {
    return href.startsWith("//") ? `https:${href}` : href;
  }
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
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
    return NextResponse.json({ success: true, product: cached, source: "cache" });
  }

  try {
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
    const hostname = new URL(url).hostname;

    // ── Layer 1: JSON-LD / Schema.org (most precise) ──
    const jsonLd = extractJsonLd(html);

    // ── Layer 2: Product meta tags ──
    const productMeta = extractProductMeta(html);

    // ── Layer 3: Amazon-specific ──
    const amazonData = extractAmazonData(html, url);

    // ── Layer 4: OG / Twitter meta tags ──
    const meta = extractMetaTags(html);

    // ── Layer 5: Regex price extraction ──
    const regexPrice = extractPrice(html);

    // ── Layer 6: AI extraction (last resort, only if we still lack title or price) ──
    let aiResult: Partial<ParsedProduct> | null = null;

    // Merge: prefer more structured sources
    const title = jsonLd?.title || amazonData?.title || meta.title || "";
    let price = jsonLd?.price || productMeta.price || amazonData?.price || regexPrice || 0;
    let imageUrl = jsonLd?.imageUrl || meta.image || null;
    let description = jsonLd?.description || amazonData?.description || meta.description || "";

    // If we still lack critical data, try AI
    if (!title || price === 0) {
      aiResult = await parseWithAI(html, url);
      if (aiResult) {
        if (!title && aiResult.title) {
          // Use AI title — we'll use it below
        }
        if (price === 0 && aiResult.price && aiResult.price > 0) price = aiResult.price;
        if (!imageUrl && aiResult.imageUrl) imageUrl = aiResult.imageUrl;
        if (!description && aiResult.description) description = aiResult.description;
      }
    }

    const finalTitle = title || aiResult?.title || hostname;

    // Resolve relative image URLs
    if (imageUrl) imageUrl = resolveUrl(imageUrl, url);

    // Resolve favicon
    let favicon = meta.favicon ? resolveUrl(meta.favicon, url) : `https://${hostname}/favicon.ico`;

    // Classify
    const { assetClass, monthlyOverhead } = classifyProduct(finalTitle, price);

    // Track which source provided data
    const source = jsonLd ? "json-ld" : amazonData ? "amazon" : productMeta.price ? "product-meta" : meta.title ? "og-meta" : aiResult ? "ai" : "regex";

    const product: ParsedProduct = {
      title: finalTitle,
      price: price || 99.99, // fallback
      imageUrl,
      description: description.slice(0, 200),
      sourceUrl: url,
      assetClass,
      monthlyOverhead,
      sourceDomain: hostname,
      favicon,
    };

    cache.set(url, product);

    return NextResponse.json({ success: true, product, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse URL";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
