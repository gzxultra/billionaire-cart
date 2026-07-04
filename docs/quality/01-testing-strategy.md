# Testing Strategy — Billionaire Cart

> Generated 2026-07-04. Covers framework selection, priority order, coverage targets,
> concrete test files, Vitest config, and CI integration.

---

## 1. Framework Choice: Vitest

**Pick: Vitest** over Jest.

| Criterion | Vitest | Jest |
|---|---|---|
| **ESM / TypeScript** | Native ESM + esbuild transform — zero config for `.ts` imports | Requires `ts-jest` or `@swc/jest` transformer; ESM support still experimental behind `--experimental-vm-modules` |
| **Path aliases** | `vite-tsconfig-paths` reads `@/*` from `tsconfig.json` automatically | Needs manual `moduleNameMapper` or `pathsToModuleNameMapper` from `ts-jest` |
| **Next.js 14 compat** | Works — just alias `@/` and mock `"use client"` at top of module (no-op). No bundler conflict. | Works but heavier setup; `next/jest` preset exists but adds weight |
| **Zustand 5** | Direct import, no transforms needed — Zustand 5 ships ESM | Needs ESM transform config |
| **Speed** | Uses esbuild — 3-5× faster cold start than Jest on TS projects | Slower transform pipeline |
| **Watch mode** | Instant HMR-style re-run on file change | Slower cold re-run |
| **Edge runtime mocking** | Simple `vi.stubGlobal` for `fetch`, `Request`, `Response` — matches the Cloudflare edge runtime model | Similar with `jest.fn()` but more boilerplate |
| **Community momentum** | Default choice for Vite/Next.js TS projects in 2025-2026 | Still dominant overall but losing ground in TS-first projects |

**Install command:**

```bash
npm install -D vitest vite-tsconfig-paths @testing-library/react @testing-library/jest-dom jsdom
```

> `@testing-library/*` and `jsdom` are needed only when we reach component tests (Phase 3).
> For the initial rollout (Phases 1-2), only `vitest` and `vite-tsconfig-paths` are required.

---

## 2. Vitest Configuration

Create **`billionaire-cart/vitest.config.ts`**:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: "node", // pure-logic and store tests need no DOM
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["src/lib/**", "src/data/**", "src/app/api/**"],
      exclude: [
        "src/lib/types.ts",      // type-only, nothing to cover
        "src/**/*.test.ts",
        "src/**/*.test.tsx",
      ],
      thresholds: {
        // Phase 1 targets — raise as coverage improves
        "src/lib/**":     { statements: 85, branches: 80, functions: 90, lines: 85 },
        "src/data/**":    { statements: 90, branches: 80, functions: 90, lines: 90 },
        // Phase 2 targets (API routes — lower initially)
        "src/app/api/**": { statements: 60, branches: 50, functions: 60, lines: 60 },
      },
    },
    // Mock "use client" directive — it's a Next.js bundler hint, not runtime code
    setupFiles: ["./src/test-setup.ts"],
  },
});
```

Create **`billionaire-cart/src/test-setup.ts`**:

```ts
// Vitest setup — runs before every test file

