# Architecture Rules

> Machine-enforceable constraints for the Billionaire Cart codebase.
> A cron agent runs every 2 hours and MUST follow these rules when making automated changes.

---

## 1. File Size Audit & Splitting Plan

### Hard Limits

| Metric | Limit | Enforcement |
|---|---|---|
| Lines per file (components) | **300** | FAIL build lint if exceeded |
| Lines per file (API routes) | **250** | FAIL build lint if exceeded |
| Lines per file (lib utilities) | **200** | FAIL build lint if exceeded |
| Lines per file (data/config) | **500** | WARN only (translation strings are naturally long) |
| Lines per function/component body | **80** | FAIL build lint if exceeded |
| Lines per JSX return block | **120** | WARN — extract sub-components if exceeded |

### Current Violations & Remediation

#### `src/components/omni-box.tsx` — 642 lines → split into 5 files

The OmniBox is a monolith containing URL parsing orchestration, manual entry form, batch paste handling, product history, loading skeleton, checkout flow, and achievement toast display. Split as follows:

```
src/components/omni-box/
├── index.tsx              # Re-export OmniBox (barrel)
├── omni-box.tsx           # Core shell: input bar + state orchestration (~150 lines)
├── omni-box-manual.tsx    # Manual entry form (ManualEntryForm component, ~70 lines)
├── omni-box-history.tsx   # Recent products dropdown (RecentProducts component, ~90 lines)
├── omni-box-batch.tsx     # Batch URL paste prompt + progress (BatchParse component, ~60 lines)
└── use-omni-box.ts        # Custom hook: all useState/useCallback/useEffect logic (~180 lines)
```

**How to split — step by step:**

1. **Extract `useOmniBox` hook** (`use-omni-box.ts`): Move all 16 `useState` declarations, `parseUrl`, `handlePaste`, `handleBatchParse`, `handleManualSubmit`, `handleAuthorize`, `handleCheckoutComplete`, `handleRepurchase`, and the two `useEffect` hooks. The hook returns `{ url, setUrl, loading, product, error, ... }` — one flat object. The OmniBox shell calls this single hook.
2. **Extract `ManualEntryForm`**: The `{showManual && (...)}` AnimatePresence block (lines ~470–520 currently). Props: `{ manualTitle, setManualTitle, manualPrice, setManualPrice, manualClass, setManualClass, onSubmit, onBack, locale }`.
3. **Extract `RecentProducts`**: The `{showHistory && recentProducts.length > 0 && (...)}` block. Props: `{ products, onRepurchase, onRemove, locale }`.
4. **Extract `BatchParse`**: The batch URL prompt + batch progress/result blocks. Props: `{ batchUrls, batchProgress, batchResult, onParse, onCancel, locale }`.
5. **Barrel re-export**: `index.tsx` contains `export { OmniBox } from './omni-box';`.

#### `src/app/api/parse/route.ts` — 838 lines → split into 6 files

The parse route contains 7 platform-specific HTML extractors, a generic meta/regex extractor, an AI fallback, rate limiting, caching, D1 persistence, and the POST handler. Each extractor is a self-contained pure function operating on `(html: string, url: string)` — the easiest possible split.

```
src/app/api/parse/
├── route.ts                    # POST handler + orchestration only (~120 lines)
├── extractors/
│   ├── json-ld.ts              # extractJsonLd (~50 lines)
│   ├── amazon.ts               # extractAmazonData (~55 lines)
│   ├── ebay.ts                 # extractEbayData (~50 lines)
│   ├── taobao.ts               # extractTaobaoData + extractJDData (~100 lines, same region)
│   ├── western-retail.ts       # extractWalmartData + extractBestBuyData + extractEtsyData (~130 lines)
│   ├── meta-tags.ts            # extractProductMeta + extractMetaTags + extractPrice (~80 lines)
│   └── ai-fallback.ts          # parseWithAI (~50 lines)
├── rate-limit.ts               # checkRate + rateMap (~20 lines)
├── cache.ts                    # In-memory cache map (~10 lines)
└── d1-persist.ts               # saveToD1 (~60 lines)
```

**Extractor interface — every extractor must conform to:**

```typescript
// src/app/api/parse/extractors/types.ts
import { ParsedProduct } from "@/lib/types";

export type ExtractorResult = Partial<ParsedProduct> | null;
export type HtmlExtractor = (html: string, url: string) => ExtractorResult;
export type AsyncExtractor = (html: string, url: string) => Promise<ExtractorResult>;
```

The `route.ts` POST handler imports all extractors and runs them in priority order (JSON-LD → product meta → platform-specific → OG/regex → AI). This preserves the current merge logic but each extractor is independently testable.

