import { NextRequest, NextResponse } from "next/server";
import { validateUrl } from "@/lib/url-validator";
import { classifyProduct } from "@/lib/asset-classifier";
import { ParsedProduct } from "@/lib/types";
import { getD1 } from "@/lib/d1";

export const runtime = "edge";

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

// ─── eBay extraction ────────────────────────────────────────────────
function extractEbayData(html: string, url: string): Partial<ParsedProduct> | null {
  if (!/ebay\.(com|co\.uk|de|fr|com\.au|ca|it|es)/i.test(url)) return null;

  // eBay item number from URL
  const itemMatch = url.match(/\/itm\/(?:[^/]*\/)?(\d{10,14})/i)
    || url.match(/item=(\d{10,14})/i);

  let title = "";
  // eBay uses a specific h1 class or vim-title
  const titleMatch = html.match(/class="x-item-title__mainTitle"[^>]*>[\s\S]*?<span[^>]*>([^<]+)/i)
    || html.match(/id="itemTitle"[^>]*>\s*(?:<span[^>]*>[^<]*<\/span>\s*)?([^<]+)/i)
    || html.match(/<h1[^>]*class="[^"]*it-ttl[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)/i);
  if (titleMatch) title = titleMatch[1].trim();

  let price = 0;
  // eBay price patterns — BIN price, current bid, etc.
  const pricePatterns = [
    /class="x-price-primary"[^>]*>[\s\S]*?<span[^>]*>(?:US\s*)?\$\s*([\d,]+(?:\.\d{2})?)/i,
    /id="prcIsum"[^>]*>(?:US\s*)?\$\s*([\d,]+(?:\.\d{2})?)/i,
    /id="mm-saleDscPrc"[^>]*>(?:US\s*)?\$\s*([\d,]+(?:\.\d{2})?)/i,
    /"price"\s*:\s*"?([\d,.]+)"?\s*,\s*"priceCurrency"/i,
    /itemprop="price"[^>]*content="([\d.]+)"/i,
  ];
  for (const pat of pricePatterns) {
    const m = html.match(pat);
    if (m) {
      price = parseFloat(m[1].replace(/,/g, ""));
      if (price > 0) break;
    }
  }

  // eBay image
  let imageUrl: string | null = null;
  const imgMatch = html.match(/class="ux-image-magnify__container"[\s\S]*?<img[^>]*src="([^"]+)"/i)
    || html.match(/id="icImg"[^>]*src="([^"]+)"/i);
  if (imgMatch) imageUrl = imgMatch[1];

  if (!title && !price) return null;

  return {
    title: title || undefined,
    price: price || undefined,
    imageUrl: imageUrl || undefined,
    description: itemMatch ? `eBay Item: ${itemMatch[1]}` : undefined,
  };
}

// ─── 淘宝 / 天猫 extraction ────────────────────────────────────────
function extractTaobaoData(html: string, url: string): Partial<ParsedProduct> | null {
  if (!/taobao\.com|tmall\.com|tb\.cn/i.test(url)) return null;

  // Taobao item id from URL
  const itemMatch = url.match(/[?&]id=(\d+)/i)
    || url.match(/item\.(?:taobao|tmall)\.com\/item\.htm.*[?&]id=(\d+)/i);

  let title = "";
  // Taobao/Tmall title patterns (SSR rendered data, meta tags, or embedded JSON)
  const titlePatterns = [
    /<title[^>]*>([^<]*)-[^<]*淘宝[^<]*<\/title>/i,
    /<title[^>]*>([^<]*)-[^<]*天猫[^<]*<\/title>/i,
    /"title"\s*:\s*"([^"]{5,200})"/,
    /data-title="([^"]+)"/i,
  ];
  for (const pat of titlePatterns) {
    const m = html.match(pat);
    if (m) { title = m[1].trim(); break; }
  }

  let price = 0;
  // Taobao / Tmall price patterns (CNY ¥)
  const pricePatterns = [
    /"price"\s*:\s*"?([\d.]+)"?/,
    /class="[^"]*tm-price[^"]*"[^>]*>(?:¥\s*)?([\d.]+)/i,
    /class="[^"]*tb-rmb-num[^"]*"[^>]*>([\d.]+)/i,
    /¥\s*([\d,]+(?:\.\d{1,2})?)/,
    /data-price="([\d.]+)"/i,
  ];
  for (const pat of pricePatterns) {
    const m = html.match(pat);
    if (m) {
      price = parseFloat(m[1].replace(/,/g, ""));
      if (price > 0) break;
    }
  }

  // Convert CNY to USD (approximate, will be supplemented by live rates if available)
  const isCNY = price > 0 && price < 50000 && /taobao|tmall|tb\.cn/i.test(url);
  const originalCNY = isCNY ? price : undefined;
  if (isCNY && price > 0) {
    price = Math.round(price * 0.14 * 100) / 100; // ~7.1 CNY/USD
  }

  let imageUrl: string | null = null;
  const imgMatch = html.match(/data-src="(\/\/img[^"]+)"/i)
    || html.match(/"pic(?:Url)?"\s*:\s*"((?:https?:)?\/\/[^"]+)"/i);
  if (imgMatch) imageUrl = imgMatch[1].startsWith("//") ? `https:${imgMatch[1]}` : imgMatch[1];

  if (!title && !price) return null;

  const source = /tmall/i.test(url) ? "天猫 Tmall" : "淘宝 Taobao";
  return {
    title: title || undefined,
    price: price || undefined,
    imageUrl: imageUrl || undefined,
    description: itemMatch ? `${source} #${itemMatch[1]}` : source,
    originalPrice: originalCNY,
    originalCurrency: originalCNY ? "CNY" : undefined,
  };
}

