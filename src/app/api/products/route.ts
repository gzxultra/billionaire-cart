import { NextRequest, NextResponse } from "next/server";
import { getD1 } from "@/lib/d1";

export const runtime = "edge";

interface ProductRow {
  id: number;
  url: string;
  title: string;
  price: number;
  image_url: string | null;
  description: string | null;
  asset_class: string;
  monthly_overhead: number;
  original_price: number | null;
  original_currency: string | null;
  source_domain: string | null;
  favicon: string | null;
  parse_source: string | null;
  parsed_at: number;
  updated_at: number;
  parse_count: number;
}

// GET /api/products — list recently parsed products (with pagination)
export async function GET(request: NextRequest) {
  const db = await getD1();
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database not available", products: [] },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
  const assetClass = searchParams.get("asset_class");
  const search = searchParams.get("q");

  try {
    let query = "SELECT * FROM parsed_products";
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (assetClass) {
      conditions.push("asset_class = ?");
      params.push(assetClass);
    }
    if (search) {
      conditions.push("title LIKE ?");
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const result = await db.prepare(query).bind(...params).all<ProductRow>();

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) as total FROM parsed_products";
    if (conditions.length > 0) {
      countQuery += " WHERE " + conditions.join(" AND ");
    }
    const countResult = await db
      .prepare(countQuery)
      .bind(...params.slice(0, -2))
      .first<{ total: number }>();

    const products = result.results.map((row) => ({
      id: row.id,
      url: row.url,
      title: row.title,
      price: row.price,
      imageUrl: row.image_url,
      description: row.description,
      assetClass: row.asset_class,
      monthlyOverhead: row.monthly_overhead,
      originalPrice: row.original_price,
      originalCurrency: row.original_currency,
      sourceDomain: row.source_domain,
      favicon: row.favicon,
      parseSource: row.parse_source,
      parsedAt: row.parsed_at,
      updatedAt: row.updated_at,
      parseCount: row.parse_count,
    }));

    return NextResponse.json({
      success: true,
      products,
      total: countResult?.total ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database query failed";
    return NextResponse.json(
      { success: false, error: message, products: [] },
      { status: 500 }
    );
  }
}

// POST /api/products — save/upsert a parsed product
export async function POST(request: NextRequest) {
  const db = await getD1();
  if (!db) {
    return NextResponse.json(
      { success: false, error: "Database not available" },
      { status: 503 }
    );
  }

  let body: {
    url: string;
    title: string;
    price: number;
    imageUrl?: string | null;
    description?: string;
    assetClass?: string;
    monthlyOverhead?: number;
    originalPrice?: number | null;
    originalCurrency?: string | null;
    sourceDomain?: string;
    favicon?: string;
    parseSource?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  if (!body.url || !body.title) {
    return NextResponse.json(
      { success: false, error: "url and title are required" },
      { status: 400 }
    );
  }

  const now = Date.now();

  try {
    // Check if product already exists
    const existing = await db
      .prepare("SELECT id, parse_count FROM parsed_products WHERE url = ?")
      .bind(body.url)
      .first<{ id: number; parse_count: number }>();

    if (existing) {
      // Update existing record + increment parse_count
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
          body.title,
          body.price,
          body.imageUrl ?? null,
          body.description ?? null,
          body.assetClass ?? "other",
          body.monthlyOverhead ?? 0,
          body.originalPrice ?? null,
          body.originalCurrency ?? null,
          body.sourceDomain ?? null,
          body.favicon ?? null,
          body.parseSource ?? null,
          now,
          existing.parse_count + 1,
          body.url
        )
        .run();

      return NextResponse.json({
        success: true,
        action: "updated",
        id: existing.id,
        parseCount: existing.parse_count + 1,
      });
    } else {
      // Insert new record
      const result = await db
        .prepare(
          `INSERT INTO parsed_products
            (url, title, price, image_url, description, asset_class, monthly_overhead,
             original_price, original_currency, source_domain, favicon, parse_source,
             parsed_at, updated_at, parse_count)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
        )
        .bind(
          body.url,
          body.title,
          body.price,
          body.imageUrl ?? null,
          body.description ?? null,
          body.assetClass ?? "other",
          body.monthlyOverhead ?? 0,
          body.originalPrice ?? null,
          body.originalCurrency ?? null,
          body.sourceDomain ?? null,
          body.favicon ?? null,
          body.parseSource ?? null,
          now,
          now
        )
        .run();

      return NextResponse.json({
        success: true,
        action: "created",
        id: result.meta?.last_row_id ?? null,
        parseCount: 1,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database write failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