#### `src/lib/i18n.ts` — 423 lines → split into 2 files

The file is ~395 lines of static translation strings and ~25 lines of runtime logic (`t()`, `tierLabel()`). Split:

```
src/lib/i18n/
├── index.ts          # Re-exports t() and tierLabel() (barrel)
├── strings.ts        # The `strings` Record — pure data (~395 lines, exempt from 200-line lib limit)
└── i18n.ts           # t(), tierLabel(), Locale type (~30 lines)
```

The `strings.ts` data file gets the **500-line data/config exemption**, not the 200-line lib limit. The runtime logic in `i18n.ts` stays tiny. All existing `import { t } from "@/lib/i18n"` continue working via the barrel.

---

## 2. Component Organization

### Current state: 24 flat files in `src/components/`

Reorganize into domain subdirectories. Each subdirectory gets a barrel `index.ts` re-exporting its public components so existing import paths break minimally.

```
src/components/
├── shopping/                     # Core purchase flow
│   ├── index.ts
│   ├── omni-box/                 # (split per §1 above)
│   ├── product-card.tsx          219 lines
│   ├── catalog.tsx               357 lines ⚠️ (at limit, monitor)
│   ├── checkout-animation.tsx    ~90 lines
│   └── purchase-feed.tsx         315 lines ⚠️ (at limit, monitor)
│
├── game/                         # Gamification & challenges
│   ├── index.ts
│   ├── speedrun-timer.tsx        290 lines (just under limit)
│   ├── combo-streak.tsx          261 lines
│   ├── achievements.tsx          ~60 lines
│   └── easter-egg-overlay.tsx    ~50 lines
│
├── finance/                      # Balance, wealth, spending analytics
│   ├── index.ts
│   ├── balance-display.tsx       ~100 lines
│   ├── earnings-ticker.tsx       ~80 lines
│   ├── spending-speed.tsx        ~60 lines
│   ├── wealth-context.tsx        247 lines
│   ├── category-breakdown.tsx    ~60 lines
│   └── guilt-meter.tsx          224 lines
│
├── identity/                     # Billionaire selection & display
│   ├── index.ts
│   ├── identity-selector.tsx     171 lines
│   ├── black-card.tsx            ~100 lines
│   └── billionaire-reactions.tsx 252 lines
│
├── effects/                      # Visual effects, overlays, sharing
│   ├── index.ts
│   ├── atmosphere.tsx            191 lines
│   ├── particle-burst.tsx        ~80 lines
│   ├── absurd-toast.tsx          241 lines
│   ├── bankrupt-overlay.tsx      238 lines
│   └── vault.tsx                 ~80 lines
│
└── share/                        # Sharing & receipts
    ├── index.ts
    └── share-receipt.tsx         230 lines
```

### Rules for subdirectory assignment

| Condition | Action |
|---|---|
| Component primarily handles product parsing, buying, or cart actions | → `shopping/` |
| Component tracks scores, timers, streaks, or unlockables | → `game/` |
| Component displays monetary balances, analytics, or comparisons | → `finance/` |
| Component handles billionaire identity selection or persona display | → `identity/` |
| Component is a visual effect, overlay, or ambient animation | → `effects/` |
| Component handles sharing, exporting, or receipts | → `share/` |
| Component doesn't fit any domain | stays in `components/` root |

### Barrel export convention

Every subdirectory barrel (`index.ts`) uses **named re-exports only**:

```typescript
// src/components/shopping/index.ts
export { OmniBox } from './omni-box';
export { ProductCard } from './product-card';
export { Catalog } from './catalog';
export { CheckoutAnimation } from './checkout-animation';
export { PurchaseFeed } from './purchase-feed';
```

---

## 3. Hard Rules for the Cron Agent

These are the machine-enforceable constraints. Every rule has a clear pass/fail check.

### 3.1 File Size

| Rule ID | Rule | Check |
|---|---|---|
| `SIZE-001` | Component files ≤ 300 lines | `wc -l < file` |
| `SIZE-002` | API route files ≤ 250 lines | `wc -l < file` |
| `SIZE-003` | Lib utility files ≤ 200 lines | `wc -l < file` |
| `SIZE-004` | Data/config files ≤ 500 lines (warn only) | `wc -l < file` |
| `SIZE-005` | No function body > 80 lines (export to opening brace → closing brace) | AST or regex check |

### 3.2 Function Size