// ─── 京东 JD extraction ─────────────────────────────────────────────
function extractJDData(html: string, url: string): Partial<ParsedProduct> | null {
  if (!/jd\.(com|hk)/i.test(url)) return null;

  // JD SKU from URL
  const skuMatch = url.match(/\/(\d{5,15})\.html/i)
    || url.match(/[?&]sku=(\d+)/i);

  let title = "";
  const titlePatterns = [
    /<title[^>]*>([^<]*)-京东<\/title>/i,
    /class="sku-name"[^>]*>\s*([^<]+)/i,
    /class="itemInfo-wrap"[\s\S]*?<div[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)/i,
    /"name"\s*:\s*"([^"]{5,200})"/,
  ];
  for (const pat of titlePatterns) {
    const m = html.match(pat);
    if (m) { title = m[1].trim(); break; }
  }

  let price = 0;
  const pricePatterns = [
    /class="p-price"[^>]*>[\s\S]*?<span[^>]*>(?:¥\s*)?([\d.]+)/i,
    /"p"\s*:\s*"?([\d.]+)"?/,
    /data-price="([\d.]+)"/i,
    /¥\s*([\d,]+(?:\.\d{1,2})?)/,
  ];
  for (const pat of pricePatterns) {
    const m = html.match(pat);
    if (m) {
      price = parseFloat(m[1].replace(/,/g, ""));
      if (price > 0) break;
    }
  }

  // Convert CNY to USD
  const originalCNY = price > 0 && price < 100000 ? price : undefined;
  if (price > 0 && price < 100000) {
    price = Math.round(price * 0.14 * 100) / 100;
  }

  let imageUrl: string | null = null;
  const imgMatch = html.match(/id="spec-img"[^>]*(?:data-origin|src)="(\/\/[^"]+)"/i)
    || html.match(/"imageUrl"\s*:\s*"((?:https?:)?\/\/[^"]+)"/i);
  if (imgMatch) imageUrl = imgMatch[1].startsWith("//") ? `https:${imgMatch[1]}` : imgMatch[1];

  if (!title && !price) return null;

  return {
    title: title || undefined,
    price: price || undefined,
    imageUrl: imageUrl || undefined,
    description: skuMatch ? `京东 JD SKU: ${skuMatch[1]}` : "京东 JD.com",
    originalPrice: originalCNY,
    originalCurrency: originalCNY ? "CNY" : undefined,
  };
}

