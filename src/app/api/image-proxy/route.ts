import { NextRequest, NextResponse } from "next/server";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "Only HTTP(S) allowed" }, { status: 400 });
  }

  // Block private/reserved IPs (SSRF protection)
  const h = parsed.hostname;
  if (
    /^10\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    /^192\.168\./.test(h) || /^127\./.test(h) || /^0\./.test(h) ||
    /^169\.254\./.test(h) || h === "localhost"
  ) {
    return NextResponse.json({ error: "Blocked" }, { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
    }

    const contentLength = parseInt(res.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_SIZE) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    const body = await res.arrayBuffer();
    if (body.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";

    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }
}