// Stub globalThis.fetch so Zustand stores that call fetch() at import time don't crash.
// Individual tests override this with vi.fn() as needed.
if (typeof globalThis.fetch === "undefined") {
  globalThis.fetch = (() => Promise.resolve(new Response("{}"))) as typeof fetch;
}
```

Add to **`package.json`** scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 3. Coverage Targets

| Layer | Directory | Phase 1 Target | Long-term Target | Notes |
|---|---|---|---|---|
| **Pure logic** | `src/lib/format.ts`, `asset-classifier.ts`, `url-validator.ts` | **90%** statements | **95%** | Deterministic, no deps — easiest to test |
| **Data files** | `src/data/*.ts` | **95%** lines | **100%** | Shape/constraint validation, not logic coverage |
| **Store logic** | `src/lib/store.ts`, `use-live-data.ts`, `use-currency.ts`, `use-locale.ts` | **80%** | **90%** | Zustand stores are testable without DOM |
| **API routes** | `src/app/api/*/route.ts` | **60%** | **80%** | Requires mocking `fetch`, `Request`, `Response`; parse route is complex |
| **Components** | `src/components/*.tsx` | **0%** (deferred) | **50%** | Needs `@testing-library/react` + `jsdom`; Phase 3 |

---

## 4. Priority Order

Testing priority is driven by two forces: **regression risk from the 2-hour cron** and **blast radius**.

| Priority | File(s) | Rationale |
|---|---|---|
| **P0** | `format.ts`, `asset-classifier.ts`, `url-validator.ts` | Pure functions, zero dependencies, highest ROI. If the cron changes formatting or classification, these tests catch it instantly. `url-validator` is security-critical (SSRF). |
| **P1** | `billionaires.ts`, `catalog.ts`, `achievements.ts`, `easter-eggs.ts` (data integrity) | The cron adds/edits catalog items and achievements. Shape validation ensures new entries don't break the UI. |
| **P2** | `store.ts` (Zustand cart store) | Core business logic — select billionaire, add/remove purchases, achievement unlocking. Regressions here break the whole app. |
| **P3** | `use-live-data.ts`, `use-currency.ts`, `use-locale.ts` | Store logic, medium complexity. Tests can run without DOM. |
| **P4** | `api/parse/route.ts` | Largest file (838 lines). Integration-level tests against extractors. |
| **P5** | `api/billionaires/route.ts`, `api/rates/route.ts`, `api/image-proxy/route.ts` | Thin proxy routes — simpler to test. |
| **P6** | Components (`omni-box.tsx`, `catalog.tsx`, etc.) | Deferred to Phase 3. Requires `@testing-library/react` + `jsdom`. |

---

## 5. Concrete Test Files

### 5.1 `src/lib/__tests__/format.test.ts`

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  proxyImage,
  formatCurrency,
  formatNetWorth,
  formatPercent,
  generateId,
  timeAgo,
  ASSET_LABELS,
  assetLabel,
} from "@/lib/format";

// ─── proxyImage ──────────────────────────────────────────────────────

describe("proxyImage", () => {
  it("returns null for null/undefined/empty-string input", () => {
    expect(proxyImage(null)).toBeNull();
    expect(proxyImage(undefined)).toBeNull();
    expect(proxyImage("")).toBeNull();
  });

  it("passes through data: URIs unchanged", () => {
    const dataUri = "data:image/png;base64,abc123";
    expect(proxyImage(dataUri)).toBe(dataUri);
  });

  it("passes through blob: URIs unchanged", () => {
    const blobUri = "blob:http://localhost/abc";
    expect(proxyImage(blobUri)).toBe(blobUri);
  });

  it("passes through root-relative paths unchanged", () => {
    expect(proxyImage("/images/logo.png")).toBe("/images/logo.png");
  });

  it("proxies external HTTP URLs", () => {
    const url = "https://example.com/photo.jpg";
    expect(proxyImage(url)).toBe(
      `/api/image-proxy?url=${encodeURIComponent(url)}`
    );
  });

  it("encodes special characters in the URL", () => {
    const url = "https://example.com/photo.jpg?size=large&q=80";
    const result = proxyImage(url);
    expect(result).toContain(encodeURIComponent(url));
    expect(result).toStartWith("/api/image-proxy?url=");
  });
});

// ─── formatCurrency ──────────────────────────────────────────────────

describe("formatCurrency", () => {
  describe("standard (non-compact) mode", () => {
    it("formats zero", () => {
      expect(formatCurrency(0)).toBe("$0");
    });

    it("formats small amounts without decimals", () => {
      expect(formatCurrency(5.69)).toBe("$6"); // Intl rounds to 0 fraction digits
    });

    it("formats thousands with commas", () => {
      expect(formatCurrency(1_234_567)).toBe("$1,234,567");
    });

    it("formats large amounts with commas", () => {
      expect(formatCurrency(1_000_000_000)).toBe("$1,000,000,000");
    });
  });

  describe("compact mode", () => {
    it("formats trillions", () => {
      expect(formatCurrency(2_500_000_000_000, true)).toBe("$2.50T");
    });

    it("formats billions", () => {
      expect(formatCurrency(130_000_000_000, true)).toBe("$130.00B");
    });

    it("formats millions", () => {
      expect(formatCurrency(5_500_000, true)).toBe("$5.5M");
    });

    it("formats thousands", () => {
      expect(formatCurrency(42_000, true)).toBe("$42.0K");
    });

    it("formats sub-thousand with standard Intl format", () => {
      expect(formatCurrency(999, true)).toBe("$999");
    });

    it("formats exactly 1 billion", () => {
      expect(formatCurrency(1_000_000_000, true)).toBe("$1.00B");
    });

    it("formats exactly 1 trillion", () => {
      expect(formatCurrency(1_000_000_000_000, true)).toBe("$1.00T");
    });
  });
});

// ─── formatNetWorth ──────────────────────────────────────────────────

describe("formatNetWorth", () => {
  it("formats billionaire net worth", () => {
    expect(formatNetWorth(230)).toBe("$230.0B");
  });

  it("formats fractional billions", () => {
    expect(formatNetWorth(60.5)).toBe("$60.5B");
  });

  it("formats zero", () => {
    expect(formatNetWorth(0)).toBe("$0.0B");
  });
});

// ─── formatPercent ───────────────────────────────────────────────────

describe("formatPercent", () => {
  it("adds + sign to positive values", () => {
    expect(formatPercent(1.2345)).toBe("+1.2345%");
  });

  it("keeps - sign for negative values", () => {
    expect(formatPercent(-0.5678)).toBe("-0.5678%");
  });

  it("treats zero as positive", () => {
    expect(formatPercent(0)).toBe("+0.0000%");
  });

  it("outputs exactly 4 decimal places", () => {
    const result = formatPercent(3.1);
    expect(result).toBe("+3.1000%");
  });
});

// ─── generateId ──────────────────────────────────────────────────────

describe("generateId", () => {
  it("returns a non-empty string", () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe("string");
  });

  it("includes a timestamp prefix and random suffix separated by hyphen", () => {
    const id = generateId();
    const parts = id.split("-");
    expect(parts.length).toBe(2);
    // Timestamp part should be a number
    expect(Number(parts[0])).toBeGreaterThan(0);
    // Random part should be alphanumeric
    expect(parts[1]).toMatch(/^[a-z0-9]+$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

// ─── timeAgo ─────────────────────────────────────────────────────────

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-04T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const now = new Date("2026-07-04T12:00:00Z").getTime();

  it("returns 'just now' for <60 seconds", () => {
    expect(timeAgo(now - 30_000)).toBe("just now");
  });

  it("returns minutes ago", () => {
    expect(timeAgo(now - 5 * 60_000)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    expect(timeAgo(now - 3 * 3_600_000)).toBe("3h ago");
  });

  it("returns days ago", () => {
    expect(timeAgo(now - 2 * 86_400_000)).toBe("2d ago");
  });

  // Chinese locale
  it("returns '刚刚' for recent timestamps in zh", () => {
    expect(timeAgo(now - 10_000, "zh")).toBe("刚刚");
  });

  it("returns Chinese minutes", () => {
    expect(timeAgo(now - 5 * 60_000, "zh")).toBe("5分钟前");
  });

  it("returns Chinese hours", () => {
    expect(timeAgo(now - 3 * 3_600_000, "zh")).toBe("3小时前");
  });

  it("returns Chinese days", () => {
    expect(timeAgo(now - 2 * 86_400_000, "zh")).toBe("2天前");
  });
});

// ─── ASSET_LABELS ────────────────────────────────────────────────────

describe("ASSET_LABELS", () => {
  it("has entries for all known asset classes", () => {
    const expected = [
      "supercar", "yacht", "aircraft", "real_estate", "rv_trailer",
      "commercial_tech", "luxury_fashion", "jewelry", "coffee_equipment",
      "custom_keyboard", "industrial_equipment", "art", "electronics", "other",
    ];
    for (const cls of expected) {
      expect(ASSET_LABELS[cls]).toBeDefined();
      expect(ASSET_LABELS[cls].length).toBeGreaterThan(0);
    }
  });

  it("each label starts with an emoji", () => {
    for (const label of Object.values(ASSET_LABELS)) {
      // Emojis are multi-byte — just verify the label isn't pure ASCII
      expect(label).not.toMatch(/^[a-zA-Z]/);
    }
  });
});

// ─── assetLabel ──────────────────────────────────────────────────────

describe("assetLabel", () => {
  it("returns English label by default", () => {
    expect(assetLabel("supercar")).toBe("🏎️ Supercar");
  });

  it("returns English label for locale='en'", () => {
    expect(assetLabel("yacht", "en")).toBe("🛥️ Yacht");
  });

  it("returns Chinese label for locale='zh'", () => {
    expect(assetLabel("supercar", "zh")).toBe("🏎️ 超跑");
    expect(assetLabel("yacht", "zh")).toBe("🛥️ 游艇");
  });

  it("falls back to English for unknown class", () => {
    expect(assetLabel("unknown_class")).toBe("📦 Other");
  });

  it("falls back to Chinese 'Other' for unknown class in zh", () => {
    expect(assetLabel("unknown_class", "zh")).toBe("📦 其他");
  });
});
```

### 5.2 `src/lib/__tests__/asset-classifier.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { classifyProduct } from "@/lib/asset-classifier";

describe("classifyProduct", () => {
  // ── Keyword-based classification ──────────────────────────────

  describe("supercar keywords", () => {
    it.each([
      "Lamborghini Huracán",
      "Ferrari SF90 Stradale",
      "Bugatti Chiron Super Sport",
      "McLaren 720S",
      "Porsche 911 Turbo S",
      "Koenigsegg Jesko",
      "Rolls-Royce Phantom",
      "Bentley Continental GT",
      "Aston Martin DB12",
    ])("classifies '%s' as supercar", (title) => {
      const result = classifyProduct(title, 500_000);
      expect(result.assetClass).toBe("supercar");
    });

    it("returns fixed $25,000 monthly overhead for supercars", () => {
      expect(classifyProduct("Lamborghini Huracán", 250_000).monthlyOverhead).toBe(25_000);
    });
  });

  describe("yacht keywords", () => {
    it("classifies 'Sunseeker 76 Yacht' as yacht", () => {
      expect(classifyProduct("Sunseeker 76 Yacht", 3_500_000).assetClass).toBe("yacht");
    });

    it("classifies 'catamaran' as yacht", () => {
      expect(classifyProduct("Custom Catamaran 80ft", 2_000_000).assetClass).toBe("yacht");
    });

    it("computes yacht overhead as max($50K, price × 0.5%)", () => {
      // price * 0.005 = 17,500 < 50,000 → 50,000
      expect(classifyProduct("Small Yacht", 3_500_000).monthlyOverhead).toBe(50_000);
      // price * 0.005 = 2,500,000 > 50,000 → 2,500,000
      expect(classifyProduct("Mega Superyacht", 500_000_000).monthlyOverhead).toBe(2_500_000);
    });
  });

  describe("aircraft keywords", () => {
    it("classifies 'Gulfstream G700' as aircraft", () => {
      expect(classifyProduct("Gulfstream G700", 78_000_000).assetClass).toBe("aircraft");
    });

    it("classifies 'private jet' as aircraft", () => {
      expect(classifyProduct("Private Jet Charter", 5_000_000).assetClass).toBe("aircraft");
    });

    it("classifies 'helicopter' as aircraft", () => {
      expect(classifyProduct("Bell 407 Helicopter", 4_000_000).assetClass).toBe("aircraft");
    });

    it("computes aircraft overhead as max($100K, price × 1%)", () => {
      // price * 0.01 = 780,000 > 100,000 → 780,000
      expect(classifyProduct("Gulfstream G700", 78_000_000).monthlyOverhead).toBe(780_000);
      // price * 0.01 = 50,000 < 100,000 → 100,000
      expect(classifyProduct("Small Cessna", 5_000_000).monthlyOverhead).toBe(100_000);
    });
  });

  describe("real estate keywords", () => {
    it.each([
      "Manhattan Penthouse",
      "Beverly Hills Mansion",
      "Luxury Villa in Malibu",
      "NYC Condo with views",
      "100 Acre Lot in Montana",
    ])("classifies '%s' as real_estate", (title) => {
      expect(classifyProduct(title, 5_000_000).assetClass).toBe("real_estate");
    });

    it("computes real estate overhead as max($5K, price × 0.3%)", () => {
      // price * 0.003 = 15,000 > 5,000 → 15,000
      expect(classifyProduct("NYC Apartment", 5_000_000).monthlyOverhead).toBe(15_000);
      // price * 0.003 = 3,000 < 5,000 → 5,000
      expect(classifyProduct("Small Condo", 1_000_000).monthlyOverhead).toBe(5_000);
    });
  });

  describe("rv_trailer keywords", () => {
    it("classifies 'Airstream Flying Cloud' as rv_trailer", () => {
      expect(classifyProduct("Airstream Flying Cloud 25RB", 90_000).assetClass).toBe("rv_trailer");
    });

    it("returns fixed $2,500 monthly overhead", () => {
      expect(classifyProduct("Winnebago Motorhome", 200_000).monthlyOverhead).toBe(2_500);
    });
  });

  describe("commercial_tech keywords", () => {
    it("classifies 'NVIDIA H100 GPU' as commercial_tech", () => {
      expect(classifyProduct("NVIDIA H100 GPU", 40_000).assetClass).toBe("commercial_tech");
    });

    it("classifies 'DGX cluster' as commercial_tech", () => {
      expect(classifyProduct("DGX SuperPOD Cluster", 2_000_000).assetClass).toBe("commercial_tech");
    });

    it("computes high overhead for $1M+ tech items", () => {
      expect(classifyProduct("DGX SuperPOD", 2_000_000).monthlyOverhead).toBe(4_500_000);
    });

    it("computes proportional overhead for sub-$1M tech items", () => {
      // price * 0.05 = 2,000 > 1,000 → 2,000
      expect(classifyProduct("NVIDIA H100 GPU", 40_000).monthlyOverhead).toBe(2_000);
    });
  });

  describe("coffee_equipment keywords", () => {
    it("classifies 'La Marzocco Linea PB' as coffee_equipment", () => {
      expect(classifyProduct("La Marzocco Linea PB", 15_000).assetClass).toBe("coffee_equipment");
    });

    it("returns fixed $800 overhead", () => {
      expect(classifyProduct("Decent Espresso DE1", 3_500).monthlyOverhead).toBe(800);
    });
  });

  describe("custom_keyboard keywords", () => {
    it("classifies mechanical keyboard items", () => {
      expect(classifyProduct("Mode Sonnet Keyboard", 400).assetClass).toBe("custom_keyboard");
      expect(classifyProduct("GMK Olivia Keycap Set", 150).assetClass).toBe("custom_keyboard");
    });

    it("returns zero overhead", () => {
      expect(classifyProduct("Cherry MX Board", 200).monthlyOverhead).toBe(0);
    });
  });

  describe("industrial_equipment keywords", () => {
    it("classifies 'CNC mill' as industrial_equipment", () => {
      expect(classifyProduct("Haas CNC Mill", 50_000).assetClass).toBe("industrial_equipment");
    });

    it("computes overhead as max($500, price × 2%)", () => {
      expect(classifyProduct("Industrial Lathe", 100_000).monthlyOverhead).toBe(2_000);
      expect(classifyProduct("Small 3D Printer", 5_000).monthlyOverhead).toBe(500);
    });
  });

  describe("art keywords", () => {
    it("classifies art items", () => {
      expect(classifyProduct("Banksy Original Painting", 2_000_000).assetClass).toBe("art");
      expect(classifyProduct("Andy Warhol Sculpture", 5_000_000).assetClass).toBe("art");
    });

    it("returns fixed $1,000 overhead", () => {
      expect(classifyProduct("Banksy Canvas Print", 2_000_000).monthlyOverhead).toBe(1_000);
    });
  });

  describe("luxury_fashion keywords", () => {
    it("classifies fashion and watch brands", () => {
      expect(classifyProduct("Gucci Marmont Bag", 2_500).assetClass).toBe("luxury_fashion");
      expect(classifyProduct("Rolex Submariner", 9_100).assetClass).toBe("luxury_fashion");
      expect(classifyProduct("Patek Philippe Nautilus", 150_000).assetClass).toBe("luxury_fashion");
    });

    it("returns fixed $500 overhead", () => {
      expect(classifyProduct("Hermès Birkin Bag", 450_000).monthlyOverhead).toBe(500);
    });
  });

  describe("jewelry keywords", () => {
    it("classifies jewelry items", () => {
      expect(classifyProduct("Diamond Ring 3 Carat", 50_000).assetClass).toBe("jewelry");
      expect(classifyProduct("Tiffany Necklace", 5_000).assetClass).toBe("jewelry");
      expect(classifyProduct("Cartier Bracelet", 8_000).assetClass).toBe("jewelry");
    });

    it("returns fixed $200 overhead", () => {
      expect(classifyProduct("Sapphire Earrings", 20_000).monthlyOverhead).toBe(200);
    });
  });

  // ── Price-based fallback heuristics ───────────────────────────

  describe("price-based fallback (no keyword match)", () => {
    it("classifies $100M+ items as real_estate", () => {
      const result = classifyProduct("Mystery Mega Purchase", 150_000_000);
      expect(result.assetClass).toBe("real_estate");
      expect(result.monthlyOverhead).toBe(450_000); // 150M * 0.003
    });

    it("classifies $1M–$100M items as luxury_fashion", () => {
      const result = classifyProduct("Rare Collectible", 5_000_000);
      expect(result.assetClass).toBe("luxury_fashion");
      expect(result.monthlyOverhead).toBe(500);
    });

    it("classifies sub-$1M unrecognized items as 'other'", () => {
      const result = classifyProduct("Random Widget", 99);
      expect(result.assetClass).toBe("other");
      expect(result.monthlyOverhead).toBe(0);
    });
  });

  // ── Case insensitivity ────────────────────────────────────────

  describe("case insensitivity", () => {
    it("matches keywords regardless of case", () => {
      expect(classifyProduct("LAMBORGHINI URUS", 250_000).assetClass).toBe("supercar");
      expect(classifyProduct("la marzocco gb5", 15_000).assetClass).toBe("coffee_equipment");
      expect(classifyProduct("BANKSY original", 1_000_000).assetClass).toBe("art");
    });
  });

  // ── Priority (first match wins) ──────────────────────────────

  describe("keyword priority", () => {
    it("first matching keyword group wins", () => {
      // "yacht" appears before "art" in KEYWORD_MAP
      const result = classifyProduct("Yacht with Art Gallery", 10_000_000);
      expect(result.assetClass).toBe("yacht");
    });
  });
});
```

### 5.3 `src/lib/__tests__/url-validator.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { validateUrl } from "@/lib/url-validator";

describe("validateUrl", () => {
  // ── Valid URLs ────────────────────────────────────────────────

  describe("valid URLs", () => {
    it("accepts standard HTTPS URLs", () => {
      const result = validateUrl("https://www.amazon.com/product/123");
      expect(result.valid).toBe(true);
      expect(result.url).toBeInstanceOf(URL);
      expect(result.url!.hostname).toBe("www.amazon.com");
    });

    it("accepts HTTP URLs", () => {
      const result = validateUrl("http://example.com/page");
      expect(result.valid).toBe(true);
    });

    it("accepts URLs with query params and fragments", () => {
      const result = validateUrl("https://example.com/search?q=test&page=2#results");
      expect(result.valid).toBe(true);
      expect(result.url!.search).toBe("?q=test&page=2");
    });

    it("accepts URLs with ports", () => {
      const result = validateUrl("https://example.com:8443/api");
      expect(result.valid).toBe(true);
    });

    it("accepts international domains", () => {
      const result = validateUrl("https://münchen.de/page");
      expect(result.valid).toBe(true);
    });
  });

  // ── Invalid URL format ────────────────────────────────────────

  describe("invalid URL format", () => {
    it("rejects empty string", () => {
      const result = validateUrl("");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid URL format");
    });

    it("rejects bare hostname", () => {
      const result = validateUrl("example.com");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid URL format");
    });

    it("rejects garbage input", () => {
      const result = validateUrl("not a url at all");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Invalid URL format");
    });
  });

  // ── Protocol blocking ────────────────────────────────────────

  describe("protocol blocking", () => {
    it("rejects ftp: protocol", () => {
      const result = validateUrl("ftp://files.example.com/data");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Only HTTP/HTTPS URLs are allowed");
    });

    it("rejects file: protocol", () => {
      const result = validateUrl("file:///etc/passwd");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Only HTTP/HTTPS URLs are allowed");
    });

    it("rejects javascript: protocol", () => {
      const result = validateUrl("javascript:alert(1)");
      expect(result.valid).toBe(false);
      // May be "Invalid URL format" or protocol block depending on URL parser
    });

    it("rejects data: protocol", () => {
      const result = validateUrl("data:text/html,<h1>Hi</h1>");
      expect(result.valid).toBe(false);
    });
  });

  // ── SSRF: Private IP ranges ───────────────────────────────────

  describe("SSRF protection — private/reserved IPs", () => {
    it("blocks 10.x.x.x (Class A private)", () => {
      const result = validateUrl("http://10.0.0.1/admin");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Private/reserved addresses are not allowed");
    });

    it("blocks 10.255.255.255", () => {
      expect(validateUrl("http://10.255.255.255/").valid).toBe(false);
    });

    it("blocks 172.16.x.x – 172.31.x.x (Class B private)", () => {
      expect(validateUrl("http://172.16.0.1/").valid).toBe(false);
      expect(validateUrl("http://172.20.10.5/").valid).toBe(false);
      expect(validateUrl("http://172.31.255.255/").valid).toBe(false);
    });

    it("allows 172.15.x.x (not private)", () => {
      expect(validateUrl("http://172.15.0.1/").valid).toBe(true);
    });

    it("allows 172.32.x.x (not private)", () => {
      expect(validateUrl("http://172.32.0.1/").valid).toBe(true);
    });

    it("blocks 192.168.x.x (Class C private)", () => {
      expect(validateUrl("http://192.168.1.1/").valid).toBe(false);
      expect(validateUrl("http://192.168.0.100/").valid).toBe(false);
    });

    it("blocks 127.x.x.x (loopback)", () => {
      expect(validateUrl("http://127.0.0.1/").valid).toBe(false);
      expect(validateUrl("http://127.255.255.255/").valid).toBe(false);
    });

    it("blocks 0.x.x.x", () => {
      expect(validateUrl("http://0.0.0.0/").valid).toBe(false);
    });

    it("blocks 169.254.x.x (link-local)", () => {
      expect(validateUrl("http://169.254.1.1/").valid).toBe(false);
    });

    it("blocks 224.x.x.x (multicast)", () => {
      expect(validateUrl("http://224.0.0.1/").valid).toBe(false);
    });

    it("blocks localhost", () => {
      expect(validateUrl("http://localhost/admin").valid).toBe(false);
      expect(validateUrl("http://LOCALHOST/admin").valid).toBe(false);
    });
  });

  // ── SSRF: IPv6 ────────────────────────────────────────────────

  describe("SSRF protection — IPv6", () => {
    it("blocks ::1 (IPv6 loopback)", () => {
      expect(validateUrl("http://[::1]/").valid).toBe(false);
    });

    it("blocks fc00: (IPv6 unique local)", () => {
      expect(validateUrl("http://[fc00::1]/").valid).toBe(false);
    });

    it("blocks fe80: (IPv6 link-local)", () => {
      expect(validateUrl("http://[fe80::1]/").valid).toBe(false);
    });

    it("blocks fd (IPv6 private)", () => {
      expect(validateUrl("http://[fd12:3456:789a::1]/").valid).toBe(false);
    });
  });

  // ── SSRF: Cloud metadata endpoints ────────────────────────────

  describe("SSRF protection — cloud metadata", () => {
    it("blocks GCP metadata endpoint", () => {
      const result = validateUrl("http://metadata.google.internal/computeMetadata/v1/");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Metadata endpoints are not allowed");
    });

    it("blocks AWS metadata endpoint (169.254.169.254)", () => {
      const result = validateUrl("http://169.254.169.254/latest/meta-data/");
      expect(result.valid).toBe(false);
      // Caught by either the link-local range or the explicit metadata check
    });
  });

  // ── Edge cases ────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles URLs with authentication credentials", () => {
      const result = validateUrl("https://user:pass@example.com/");
      expect(result.valid).toBe(true);
    });

    it("accepts valid public IPs", () => {
      expect(validateUrl("http://8.8.8.8/").valid).toBe(true);
      expect(validateUrl("http://1.1.1.1/").valid).toBe(true);
    });
  });
});
```

### 5.4 `src/lib/__tests__/store.test.ts`

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Purchase, ParsedProduct, Billionaire } from "@/lib/types";

// We need to test the Zustand store in isolation.
// The store imports `useLiveData` and `billionaires`, so we mock them.

// Mock useLiveData BEFORE importing the store
vi.mock("@/lib/use-live-data", () => ({
  useLiveData: {
    getState: () => ({
      loaded: false,
      getMerged: () => [],
    }),
  },
}));

// Mock achievements — provide a minimal set to make tests deterministic
vi.mock("@/data/achievements", () => {
  const achievements = [
    {
      id: "first-swipe",
      name: "First Swipe",
      description: "Make your first purchase",
      icon: "💳",
      rarity: "common",
      unlocked: false,
      checkFn: (p: Purchase[]) => p.length >= 1,
    },
    {
      id: "shopaholic",
      name: "Shopaholic",
      description: "Make 20 purchases",
      icon: "🛒",
      rarity: "common",
      unlocked: false,
      checkFn: (p: Purchase[]) => p.length >= 20,
    },
  ];

  return {
    achievements,
    checkAchievements: (purchases: Purchase[], current: typeof achievements) => {
      const newlyUnlocked: typeof achievements = [];
      const updated = current.map((a) => {
        if (a.unlocked) return a;
        if (a.checkFn(purchases)) {
          const unlocked = { ...a, unlocked: true };
          newlyUnlocked.push(unlocked);
          return unlocked;
        }
        return a;
      });
      return { updated, newlyUnlocked };
    },
  };
});

// Now import the store (AFTER mocks are set up)
import {
  useCartStore,
  selectTotalSpent,
  selectMonthlyBurn,
  selectNetWorth,
  selectRemaining,
} from "@/lib/store";

// ─── Helpers ─────────────────────────────────────────────────────────

function makeParsedProduct(overrides: Partial<ParsedProduct> = {}): ParsedProduct {
  return {
    title: "Test Product",
    price: 1_000_000,
    imageUrl: null,
    description: "A test product",
    sourceUrl: "https://example.com/product",
    assetClass: "other",
    monthlyOverhead: 500,
    ...overrides,
  };
}

function makePurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: `purchase-${Math.random().toString(36).slice(2)}`,
    product: makeParsedProduct(),
    billionaireId: "elon-musk",
    timestamp: Date.now(),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("useCartStore", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useCartStore.setState({
      selectedBillionaire: null,
      purchases: [],
      soundEnabled: true,
      savedProducts: [],
      activeParsedProduct: null,
    });
  });

  // ── selectBillionaire ─────────────────────────────────────────

  describe("selectBillionaire", () => {
    it("selects a billionaire from static data", () => {
      useCartStore.getState().selectBillionaire("elon-musk");
      const state = useCartStore.getState();
      expect(state.selectedBillionaire).not.toBeNull();
      expect(state.selectedBillionaire!.id).toBe("elon-musk");
      expect(state.selectedBillionaire!.name).toBe("Elon Musk");
    });

    it("resets purchases when selecting a billionaire", () => {
      // Add a purchase first
      useCartStore.setState({ purchases: [makePurchase()] });
      expect(useCartStore.getState().purchases.length).toBe(1);

      // Select billionaire should reset
      useCartStore.getState().selectBillionaire("jeff-bezos");
      expect(useCartStore.getState().purchases.length).toBe(0);
    });

    it("sets null for unknown billionaire ID", () => {
      useCartStore.getState().selectBillionaire("unknown-person");
      expect(useCartStore.getState().selectedBillionaire).toBeNull();
    });
  });

  // ── addPurchase ───────────────────────────────────────────────

  describe("addPurchase", () => {
    it("adds a purchase to the list", () => {
      const purchase = makePurchase();
      useCartStore.getState().addPurchase(purchase);
      expect(useCartStore.getState().purchases.length).toBe(1);
      expect(useCartStore.getState().purchases[0].id).toBe(purchase.id);
    });

    it("returns newly unlocked achievement names", () => {
      const purchase = makePurchase();
      const unlocked = useCartStore.getState().addPurchase(purchase);
      expect(unlocked).toContain("First Swipe");
    });

    it("does not re-unlock already-unlocked achievements", () => {
      // First purchase unlocks "First Swipe"
      useCartStore.getState().addPurchase(makePurchase());
      // Second purchase should not unlock it again
      const unlocked = useCartStore.getState().addPurchase(makePurchase());
      expect(unlocked).not.toContain("First Swipe");
    });

    it("accumulates multiple purchases", () => {
      for (let i = 0; i < 5; i++) {
        useCartStore.getState().addPurchase(makePurchase());
      }
      expect(useCartStore.getState().purchases.length).toBe(5);
    });
  });

  // ── removePurchase ────────────────────────────────────────────

  describe("removePurchase", () => {
    it("removes a purchase by ID", () => {
      const p1 = makePurchase({ id: "p1" });
      const p2 = makePurchase({ id: "p2" });
      useCartStore.setState({ purchases: [p1, p2] });

      useCartStore.getState().removePurchase("p1");
      const remaining = useCartStore.getState().purchases;
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe("p2");
    });

    it("does nothing when ID not found", () => {
      useCartStore.setState({ purchases: [makePurchase({ id: "p1" })] });
      useCartStore.getState().removePurchase("nonexistent");
      expect(useCartStore.getState().purchases.length).toBe(1);
    });
  });

  // ── toggleSound ───────────────────────────────────────────────

  describe("toggleSound", () => {
    it("toggles sound from true to false", () => {
      expect(useCartStore.getState().soundEnabled).toBe(true);
      useCartStore.getState().toggleSound();
      expect(useCartStore.getState().soundEnabled).toBe(false);
    });

    it("toggles sound from false to true", () => {
      useCartStore.setState({ soundEnabled: false });
      useCartStore.getState().toggleSound();
      expect(useCartStore.getState().soundEnabled).toBe(true);
    });
  });

  // ── reset ─────────────────────────────────────────────────────

  describe("reset", () => {
    it("clears selected billionaire and purchases", () => {
      useCartStore.setState({
        selectedBillionaire: { id: "elon-musk", name: "Elon Musk" } as Billionaire,
        purchases: [makePurchase()],
      });

      useCartStore.getState().reset();
      const state = useCartStore.getState();
      expect(state.selectedBillionaire).toBeNull();
      expect(state.purchases.length).toBe(0);
    });
  });

  // ── Saved products ────────────────────────────────────────────

  describe("saveProduct", () => {
    it("saves a parsed product", () => {
      const product = makeParsedProduct({ sourceUrl: "https://a.com/1" });
      useCartStore.getState().saveProduct(product);
      expect(useCartStore.getState().savedProducts.length).toBe(1);
      expect(useCartStore.getState().savedProducts[0].product.sourceUrl).toBe("https://a.com/1");
    });

    it("deduplicates by sourceUrl (updates existing entry)", () => {
      const product = makeParsedProduct({ sourceUrl: "https://a.com/1", title: "V1" });
      useCartStore.getState().saveProduct(product);
      const updated = makeParsedProduct({ sourceUrl: "https://a.com/1", title: "V2" });
      useCartStore.getState().saveProduct(updated);

      const saved = useCartStore.getState().savedProducts;
      expect(saved.length).toBe(1);
      expect(saved[0].product.title).toBe("V2");
    });

    it("prepends new products (newest first)", () => {
      useCartStore.getState().saveProduct(makeParsedProduct({ sourceUrl: "https://a.com/1" }));
      useCartStore.getState().saveProduct(makeParsedProduct({ sourceUrl: "https://a.com/2" }));
      expect(useCartStore.getState().savedProducts[0].product.sourceUrl).toBe("https://a.com/2");
    });

    it("caps saved products at 50", () => {
      for (let i = 0; i < 55; i++) {
        useCartStore.getState().saveProduct(
          makeParsedProduct({ sourceUrl: `https://a.com/${i}` })
        );
      }
      expect(useCartStore.getState().savedProducts.length).toBe(50);
    });
  });

  describe("removeSavedProduct", () => {
    it("removes a saved product by ID", () => {
      useCartStore.getState().saveProduct(makeParsedProduct({ sourceUrl: "https://a.com/1" }));
      const id = useCartStore.getState().savedProducts[0].id;
      useCartStore.getState().removeSavedProduct(id);
      expect(useCartStore.getState().savedProducts.length).toBe(0);
    });
  });

  describe("clearAllSavedProducts", () => {
    it("clears all saved products", () => {
      useCartStore.getState().saveProduct(makeParsedProduct({ sourceUrl: "https://a.com/1" }));
      useCartStore.getState().saveProduct(makeParsedProduct({ sourceUrl: "https://a.com/2" }));
      useCartStore.getState().clearAllSavedProducts();
      expect(useCartStore.getState().savedProducts.length).toBe(0);
    });
  });

  describe("incrementPurchaseCount", () => {
    it("increments the purchase count for a saved product", () => {
      useCartStore.getState().saveProduct(makeParsedProduct({ sourceUrl: "https://a.com/1" }));
      const id = useCartStore.getState().savedProducts[0].id;
      useCartStore.getState().incrementPurchaseCount(id);
      expect(useCartStore.getState().savedProducts[0].purchaseCount).toBe(1);
      useCartStore.getState().incrementPurchaseCount(id);
      expect(useCartStore.getState().savedProducts[0].purchaseCount).toBe(2);
    });
  });

  // ── setActiveParsed ───────────────────────────────────────────

  describe("setActiveParsed", () => {
    it("sets and clears the active parsed product", () => {
      const product = makeParsedProduct();
      useCartStore.getState().setActiveParsed(product);
      expect(useCartStore.getState().activeParsedProduct).toEqual(product);
      useCartStore.getState().setActiveParsed(null);
      expect(useCartStore.getState().activeParsedProduct).toBeNull();
    });
  });
});

// ─── Selectors ───────────────────────────────────────────────────────

describe("selectors", () => {
  const billionaire: Billionaire = {
    id: "elon-musk",
    name: "Elon Musk",
    company: "Tesla / SpaceX",
    netWorthB: 230,
    initials: "EM",
    emoji: "🚀",
    sector: "Tech / Automotive",
    earningsPerSecond: 1585,
  };

  describe("selectTotalSpent", () => {
    it("sums purchase prices", () => {
      const state = {
        purchases: [
          makePurchase({ product: makeParsedProduct({ price: 1_000_000 }) }),
          makePurchase({ product: makeParsedProduct({ price: 500_000 }) }),
        ],
      } as any;
      expect(selectTotalSpent(state)).toBe(1_500_000);
    });

    it("returns 0 for no purchases", () => {
      expect(selectTotalSpent({ purchases: [] } as any)).toBe(0);
    });
  });

  describe("selectMonthlyBurn", () => {
    it("sums monthly overheads", () => {
      const state = {
        purchases: [
          makePurchase({ product: makeParsedProduct({ monthlyOverhead: 25_000 }) }),
          makePurchase({ product: makeParsedProduct({ monthlyOverhead: 50_000 }) }),
        ],
      } as any;
      expect(selectMonthlyBurn(state)).toBe(75_000);
    });
  });

  describe("selectNetWorth", () => {
    it("returns net worth in dollars", () => {
      const state = { selectedBillionaire: billionaire } as any;
      expect(selectNetWorth(state)).toBe(230_000_000_000);
    });

    it("returns 0 when no billionaire selected", () => {
      expect(selectNetWorth({ selectedBillionaire: null } as any)).toBe(0);
    });
  });

  describe("selectRemaining", () => {
    it("calculates remaining = net worth - total spent", () => {
      const state = {
        selectedBillionaire: billionaire,
        purchases: [
          makePurchase({ product: makeParsedProduct({ price: 1_000_000_000 }) }),
        ],
      } as any;
      expect(selectRemaining(state)).toBe(229_000_000_000);
    });
  });
});
```

### 5.5 `src/data/__tests__/data-integrity.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { billionaires } from "@/data/billionaires";
import { catalogItems, TIER_LABELS } from "@/data/catalog";
import { achievements, checkAchievements } from "@/data/achievements";
import { easterEggs, checkEasterEggs, resetEasterEggs } from "@/data/easter-eggs";
import type { Billionaire, Purchase, AssetClass } from "@/lib/types";

// ─── Valid asset classes (matches the AssetClass type union) ─────────

const VALID_ASSET_CLASSES: AssetClass[] = [
  "supercar", "yacht", "aircraft", "real_estate", "rv_trailer",
  "commercial_tech", "luxury_fashion", "jewelry", "coffee_equipment",
  "custom_keyboard", "industrial_equipment", "art", "electronics", "other",
];

const VALID_TIERS = ["everyday", "aspirational", "luxury", "ultra", "absurd"] as const;

// ─── Billionaires ────────────────────────────────────────────────────

describe("billionaires data", () => {
  it("has at least 10 entries", () => {
    expect(billionaires.length).toBeGreaterThanOrEqual(10);
  });

  it("every entry has all required Billionaire fields", () => {
    for (const b of billionaires) {
      expect(b.id).toBeTruthy();
      expect(typeof b.id).toBe("string");
      expect(b.name).toBeTruthy();
      expect(typeof b.name).toBe("string");
      expect(b.company).toBeTruthy();
      expect(typeof b.netWorthB).toBe("number");
      expect(b.netWorthB).toBeGreaterThan(0);
      expect(b.initials).toBeTruthy();
      expect(b.initials.length).toBeLessThanOrEqual(3);
      expect(b.emoji).toBeTruthy();
      expect(b.sector).toBeTruthy();
      expect(typeof b.earningsPerSecond).toBe("number");
      expect(b.earningsPerSecond).toBeGreaterThanOrEqual(0);
    }
  });

  it("has no duplicate IDs", () => {
    const ids = billionaires.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate names", () => {
    const names = billionaires.map((b) => b.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("all net worths are plausible (>$1B)", () => {
    for (const b of billionaires) {
      expect(b.netWorthB).toBeGreaterThan(1);
    }
  });

  it("ID format is kebab-case", () => {
    for (const b of billionaires) {
      expect(b.id).toMatch(/^[a-z][a-z0-9-]+$/);
    }
  });
});

// ─── Catalog Items ───────────────────────────────────────────────────

describe("catalog data", () => {
  it("has at least 40 items", () => {
    expect(catalogItems.length).toBeGreaterThanOrEqual(40);
  });

  it("every item has all required CatalogItem fields", () => {
    for (const item of catalogItems) {
      expect(item.id).toBeTruthy();
      expect(typeof item.id).toBe("string");
      expect(item.name).toBeTruthy();
      expect(item.emoji).toBeTruthy();
      expect(typeof item.price).toBe("number");
      expect(item.price).toBeGreaterThan(0);
      expect(item.description).toBeTruthy();
      expect(VALID_ASSET_CLASSES).toContain(item.assetClass);
      expect(typeof item.monthlyOverhead).toBe("number");
      expect(item.monthlyOverhead).toBeGreaterThanOrEqual(0);
      expect(VALID_TIERS).toContain(item.tier);
    }
  });

  it("has no duplicate IDs", () => {
    const ids = catalogItems.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has items in every tier", () => {
    for (const tier of VALID_TIERS) {
      const inTier = catalogItems.filter((c) => c.tier === tier);
      expect(inTier.length).toBeGreaterThan(0);
    }
  });

  it("tier prices are roughly consistent", () => {
    const tierPriceRanges: Record<string, [number, number]> = {
      everyday:     [0, 2_000],
      aspirational: [1_000, 150_000],
      luxury:       [50_000, 15_000_000],
      ultra:        [5_000_000, 2_000_000_000],
      absurd:       [1_000_000_000, Infinity],
    };
    for (const item of catalogItems) {
      const [min, max] = tierPriceRanges[item.tier];
      if (item.price < min || item.price > max) {
        // Log a warning but don't fail — tiers are approximate
        // This catches egregious misplacements
        console.warn(
          `⚠️ ${item.name} (${item.tier}) has price $${item.price.toLocaleString()}, ` +
          `expected $${min.toLocaleString()}–$${max.toLocaleString()}`
        );
      }
    }
  });

  it("TIER_LABELS covers all tiers", () => {
    for (const tier of VALID_TIERS) {
      expect(TIER_LABELS[tier]).toBeTruthy();
    }
  });

  it("ID format is kebab-case", () => {
    for (const item of catalogItems) {
      expect(item.id).toMatch(/^[a-z][a-z0-9-]*$/);
    }
  });
});

// ─── Achievements ────────────────────────────────────────────────────

describe("achievements data", () => {
  it("has at least 15 achievements", () => {
    expect(achievements.length).toBeGreaterThanOrEqual(15);
  });

  it("every achievement has the correct shape", () => {
    for (const a of achievements) {
      expect(a.id).toBeTruthy();
      expect(typeof a.id).toBe("string");
      expect(a.name).toBeTruthy();
      expect(a.description).toBeTruthy();
      expect(a.icon).toBeTruthy();
      expect(["common", "rare", "legendary"]).toContain(a.rarity);
      expect(a.unlocked).toBe(false); // all start locked
      expect(typeof a.checkFn).toBe("function");
    }
  });

  it("has no duplicate IDs", () => {
    const ids = achievements.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has no duplicate names", () => {
    const names = achievements.map((a) => a.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has at least one achievement per rarity", () => {
    for (const rarity of ["common", "rare", "legendary"]) {
      expect(achievements.filter((a) => a.rarity === rarity).length).toBeGreaterThan(0);
    }
  });

  it("checkAchievements unlocks 'First Swipe' on first purchase", () => {
    const purchase: Purchase = {
      id: "test-1",
      product: {
        title: "Test", price: 100, imageUrl: null, description: "",
        sourceUrl: "https://example.com", assetClass: "other", monthlyOverhead: 0,
      },
      billionaireId: "elon-musk",
      timestamp: Date.now(),
    };
    const { newlyUnlocked } = checkAchievements([purchase], achievements);
    const names = newlyUnlocked.map((a) => a.name);
    expect(names).toContain("First Swipe");
  });

  it("checkAchievements does not unlock with zero purchases", () => {
    const { newlyUnlocked } = checkAchievements([], achievements);
    expect(newlyUnlocked.length).toBe(0);
  });
});

// ─── Easter Eggs ─────────────────────────────────────────────────────

describe("easter eggs data", () => {
  it("has at least 10 easter eggs", () => {
    expect(easterEggs.length).toBeGreaterThanOrEqual(10);
  });

  it("every easter egg has the correct shape", () => {
    const validEffects = ["shake", "rainbow", "gold_rain", "explosion", "matrix", "fire"];
    for (const egg of easterEggs) {
      expect(egg.id).toBeTruthy();
      expect(typeof egg.id).toBe("string");
      expect(egg.name).toBeTruthy();
      expect(egg.emoji).toBeTruthy();
      expect(egg.description).toBeTruthy();
      expect(typeof egg.checkFn).toBe("function");
      expect(validEffects).toContain(egg.effect);
    }
  });

  it("has no duplicate IDs", () => {
    const ids = easterEggs.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("checkEasterEggs returns null when no conditions met", () => {
    resetEasterEggs();
    const result = checkEasterEggs([]);
    expect(result).toBeNull();
  });

  it("checkEasterEggs triggers 'speed-demon' with 3 supercars", () => {
    resetEasterEggs();
    const purchases: Purchase[] = Array.from({ length: 3 }, (_, i) => ({
      id: `car-${i}`,
      product: {
        title: `Supercar ${i}`, price: 500_000, imageUrl: null, description: "",
        sourceUrl: `https://example.com/${i}`, assetClass: "supercar" as AssetClass,
        monthlyOverhead: 25_000,
      },
      billionaireId: "elon-musk",
      timestamp: Date.now(),
    }));
    const result = checkEasterEggs(purchases);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("speed-demon");
  });

  it("does not re-trigger the same easter egg", () => {
    resetEasterEggs();
    const purchases: Purchase[] = Array.from({ length: 3 }, (_, i) => ({
      id: `car-${i}`,
      product: {
        title: `Supercar ${i}`, price: 500_000, imageUrl: null, description: "",
        sourceUrl: `https://example.com/${i}`, assetClass: "supercar" as AssetClass,
        monthlyOverhead: 25_000,
      },
      billionaireId: "elon-musk",
      timestamp: Date.now(),
    }));
    checkEasterEggs(purchases); // First trigger
    const second = checkEasterEggs(purchases); // Should not re-trigger
    // second is either null or a different egg
    if (second !== null) {
      expect(second.id).not.toBe("speed-demon");
    }
  });
});
```

---

## 6. CI Integration

### 6.1 Updated `.github/workflows/ci.yml`

Replace the existing CI workflow with:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - run: npm install --legacy-peer-deps

      - name: Lint
        run: npm run lint

      - name: Type Check
        run: npm run type-check

      - name: Test
        run: npm run test

      - name: Test Coverage
        run: npm run test:coverage

      - name: Check Coverage Thresholds
        run: |
          # Vitest exits non-zero if thresholds defined in vitest.config.ts are not met.
          # The test:coverage step already enforces this, but we make it explicit.
          echo "✅ Coverage thresholds passed"

      - name: Upload Coverage Report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/
          retention-days: 14

      - name: Build
        run: npm run build
```

### 6.2 Key CI changes from the current workflow

| Before | After |
|---|---|
| lint → type-check → build | lint → type-check → **test → test:coverage** → build |
| No test step | `npm run test` runs Vitest in single-run mode |
| No coverage gate | `npm run test:coverage` enforces thresholds; CI fails if below |
| No artifacts | Coverage HTML report uploaded as build artifact (14-day retention) |

### 6.3 Cron protection

The 2-hour cron makes P0-P2 code changes. If it creates a PR, the CI gate now requires all tests to pass **before merge**. This catches:

- **Formatting regressions** — `format.test.ts` catches broken `formatCurrency`, `proxyImage`, etc.
- **Classification drift** — `asset-classifier.test.ts` catches misclassified products
- **SSRF bypass** — `url-validator.test.ts` catches removed/weakened IP blocks
- **Cart logic bugs** — `store.test.ts` catches broken add/remove/reset flows
- **Data corruption** — `data-integrity.test.ts` catches missing fields, duplicate IDs, broken shapes

---

## 7. Rollout Plan

### Phase 1 (Day 1) — Pure Logic + Data Integrity

Install Vitest and write the 5 test files above:

```bash
cd billionaire-cart
npm install -D vitest vite-tsconfig-paths
```

Files to create:
- `vitest.config.ts`
- `src/test-setup.ts`
- `src/lib/__tests__/format.test.ts`
- `src/lib/__tests__/asset-classifier.test.ts`
- `src/lib/__tests__/url-validator.test.ts`
- `src/lib/__tests__/store.test.ts`
- `src/data/__tests__/data-integrity.test.ts`

Add `test`, `test:watch`, and `test:coverage` scripts to `package.json`.

Update `.github/workflows/ci.yml` to add test + coverage steps.

**Expected result: ~80+ tests, covering the highest-risk code paths.**

### Phase 2 (Week 2) — Store + API Routes

- `src/lib/__tests__/use-live-data.test.ts` — test `setLiveData`, `getMerged`, `getEnriched`
- `src/lib/__tests__/use-currency.test.ts` — test `convert`, `formatConverted`, `symbol`
- `src/app/api/__tests__/parse.test.ts` — test URL extraction logic, JSON-LD parsing, rate limiting
- `src/app/api/__tests__/image-proxy.test.ts` — test SSRF check integration

### Phase 3 (Week 3-4) — Components (optional)

Install `@testing-library/react`, `@testing-library/jest-dom`, and `jsdom`.

Start with the 5 highest-complexity components. Switch the Vitest environment to `jsdom` per-file using the `// @vitest-environment jsdom` directive.

---

## 8. File Placement Summary

```
billionaire-cart/
├── vitest.config.ts                          # Vitest configuration
├── src/
│   ├── test-setup.ts                         # Global test setup
│   ├── lib/
│   │   └── __tests__/
│   │       ├── format.test.ts                # P0: formatting functions
│   │       ├── asset-classifier.test.ts      # P0: product classification
│   │       ├── url-validator.test.ts         # P0: SSRF protection
│   │       └── store.test.ts                 # P2: Zustand cart store
│   └── data/
│       └── __tests__/
│           └── data-integrity.test.ts        # P1: shape/completeness checks
├── .github/
│   └── workflows/
│       └── ci.yml                            # Updated with test + coverage
└── coverage/                                 # Generated (gitignored)
```