// ─── Walmart extraction ─────────────────────────────────────────────
function extractWalmartData(html: string, url: string): Partial<ParsedProduct> | null {
  if (!/walmart\.(com|ca)/i.test(url)) return null;

  let title = "";
  const titlePatterns = [
    /<h1[^>]*class="[^"]*prod-ProductTitle[^"]*"[^>]*>([^<]+)/i,
    /itemprop="name"[^>]*>([^<]+)/i,
    /"productName"\s*:\s*"([^"]+)"/i,
    /"name"\s*:\s*"([^"]{5,200})"/,
  ];
  for (const pat of titlePatterns) {
    const m = html.match(pat);
    if (m) { title = m[1].trim(); break; }
  }

  let price = 0;
  const pricePatterns = [
    /itemprop="price"[^>]*content="([\d.]+)"/i,
    /"currentPrice"\s*:\s*([\d.]+)/,
    /"price"\s*:\s*"?([\d.]+)"?/,
    /class="[^"]*price-main[^"]*"[\s\S]*?\$([\d,]+(?:\.\d{2})?)/i,
    /data-automation="buybox-price"[\s\S]*?\$([\d,]+(?:\.\d{2})?)/i,
  ];
  for (const pat of pricePatterns) {
    const m = html.match(pat);
    if (m) {
      price = parseFloat(m[1].replace(/,/g, ""));
      if (price > 0) break;
    }
  }

  let imageUrl: string | null = null;
  const imgMatch = html.match(/"heroImage(?:Url)?"\s*:\s*"(https?:\/\/[^"]+)"/i)
    || html.match(/property="og:image"[^>]*content="([^"]+)"/i);
  if (imgMatch) imageUrl = imgMatch[1];

  if (!title && !price) return null;

  const itemMatch = url.match(/\/ip\/(?:[^/]*\/)?([\d]+)/i);
  return {
    title: title || undefined,
    price: price || undefined,
    imageUrl: imageUrl || undefined,
    description: itemMatch ? `Walmart #${itemMatch[1]}` : "Walmart",
  };
}

// ─── Best Buy extraction ────────────────────────────────────────────
function extractBestBuyData(html: string, url: string): Partial<ParsedProduct> | null {
  if (!/bestbuy\.(com|ca)/i.test(url)) return null;

  let title = "";
  const titlePatterns = [
    /class="sku-title"[^>]*>[\s\S]*?<h1[^>]*>([^<]+)/i,
    /class="heading-5 v-fw-regular"[^>]*>([^<]+)/i,
    /"name"\s*:\s*"([^"]{5,200})"/,
  ];
  for (const pat of titlePatterns) {
    const m = html.match(pat);
    if (m) { title = m[1].trim(); break; }
  }

  let price = 0;
  const pricePatterns = [
    /class="priceView-hero-price priceView-customer-price"[\s\S]*?<span[^>]*>\$([\d,]+(?:\.\d{2})?)/i,
    /"currentPrice"\s*:\s*([\d.]+)/,
    /itemprop="price"[^>]*content="([\d.]+)"/i,
    /"price"\s*:\s*"?([\d.]+)"?/,
    /data-testid="customer-price"[\s\S]*?\$([\d,]+(?:\.\d{2})?)/i,
  ];
  for (const pat of pricePatterns) {
    const m = html.match(pat);
    if (m) {
      price = parseFloat(m[1].replace(/,/g, ""));
      if (price > 0) break;
    }
  }

  let imageUrl: string | null = null;
  const imgMatch = html.match(/class="primary-image"[^>]*src="([^"]+)"/i)
    || html.match(/"thumbnailImage"\s*:\s*"([^"]+)"/i);
  if (imgMatch) imageUrl = imgMatch[1];

  if (!title && !price) return null;

  const skuMatch = url.match(/skuId=(\d+)/i)
    || url.match(/\/(\d{7})\.p/i);
  return {
    title: title || undefined,
    price: price || undefined,
    imageUrl: imageUrl || undefined,
    description: skuMatch ? `Best Buy SKU: ${skuMatch[1]}` : "Best Buy",
  };
}