| Rule ID | Rule | Check |
|---|---|---|
| `FUNC-001` | No React component body exceeds 80 lines of logic (hooks + handlers, excluding the JSX return) | Count lines from `function ComponentName` or `const ComponentName =` to the `return (` |
| `FUNC-002` | If a component's JSX return exceeds 120 lines, extract child markup into sub-components | Count lines from `return (` to the closing `)` of the return |
| `FUNC-003` | No single `useCallback`/`useMemo` body exceeds 30 lines — extract to a named helper | Regex: `useCallback\(` then count to matching `)` |

### 3.3 Export Conventions

| Rule ID | Rule | Check |
|---|---|---|
| `EXP-001` | Components: **named exports only** — `export function ComponentName` or `export const ComponentName` | grep for `export default` in component files; only `page.tsx`, `layout.tsx`, `error.tsx`, `global-error.tsx` may use default exports |
| `EXP-002` | Lib files: **named exports only** | Same check |
| `EXP-003` | API routes: `export async function GET/POST/...` — named, per Next.js App Router convention | These are the only allowed default-like pattern |
| `EXP-004` | Barrel files (`index.ts`): re-export only, no logic — `export { X } from './x'` | Barrel must contain only `export` statements and comments |

### 3.4 File Naming

| Rule ID | Rule | Check |
|---|---|---|
| `NAME-001` | All source files use **kebab-case**: `spending-speed.tsx`, not `SpendingSpeed.tsx` | Regex: `/^[a-z][a-z0-9-]*(\.[a-z]+)+$/` on filename |
| `NAME-002` | React component files end in `.tsx` | Extension check |
| `NAME-003` | Pure logic/data files end in `.ts` | Extension check |
| `NAME-004` | Custom hooks start with `use-`: `use-live-data.ts`, `use-currency.ts` | Filename check |
| `NAME-005` | Test files are co-located: `component.test.tsx` next to `component.tsx` | Path check |

### 3.5 When to Create a New File vs Extend Existing

| Rule ID | Rule | Check |
|---|---|---|
| `SPLIT-001` | Adding a new visual section to the page → new component file | PR review / diff check |
| `SPLIT-002` | Adding a new platform extractor to parse route → new file in `extractors/` | PR review |
| `SPLIT-003` | If an edit would push a file past its size limit → split first, then add | `wc -l` before committing |
| `SPLIT-004` | If a component has > 8 `useState` calls → extract a custom hook (`use-*.ts`) | grep count |
| `SPLIT-005` | If two functions in a file share no imports and serve different domains → separate files | Manual review |

### 3.6 Import Depth & Dependency Rules

| Rule ID | Rule | Check |
|---|---|---|
| `DEP-001` | Max import depth from any component to `types.ts` ≤ 3 hops | Static analysis |
| `DEP-002` | **No circular imports** — enforce with `madge --circular` or equivalent | CI check |
| `DEP-003` | Components MUST NOT import from `src/app/api/` — API routes are server-only | grep |
| `DEP-004` | `src/lib/` files MUST NOT import from `src/components/` — lib is lower-level | grep |
| `DEP-005` | `src/data/` files MUST NOT import from `src/components/` or `src/app/` | grep |
| `DEP-006` | Data files (`src/data/`) may import only from `src/lib/types.ts` | grep |
| `DEP-007` | API routes may import from `src/lib/` only — not from `src/components/` or `src/data/` (except types) | grep |
| `DEP-008` | No more than 15 direct imports per file (excluding type-only imports) | Count `import` statements |

---

## 4. Dependency Graph Health

### Current Dependency Flow (Verified Clean)

```
                    ┌──────────────┐
                    │   src/app/   │
                    │  page.tsx    │
                    └──────┬───────┘
                           │ imports all 24 components
                    ┌──────▼───────┐
                    │ components/* │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         ┌─────────┐ ┌─────────┐ ┌──────────┐
         │ src/lib/ │ │src/data/│ │(peer     │
         │         │ │         │ │components)│
         └────┬────┘ └────┬────┘ └──────────┘
              │           │
              ▼           ▼
         ┌─────────────────────┐
         │   src/lib/types.ts  │
         └─────────────────────┘
```

```
API Routes (server-side, isolated):
  src/app/api/parse/route.ts    → lib/url-validator, lib/asset-classifier, lib/types, lib/d1
  src/app/api/billionaires/     → (standalone fetch)
  src/app/api/image-proxy/      → lib/url-validator
  src/app/api/rates/            → (standalone fetch)
  src/app/api/products/         → lib/d1, lib/types
```

### Lib-to-Lib Dependencies (current)

```
store.ts ──→ types.ts, use-live-data.ts, format.ts
                          │
use-live-data.ts ──→ types.ts
asset-classifier.ts ──→ types.ts
use-locale.ts ──→ i18n.ts
use-currency.ts ──→ (standalone Zustand store)
format.ts ──→ (standalone utilities)
```

**Verdict: No circular dependencies. Graph is healthy.**

### Recommended Improvements

1. **`store.ts` calls `useLiveData.getState()` at runtime** — this creates a hidden coupling between two Zustand stores. Document this as an intentional cross-store read (acceptable in Zustand) but do not add more such links. If a third store needs data from another, introduce a `useComposedStore` selector hook instead.

2. **`format.ts` has the `assetLabel()` function with inline `ZH_LABELS`** — this duplicates keys from `i18n.ts`. After the i18n split (§1), move `assetLabel()` to use `t()` directly, eliminating the duplicate data:
   ```typescript
   export function assetLabel(cls: string, locale: Locale): string {
     return t(`asset.${cls}`, locale);
   }
   ```

3. **`page.tsx` imports all 24 components directly** — this is fine for a single-page app but makes `page.tsx` a coupling hub. After the component reorg (§2), it imports from 6 barrels instead of 24 individual files — a cleaner dependency fan-out.

---

## 5. API Route Structure

### Current State

| Route | Lines | Status |
|---|---|---|
| `api/parse/route.ts` | 838 | 🔴 **3.4× over limit** — must split |
| `api/products/route.ts` | 237 | 🟡 Near limit (250), but inactive (D1) |
| `api/billionaires/route.ts` | 75 | 🟢 Fine |
| `api/image-proxy/route.ts` | 70 | 🟢 Fine |
| `api/rates/route.ts` | 51 | 🟢 Fine |

### Parse Route Refactoring Plan

**Phase 1 — Extract extractors (no behavior change)**

1. Create `src/app/api/parse/extractors/` directory
2. Move each `extractXxxData` function into its own file with the shared `ExtractorResult` type
3. Group by region: Taobao + JD together (Chinese e-commerce, shared CNY→USD conversion logic); Walmart + Best Buy + Etsy together (Western retail, similar DOM patterns)
4. `route.ts` imports and calls them in the same order — identical runtime behavior

**Phase 2 — Extract infrastructure**