// ─── Etsy extraction ────────────────────────────────────────────────
function extractEtsyData(html: string, url: string): Partial<ParsedProduct> | null {
  if (!/etsy\.com/i.test(url)) return null;

  let title = "";
  const titlePatterns = [
    /property="og:title"[^>]*content="([^"]+)"/i,
    /<h1[^>]*data-listing-id[^>]*>([^<]+)/i,
    /"name"\s*:\s*"([^"]{5,200})"/,
  ];
  for (const pat of titlePatterns) {
    const m = html.match(pat);
    if (m) { title = m[1].trim(); break; }
  }

  let price = 0;
  const pricePatterns = [
    /"price"\s*:\s*"?([\d.]+)"?/,
    /itemprop="price"[^>]*content="([\d.]+)"/i,
    /class="[^"]*wt-text-title-03[^"]*"[^>]*>\s*\$([\d,]+(?:\.\d{2})?)/i,
    /data-buy-box-listing-price[^>]*>\s*\$([\d,]+(?:\.\d{2})?)/i,
  ];
  for (const pat of pricePatterns) {
    const m = html.match(pat);
    if (m) {
      price = parseFloat(m[1].replace(/,/g, ""));
      if (price > 0) break;
    }
  }

  let imageUrl: string | null = null;
  const imgMatch = html.match(/property="og:image"[^>]*content="([^"]+)"/i)
    || html.match(/data-listing-card-image[\s\S]*?src="([^"]+)"/i);
  if (imgMatch) imageUrl = imgMatch[1];

  if (!title && !price) return null;

  const listingMatch = url.match(/listing\/(\d+)/i);
  return {
    title: title || undefined,
    price: price || undefined,
    imageUrl: imageUrl || undefined,
    description: listingMatch ? `Etsy #${listingMatch[1]}` : "Etsy",
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

    // ── Layer 3: Platform-specific extractors ──
    const amazonData = extractAmazonData(html, url);
    const ebayData = extractEbayData(html, url);
    const taobaoData = extractTaobaoData(html, url);
    const jdData = extractJDData(html, url);
    const walmartData = extractWalmartData(html, url);
    const bestBuyData = extractBestBuyData(html, url);
    const etsyData = extractEtsyData(html, url);
    const platformData = amazonData || ebayData || taobaoData || jdData || walmartData || bestBuyData || etsyData;

    // ── Layer 4: OG / Twitter meta tags ──
    const meta = extractMetaTags(html);

    // ── Layer 5: Regex price extraction ──
    const regexPrice = extractPrice(html);

    // ── Layer 6: AI extraction (last resort, only if we still lack title or price) ──
    let aiResult: Partial<ParsedProduct> | null = null;

    // Merge: prefer more structured sources
    const title = jsonLd?.title || platformData?.title || meta.title || "";
    let price = jsonLd?.price || productMeta.price || platformData?.price || regexPrice || 0;
    let imageUrl = jsonLd?.imageUrl || platformData?.imageUrl || meta.image || null;
    let description = jsonLd?.description || platformData?.description || meta.description || "";

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
    const source = jsonLd ? "json-ld" : amazonData ? "amazon" : ebayData ? "ebay" : taobaoData ? "taobao" : jdData ? "jd" : walmartData ? "walmart" : bestBuyData ? "bestbuy" : etsyData ? "etsy" : productMeta.price ? "product-meta" : meta.title ? "og-meta" : aiResult ? "ai" : "regex";

    // Carry through original currency if a platform extractor provided it
    const origPrice = platformData?.originalPrice;
    const origCurrency = platformData?.originalCurrency;

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
      originalPrice: origPrice,
      originalCurrency: origCurrency,
    };

    cache.set(url, product);

    // ── Persist to D1 (fire-and-forget, non-blocking) ──
    saveToD1(product, source).catch(() => {
      // Silently ignore D1 errors — local dev won't have D1
    });

    return NextResponse.json({ success: true, product, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse URL";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ─── D1 persistence (non-blocking) ─────────────────────────────────
async function saveToD1(product: ParsedProduct, parseSource: string): Promise<void> {
  const db = await getD1();
  if (!db) return;

  const now = Date.now();

  const existing = await db
    .prepare("SELECT id, parse_count FROM parsed_products WHERE url = ?")
    .bind(product.sourceUrl)
    .first<{ id: number; parse_count: number }>();

  if (existing) {
    await db
      .prepare(
        `UPDATE parsed_products SET
          title = ?, price = ?, image_url = ?, description = ?,
          asset_class = ?, monthly_overhead = ?,
          original_price = ?, original_currency = ?,
          source_domain = ?, favicon = ?, parse_source = ?,
          updated_at = ?, parse_count = ?
        WHERE url = ?`
      )
      .bind(
        product.title,
        product.price,
        product.imageUrl ?? null,
        product.description ?? null,
        product.assetClass,
        product.monthlyOverhead,
        product.originalPrice ?? null,
        product.originalCurrency ?? null,
        product.sourceDomain ?? null,
        product.favicon ?? null,
        parseSource,
        now,
        existing.parse_count + 1,
        product.sourceUrl
      )
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO parsed_products
          (url, title, price, image_url, description, asset_class, monthly_overhead,
           original_price, original_currency, source_domain, favicon, parse_source,
           parsed_at, updated_at, parse_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
      )
      .bind(
        product.sourceUrl,
        product.title,
        product.price,
        product.imageUrl ?? null,
        product.description ?? null,
        product.assetClass,
        product.monthlyOverhead,
        product.originalPrice ?? null,
        product.originalCurrency ?? null,
        product.sourceDomain ?? null,
        product.favicon ?? null,
        parseSource,
        now,
        now
      )
      .run();
  }
}