1. Move `checkRate` + `rateMap` → `rate-limit.ts`
2. Move `cache` Map → `cache.ts`
3. Move `saveToD1` → `d1-persist.ts`
4. Move `resolveUrl` → `src/lib/url.ts` (it's a general utility)

**Phase 3 — Simplify the POST handler**

After extraction, `route.ts` becomes a clean pipeline:

```typescript
// Pseudocode for the refactored route.ts (~100 lines)
import { checkRate } from './rate-limit';
import { cache } from './cache';
import { extractJsonLd } from './extractors/json-ld';
import { extractProductMeta, extractMetaTags, extractPrice } from './extractors/meta-tags';
import { extractAmazonData } from './extractors/amazon';
import { extractEbayData } from './extractors/ebay';
import { extractTaobaoData, extractJDData } from './extractors/taobao';
import { extractWalmartData, extractBestBuyData, extractEtsyData } from './extractors/western-retail';
import { parseWithAI } from './extractors/ai-fallback';
import { saveToD1 } from './d1-persist';

export async function POST(request: NextRequest) {
  // 1. Rate limit
  // 2. Validate URL
  // 3. Check cache
  // 4. Fetch HTML
  // 5. Run extractor pipeline (priority-ordered)
  // 6. Merge results
  // 7. Classify product
  // 8. Cache + persist
  // 9. Return
}
```

**Adding a new platform extractor** (cron rule):

1. Create `src/app/api/parse/extractors/<platform>.ts`
2. Export a function matching `HtmlExtractor` or `AsyncExtractor` signature
3. Import it in `route.ts` and add to the pipeline at the appropriate priority
4. Never add extractor logic inline in `route.ts`

---

## 6. Quick-Reference Decision Table

Use this when the cron agent is deciding what to do:

| Situation | Action |
|---|---|
| New UI feature | New component file in the appropriate `components/<domain>/` subdirectory |
| New product parsing platform | New file in `api/parse/extractors/`, conforming to `HtmlExtractor` type |
| New i18n strings | Append to `src/lib/i18n/strings.ts` |
| New achievement | Add to `src/data/achievements.ts` (watch 500-line data limit) |
| New catalog item | Add to `src/data/catalog.ts` (watch 500-line data limit) |
| File would exceed size limit after edit | Split the file first using patterns above, then make the edit |
| Need shared type | Add to `src/lib/types.ts` |
| Need shared utility function | Add to `src/lib/format.ts` or create a new `src/lib/<name>.ts` |
| Need shared hook | Create `src/lib/use-<name>.ts` |
| Component has >8 useState | Extract a `use-<component-name>.ts` hook alongside the component |
| Unclear where a file goes | Check domain rules in §2; if still ambiguous, put in `components/` root |

---

## 7. Lint Script (Machine-Enforceable)

The cron agent should run this check before and after every change:

```bash
#!/usr/bin/env bash
# scripts/arch-lint.sh — Architecture rule enforcer
set -euo pipefail

FAIL=0

# SIZE-001: Components ≤ 300 lines
for f in $(find src/components -name '*.tsx' -not -name 'index.tsx'); do
  lines=$(wc -l < "$f")
  if [ "$lines" -gt 300 ]; then
    echo "FAIL SIZE-001: $f has $lines lines (max 300)"
    FAIL=1
  fi
done

# SIZE-002: API routes ≤ 250 lines
for f in $(find src/app/api -name 'route.ts'); do
  lines=$(wc -l < "$f")
  if [ "$lines" -gt 250 ]; then
    echo "FAIL SIZE-002: $f has $lines lines (max 250)"
    FAIL=1
  fi
done

# SIZE-003: Lib files ≤ 200 lines (exclude i18n strings data file)
for f in $(find src/lib -name '*.ts' -not -path '*/i18n/strings.ts'); do
  lines=$(wc -l < "$f")
  if [ "$lines" -gt 200 ]; then
    echo "FAIL SIZE-003: $f has $lines lines (max 200)"
    FAIL=1
  fi
done

# EXP-001: No default exports in components
for f in $(find src/components -name '*.tsx' -not -name 'index.tsx'); do
  if grep -q 'export default' "$f"; then
    echo "FAIL EXP-001: $f uses default export (use named exports)"
    FAIL=1
  fi
done

# DEP-003: Components must not import from api/
for f in $(find src/components -name '*.tsx' -o -name '*.ts'); do
  if grep -q "from.*['\"]@/app/api" "$f" 2>/dev/null || grep -q "from.*['\"].*api/" "$f" 2>/dev/null; then
    echo "FAIL DEP-003: $f imports from API routes"
    FAIL=1
  fi
done

# DEP-004: Lib must not import from components
for f in $(find src/lib -name '*.ts'); do
  if grep -q "from.*['\"]@/components" "$f" 2>/dev/null; then
    echo "FAIL DEP-004: $f imports from components"
    FAIL=1
  fi
done

# DEP-005: Data must not import from components or app
for f in $(find src/data -name '*.ts'); do
  if grep -q "from.*['\"]@/components\|from.*['\"]@/app" "$f" 2>/dev/null; then
    echo "FAIL DEP-005: $f imports from components or app"
    FAIL=1
  fi
done

# NAME-001: Kebab-case filenames
for f in $(find src -name '*.ts' -o -name '*.tsx' | xargs -I{} basename {}); do
  if echo "$f" | grep -qP '[A-Z]'; then
    echo "FAIL NAME-001: $f is not kebab-case"
    FAIL=1
  fi
done

# DEP-008: Max 15 imports per file
for f in $(find src -name '*.ts' -o -name '*.tsx'); do
  count=$(grep -c "^import " "$f" 2>/dev/null || echo 0)
  if [ "$count" -gt 15 ]; then
    echo "FAIL DEP-008: $f has $count imports (max 15)"
    FAIL=1
  fi
done

exit $FAIL
```

---

## 8. Summary of Current Violations

| Rule | File | Current | Limit | Action Required |
|---|---|---|---|---|
| SIZE-001 | `omni-box.tsx` | 642 | 300 | Split per §1 |
| SIZE-001 | `catalog.tsx` | 357 | 300 | Split catalog grid vs filter logic |
| SIZE-001 | `purchase-feed.tsx` | 315 | 300 | Extract feed item into sub-component |
| SIZE-002 | `api/parse/route.ts` | 838 | 250 | Split per §5 |
| SIZE-003 | `i18n.ts` | 423 | 200 | Split per §1 (strings exempt as data) |
| SIZE-001 | `speedrun-timer.tsx` | 290 | 300 | ✅ OK (under limit) |
| SIZE-001 | `combo-streak.tsx` | 261 | 300 | ✅ OK |

**Priority order for cron remediation:**
1. `api/parse/route.ts` — highest ROI, pure function extraction, zero risk
2. `omni-box.tsx` — highest component complexity, hook extraction reduces cognitive load
3. `i18n.ts` — trivial split, pure data separation
4. `catalog.tsx` — minor, extract filter bar
5. `purchase-feed.tsx` — minor, extract feed item row
