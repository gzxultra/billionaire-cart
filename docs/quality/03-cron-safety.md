# 03 — Cron Automated Iteration Safety

> Guardrails for the AI agent that pushes code to `main` every 2 hours.

---

## Context

An AI agent runs on a 2-hour cadence, picks up P0–P2 improvement items, commits to `main`, and auto-deploys to Cloudflare Pages at `billionaire-cart.pages.dev`. There are no humans in the loop. The recent React Error #185 infinite loop — caused by a Zustand selector returning a new array reference on every render inside `use-live-data.ts` — proved that **a passing CI build does not mean the site works at runtime**. This document defines the safety system that prevents that from happening again.

---

## 1. Quality Gate Pipeline

Every cron commit must pass **all** gates in sequence. Any failure → abort the commit, log the reason, alert, and leave `main` untouched.

```
┌─────────────────────────────────────────────────────────┐
│  Gate 0  Pre-flight: scope & diff checks                │
│  Gate 1  TypeScript strict type-check                   │
│  Gate 2  ESLint (zero warnings)                         │
│  Gate 3  Vitest unit + integration tests                │
│  Gate 4  Next.js production build                       │
│  Gate 5  Bundle size budget                             │
│  Gate 6  Smoke test (start server, hit key routes)      │
│  Gate 7  Zustand selector regression tests              │
│  Gate 8  Commit, push, deploy                           │
│  Gate 9  Post-deploy health check (live site)           │
└─────────────────────────────────────────────────────────┘
```

### Gate 0 — Pre-flight: Scope & Diff Checks

Before any code change is staged, validate that the proposed diff falls within scope limits (see §2). This gate is enforced by the cron runner script, not CI.

```bash
#!/usr/bin/env bash
set -euo pipefail

# Count changed files and lines
FILES_CHANGED=$(git diff --cached --name-only | wc -l)
LINES_CHANGED=$(git diff --cached --stat | tail -1 | grep -oP '\d+(?= insertion)' || echo 0)
LINES_DELETED=$(git diff --cached --stat | tail -1 | grep -oP '\d+(?= deletion)' || echo 0)
TOTAL_LINES=$(( LINES_CHANGED + LINES_DELETED ))

MAX_FILES=8
MAX_LINES=300

if [ "$FILES_CHANGED" -gt "$MAX_FILES" ]; then
  echo "❌ SCOPE VIOLATION: $FILES_CHANGED files changed (max $MAX_FILES)"
  exit 1
fi

if [ "$TOTAL_LINES" -gt "$MAX_LINES" ]; then
  echo "❌ SCOPE VIOLATION: $TOTAL_LINES lines changed (max $MAX_LINES)"
  exit 1
fi

# Check for forbidden files
FORBIDDEN_PATTERN="^(\.github/|package\.json|package-lock\.json|bun\.lock|tsconfig\.json|next\.config\.mjs|wrangler\.toml|tailwind\.config\.ts|postcss\.config\.mjs)"
FORBIDDEN_HITS=$(git diff --cached --name-only | grep -cE "$FORBIDDEN_PATTERN" || true)

if [ "$FORBIDDEN_HITS" -gt 0 ]; then
  echo "❌ FORBIDDEN FILES touched:"
  git diff --cached --name-only | grep -E "$FORBIDDEN_PATTERN"
  exit 1
fi

echo "✅ Pre-flight passed: $FILES_CHANGED files, $TOTAL_LINES lines"
```

### Gate 1 — TypeScript Strict Type-Check

```bash
npx tsc --noEmit --strict
# Exit code 0 = pass, non-zero = fail
```

Must run **before** the build because `next build` sometimes swallows or downgrades TS errors.

### Gate 2 — ESLint (Zero Warnings)

```bash
npx next lint --max-warnings 0
# --max-warnings 0 ensures warnings are treated as errors
```

### Gate 3 — Vitest Unit + Integration Tests

```bash
npx vitest run --reporter=verbose --bail=1
# --bail=1: stop on first failure to save time
# Exit code 0 = all pass
```

Test suite must include (see §3 for details):
- Zustand selector stability tests
- Store logic tests (add/remove purchases, achievements)
- API route response shape tests
- Component render smoke tests (jsdom)

### Gate 4 — Next.js Production Build

```bash
npm run build
# Equivalent to: next build
# Exit code 0 = success
```

This catches:
- Import errors
- Server/client boundary violations (`"use client"` mistakes)
- Static generation failures
- Webpack/Turbopack bundle errors

### Gate 5 — Bundle Size Budget

```bash
#!/usr/bin/env bash
set -euo pipefail

# After `next build`, check .next/build-manifest.json or use size-limit
# Simple approach: check total .next/static size
BUNDLE_SIZE_KB=$(du -sk .next/static 2>/dev/null | cut -f1)
MAX_BUNDLE_KB=1500  # 1.5 MB budget for static assets

if [ "$BUNDLE_SIZE_KB" -gt "$MAX_BUNDLE_KB" ]; then
  echo "❌ BUNDLE SIZE: ${BUNDLE_SIZE_KB}KB exceeds budget of ${MAX_BUNDLE_KB}KB"
  exit 1
fi

echo "✅ Bundle size OK: ${BUNDLE_SIZE_KB}KB / ${MAX_BUNDLE_KB}KB"

# Log for tracking (append to audit log)
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) bundle_size_kb=$BUNDLE_SIZE_KB" >> .cron/audit/bundle-sizes.log
```

For more granular tracking, add [`@next/bundle-analyzer`](https://www.npmjs.com/package/@next/bundle-analyzer) or [`size-limit`](https://github.com/ai/size-limit):

```json
// package.json (if using size-limit)
{
  "size-limit": [
    { "path": ".next/static/**/*.js", "limit": "350 KB", "gzip": true }
  ]
}
```

### Gate 6 — Smoke Test (Local Server)

After build, start the production server and verify key routes return 200 with valid HTML:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Start production server in background
PORT=3999
npm run start -- -p $PORT &
SERVER_PID=$!

# Give it time to boot
sleep 5

FAIL=0
ROUTES=("/" "/api/billionaires" "/api/rates")

for route in "${ROUTES[@]}"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT$route" || echo "000")
  if [ "$STATUS" != "200" ]; then
    echo "❌ SMOKE FAIL: $route returned $STATUS"
    FAIL=1
  else
    echo "✅ $route → 200"
  fi
done

# For the main page, also check that critical DOM markers are present
# (catches React hydration failures / blank pages)
BODY=$(curl -s "http://localhost:$PORT/")
for marker in "billionaire" "__next" "react"; do
  if ! echo "$BODY" | grep -qi "$marker"; then
    echo "❌ SMOKE FAIL: / missing expected marker '$marker'"
    FAIL=1
  fi
done

kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

exit $FAIL
```

### Gate 7 — Zustand Selector Regression Tests

Dedicated tests that guard against the exact React #185 pattern (see §3.5 for full detail):

```bash
npx vitest run src/__tests__/zustand-selectors.test.ts --reporter=verbose
```

### Gates 8 & 9 — Commit, Deploy, and Post-Deploy Health Check

Only after gates 0–7 pass:

```bash
#!/usr/bin/env bash
set -euo pipefail

# === Gate 8: Commit and push ===
TIMESTAMP=$(date -u +%Y%m%d-%H%M%S)
CHANGE_SUMMARY="..."  # generated by the cron agent
git add -A
git commit -m "cron($TIMESTAMP): $CHANGE_SUMMARY"
git push origin main

# === Gate 9: Post-deploy health check ===
# Wait for CF Pages deploy (usually 1–3 min after push)
echo "Waiting 180s for Cloudflare Pages deploy..."
sleep 180

LIVE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://billionaire-cart.pages.dev/" || echo "000")
if [ "$LIVE_STATUS" != "200" ]; then
  echo "❌ LIVE SITE DOWN after deploy (HTTP $LIVE_STATUS)"
  echo "Initiating rollback..."
  # See §4 for rollback procedure
  exit 1
fi

# Check for React error indicators in the HTML
LIVE_BODY=$(curl -s "https://billionaire-cart.pages.dev/")
if echo "$LIVE_BODY" | grep -qi "application error\|internal server error\|react error"; then
  echo "❌ LIVE SITE ERROR detected in HTML"
  exit 1
fi

echo "✅ Live site healthy"
```

---

## 2. Scope Limits Per Cron Run

### 2.1 Quantitative Limits

| Metric | Limit | Rationale |
|---|---|---|
| Max files changed per commit | **8** | One focused change. Large refactors must be split across runs. |
| Max lines changed (insertions + deletions) | **300** | Enough for a feature or fix, small enough to reason about. |
| Max new dependencies added | **0** | Cron must never add dependencies. |

### 2.2 File Access Tiers

#### 🔴 READ-ONLY — Cron Must Never Modify

These files control build, deploy, infrastructure, and configuration. Any change requires a human PR.

| File / Pattern | Reason |
|---|---|
| `.github/workflows/*.yml` | CI/deploy pipeline — a bad change here bypasses all safety gates |
| `package.json` | Dependencies and scripts — cron must not add/remove/update packages |
| `bun.lock` / `package-lock.json` | Lockfile integrity |
| `tsconfig.json` | Compiler config |
| `next.config.mjs` | Framework config |
| `wrangler.toml` | Cloudflare deploy config |
| `tailwind.config.ts` | Design system config |
| `postcss.config.mjs` | PostCSS pipeline |
| `migrations/*.sql` | Database schema |
| `.cron/` | Safety infrastructure itself |
| `docs/quality/*.md` | Quality docs (including this file) |

#### 🟡 CAUTION — Extra Validation Required

These files are high-risk because bugs in them caused (or would cause) runtime crashes. The cron agent must run the **full** test suite (not just changed-file tests) when touching them, and the commit message must explain the change rationale.

| File | Risk | Required Extra Gate |
|---|---|---|
| `src/lib/store.ts` | Core state — wrong shape breaks every component | Full Zustand selector tests |
| `src/lib/use-live-data.ts` | **React #185 origin** — selector reference stability | Selector stability tests (§3.5) |
| `src/lib/use-currency.ts` | Used in every price render | Currency format snapshot tests |
| `src/app/layout.tsx` | Root layout — breaks entire app if wrong | Smoke test (Gate 6) |
| `src/app/page.tsx` | Main entry — same as above | Smoke test (Gate 6) |
| `src/app/error.tsx` | Error boundary — if this breaks, errors become unrecoverable | Manual review preferred |
| `src/app/global-error.tsx` | Global error boundary | Manual review preferred |

#### 🟢 NORMAL — Standard Gate Pipeline

All other files in `src/components/`, `src/data/`, `src/types/`, `src/app/api/`, `public/`.

### 2.3 Dependency Policy

**Cron must never modify `package.json` or lockfiles.** Period.

If a cron improvement genuinely needs a new dependency, it must:
1. Log the desired dependency and rationale to `.cron/audit/dependency-requests.log`
2. Skip that improvement for this run
3. A human reviews and installs the dependency in a separate PR

---

## 3. Regression Prevention

### 3.1 Unit Test Suite (Vitest)

Add Vitest to the project:

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

**`vitest.config.ts`** (project root):
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      reporter: ["text", "json-summary"],
      include: ["src/lib/**", "src/components/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

**`src/__tests__/setup.ts`**:
```ts
import "@testing-library/jest-dom/vitest";
```

### 3.2 Snapshot Testing for Output Stability

Snapshots catch unexpected changes to rendered output, formatted values, and data shapes.

```ts
// src/__tests__/format.test.ts
import { describe, it, expect } from "vitest";
import { formatCurrency, generateId } from "@/lib/format";

describe("formatCurrency", () => {
  it("formats billions correctly", () => {
    expect(formatCurrency(1_500_000_000)).toMatchInlineSnapshot(`"$1,500,000,000"`);
  });

  it("formats millions correctly", () => {
    expect(formatCurrency(42_000_000)).toMatchInlineSnapshot(`"$42,000,000"`);
  });

  // Snapshot prevents accidental format changes
  it("matches snapshot for edge cases", () => {
    const cases = [0, 1, 999, 1000, 999_999, 1_000_000, 1_000_000_000];
    expect(cases.map(formatCurrency)).toMatchSnapshot();
  });
});
```

```ts
// src/__tests__/store-shape.test.ts
import { describe, it, expect } from "vitest";
import { useCartStore } from "@/lib/store";

describe("store initial state shape", () => {
  it("matches expected shape snapshot", () => {
    const state = useCartStore.getState();
    // Snapshot the keys and types, not values (values change)
    const shape = Object.fromEntries(
      Object.entries(state).map(([k, v]) => [k, typeof v])
    );
    expect(shape).toMatchSnapshot();
  });
});
```

### 3.3 API Route Response Shape Tests

```ts
// src/__tests__/api-billionaires.test.ts
import { describe, it, expect } from "vitest";

// Test the response shape contract (mock fetch or import handler directly)
describe("GET /api/billionaires", () => {
  it("returns expected shape", async () => {
    // Import the route handler if Next.js supports it, or test the data layer
    const { billionaires } = await import("@/data/billionaires");
    
    expect(billionaires.length).toBeGreaterThan(0);
    
    for (const b of billionaires) {
      expect(b).toHaveProperty("id");
      expect(b).toHaveProperty("name");
      expect(b).toHaveProperty("netWorthB");
      expect(typeof b.netWorthB).toBe("number");
      expect(b).toHaveProperty("earningsPerSecond");
      expect(typeof b.earningsPerSecond).toBe("number");
    }
  });
});
```

### 3.4 Smoke Test After Build

Covered in Gate 6 above. The key principle: **a passing build is necessary but not sufficient.** The smoke test starts the actual production server and checks that real HTTP requests return real HTML with expected content markers.

### 3.5 Zustand Selector Stability Tests (React #185 Guard)

This is the most critical regression test. The React #185 bug happened because a Zustand selector (likely `getMerged()`) was returning a new array reference on every call, causing infinite re-renders.

**The pattern to guard against:**

```ts
// ❌ BAD — creates new array on every call → infinite re-render
const getMerged = () => staticBillionaires.map((b) => { ... });

// ✅ GOOD — returns a pre-computed stable reference
const getMerged = () => get().mergedBillionaires;
```

**Dedicated test file — `src/__tests__/zustand-selectors.test.ts`:**

```ts
import { describe, it, expect } from "vitest";
import { useLiveData } from "@/lib/use-live-data";
import { useCartStore, selectTotalSpent, selectMonthlyBurn, selectNetWorth, selectRemaining } from "@/lib/store";

describe("Zustand selector referential stability", () => {
  // === useLiveData selectors ===
  
  it("getMerged() returns the same reference when state has not changed", () => {
    const store = useLiveData.getState();
    const result1 = store.getMerged();
    const result2 = store.getMerged();
    expect(result1).toBe(result2); // === reference equality, not just deep equality
  });

  it("getMerged() returns the same reference across getState() calls", () => {
    const result1 = useLiveData.getState().getMerged();
    const result2 = useLiveData.getState().getMerged();
    expect(result1).toBe(result2);
  });

  it("mergedBillionaires is stable when setLiveData is called with same data", () => {
    const store = useLiveData.getState();
    const mockData = [{
      uri: "elon-musk",
      rank: 1,
      name: "Elon Musk",
      netWorthM: 250000,
      source: "Tesla, SpaceX",
      country: "US",
      industries: ["Automotive"],
      photoUrl: null,
      archivedWorthM: 200000,
    }];
    
    store.setLiveData(mockData);
    const ref1 = useLiveData.getState().mergedBillionaires;
    
    // Calling setLiveData again WILL create a new reference (expected),
    // but getMerged() must still return the current mergedBillionaires
    const ref2 = useLiveData.getState().getMerged();
    expect(ref1).toBe(ref2);
  });

  // === useCartStore selectors ===

  it("selectTotalSpent is a pure function of state (no new allocations)", () => {
    const state = useCartStore.getState();
    const r1 = selectTotalSpent(state);
    const r2 = selectTotalSpent(state);
    expect(r1).toBe(r2);
    expect(typeof r1).toBe("number"); // primitives are always referentially stable
  });

  it("selectMonthlyBurn is a pure function of state", () => {
    const state = useCartStore.getState();
    expect(selectMonthlyBurn(state)).toBe(selectMonthlyBurn(state));
  });

  it("selectNetWorth is a pure function of state", () => {
    const state = useCartStore.getState();
    expect(selectNetWorth(state)).toBe(selectNetWorth(state));
  });

  it("selectRemaining is a pure function of state", () => {
    const state = useCartStore.getState();
    expect(selectRemaining(state)).toBe(selectRemaining(state));
  });
});

describe("Zustand selector lint rules", () => {
  it("useLiveData store does not have inline .map()/.filter()/.reduce() in selector methods", async () => {
    // Static analysis: read the source file and check that getMerged doesn't
    // contain array-creating operations inline
    const fs = await import("fs");
    const source = fs.readFileSync("src/lib/use-live-data.ts", "utf-8");
    
    // Extract the getMerged method body
    const getMergedMatch = source.match(/getMerged:\s*\(\)\s*=>\s*\{([^}]+)\}/s);
    if (getMergedMatch) {
      const body = getMergedMatch[1];
      // It should NOT contain .map, .filter, .reduce, .slice, .concat, [...spread]
      const dangerousPatterns = [".map(", ".filter(", ".reduce(", ".slice(", ".concat(", "[..."];
      for (const pattern of dangerousPatterns) {
        expect(body).not.toContain(pattern);
      }
    }
  });
});
```

### 3.6 Visual Regression Testing

**Feasibility: Possible but heavyweight.** For a cron that runs every 2 hours, full Playwright screenshot comparison adds significant time and flakiness. **Recommended approach: defer to post-deploy health checks and keep visual regression for human PRs.**

If you do want it (e.g., for critical pages only):

```bash
npm install -D @playwright/test
npx playwright install chromium
```

```ts
// e2e/visual.spec.ts
import { test, expect } from "@playwright/test";

test("homepage visual regression", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveScreenshot("homepage.png", {
    maxDiffPixelRatio: 0.02, // Allow 2% pixel diff (animation frames)
  });
});
```

**Recommendation:** Skip visual regression for cron runs. Use it in human PR CI only.

### 3.7 Post-Deploy Live Site Health Check

After Cloudflare Pages deploys (triggered by the push to `main`), verify the live site:

```bash
#!/usr/bin/env bash
set -euo pipefail

SITE_URL="https://billionaire-cart.pages.dev"
MAX_RETRIES=5
RETRY_DELAY=60  # seconds

for i in $(seq 1 $MAX_RETRIES); do
  echo "Health check attempt $i/$MAX_RETRIES..."
  
  # 1. HTTP 200 check
  STATUS=$(curl -s -o /tmp/health-body.html -w "%{http_code}" "$SITE_URL/" || echo "000")
  
  if [ "$STATUS" != "200" ]; then
    echo "⚠️  HTTP $STATUS — retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
    continue
  fi
  
  # 2. Response body sanity
  BODY=$(cat /tmp/health-body.html)
  
  # Must contain Next.js markers
  if ! echo "$BODY" | grep -q "__next"; then
    echo "⚠️  Missing __next marker — retrying..."
    sleep $RETRY_DELAY
    continue
  fi
  
  # Must NOT contain error indicators
  if echo "$BODY" | grep -qiE "application error|internal server error|500|react error"; then
    echo "❌ Error content detected in page HTML"
    # Trigger rollback (see §4)
    exit 1
  fi
  
  # 3. API health
  API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/api/billionaires" || echo "000")
  if [ "$API_STATUS" != "200" ]; then
    echo "❌ /api/billionaires returned $API_STATUS"
    exit 1
  fi
  
  echo "✅ Live site healthy (attempt $i)"
  exit 0
done

echo "❌ Health check failed after $MAX_RETRIES attempts"
exit 1
```

---

## 4. Rollback Strategy

### 4.1 Decision Tree

```
Site broken detected (health check fails)
  │
  ├── Was the last deploy a cron commit?
  │     │
  │     YES → Automated rollback:
  │     │     1. Cloudflare Pages API rollback (instant, restores last good deploy)
  │     │     2. Git revert of the cron commit
  │     │     3. Push revert (triggers new clean deploy)
  │     │
  │     NO → Alert human, do not auto-rollback
  │
  └── Is the site partially broken (one route fails, others work)?
        │
        YES → Log but do NOT auto-rollback. Alert human.
        NO  → Full rollback.
```

### 4.2 Cloudflare Pages API Rollback

Cloudflare Pages supports instant rollback to any previous successful production deployment.

**API endpoint:**
```
POST /accounts/{account_id}/pages/projects/{project_name}/deployments/{deployment_id}/rollback
```

**Script — `.cron/scripts/cf-rollback.sh`:**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Required env vars:
#   CF_ACCOUNT_ID   — Cloudflare account ID
#   CF_API_TOKEN    — Cloudflare API token with Pages write access
#   CF_PROJECT_NAME — "billionaire-cart"

CF_PROJECT_NAME="${CF_PROJECT_NAME:-billionaire-cart}"
API_BASE="https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/pages/projects/${CF_PROJECT_NAME}"

echo "Fetching deployment list..."

# Get the last 5 deployments
DEPLOYMENTS=$(curl -s \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "${API_BASE}/deployments?per_page=5")

# Parse: find the second deployment (the one before the current/broken one)
# The first is the current (broken) deploy, the second is the rollback target
ROLLBACK_ID=$(echo "$DEPLOYMENTS" | python3 -c "
import json, sys
data = json.load(sys.stdin)
deploys = [d for d in data.get('result', []) if d.get('environment') == 'production']
if len(deploys) < 2:
    print('NO_TARGET')
    sys.exit(0)
print(deploys[1]['id'])
")

if [ "$ROLLBACK_ID" = "NO_TARGET" ]; then
  echo "❌ No previous production deployment to rollback to"
  exit 1
fi

echo "Rolling back to deployment: $ROLLBACK_ID"

ROLLBACK_RESULT=$(curl -s -X POST \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  "${API_BASE}/deployments/${ROLLBACK_ID}/rollback")

SUCCESS=$(echo "$ROLLBACK_RESULT" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('true' if data.get('success') else 'false')
")

if [ "$SUCCESS" = "true" ]; then
  echo "✅ Cloudflare Pages rolled back to $ROLLBACK_ID"
else
  echo "❌ Rollback API call failed:"
  echo "$ROLLBACK_RESULT"
  exit 1
fi
```

### 4.3 Git-Level Rollback

After the CF Pages instant rollback restores the live site, also revert the bad commit in Git so the next cron run starts from known-good code:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Revert the most recent commit (the cron commit that broke things)
LAST_COMMIT=$(git log -1 --format='%H')
LAST_MSG=$(git log -1 --format='%s')

# Only auto-revert if it's a cron commit
if [[ "$LAST_MSG" != cron\(* ]]; then
  echo "⚠️  Last commit is not a cron commit: '$LAST_MSG'"
  echo "Skipping auto-revert — alerting human."
  exit 1
fi

git revert --no-edit "$LAST_COMMIT"
git push origin main

echo "✅ Reverted commit $LAST_COMMIT"
echo "   Original message: $LAST_MSG"
```

### 4.4 Health Check Endpoint

Add a lightweight health endpoint to the app itself:

**`src/app/api/health/route.ts`:**

```ts
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    // Basic sanity: can we import core modules without crashing?
    const { billionaires } = await import("@/data/billionaires");

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      billionairesCount: billionaires.length,
      version: process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7) || "dev",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
```

The health check script (§3.7) should hit this endpoint in addition to the main page:

```bash
HEALTH=$(curl -s "$SITE_URL/api/health")
HEALTH_STATUS=$(echo "$HEALTH" | python3 -c "import json,sys; print(json.load(sys.stdin).get('status','unknown'))")

if [ "$HEALTH_STATUS" != "ok" ]; then
  echo "❌ /api/health returned status=$HEALTH_STATUS"
  # Trigger rollback
fi
```

### 4.5 Full Automated Rollback Sequence

Combine CF rollback + git revert into one script — `.cron/scripts/auto-rollback.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== AUTOMATED ROLLBACK INITIATED ==="
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Step 1: Instant CF Pages rollback (restores live site in seconds)
echo "Step 1: Cloudflare Pages rollback..."
bash .cron/scripts/cf-rollback.sh

# Step 2: Wait and verify live site is back
echo "Step 2: Verifying live site after CF rollback..."
sleep 30
LIVE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://billionaire-cart.pages.dev/" || echo "000")
if [ "$LIVE_STATUS" != "200" ]; then
  echo "⚠️  Live site still down after CF rollback (HTTP $LIVE_STATUS)"
  echo "Manual intervention required."
  # TODO: send alert (see §6)
  exit 1
fi

# Step 3: Git revert
echo "Step 3: Reverting bad commit in git..."
bash .cron/scripts/git-revert-cron.sh

echo "=== ROLLBACK COMPLETE ==="
```

---

## 5. Conflict & Duplicate Prevention

### 5.1 Preventing Re-Work

Each cron run must maintain a log of what it changed and why. Before starting work:

**`.cron/state/completed-items.json`:**
```json
{
  "items": [
    {
      "id": "fix-selector-stability",
      "priority": "P0",
      "completedAt": "2026-07-04T08:00:00Z",
      "commitSha": "abc1234",
      "filesChanged": ["src/lib/use-live-data.ts"],
      "status": "deployed"
    }
  ]
}
```

The cron agent must:
1. Read `completed-items.json` before picking work
2. Skip any item whose `id` is already in the completed list
3. After a successful commit, append the item to `completed-items.json`
4. If a completed item was later reverted (rollback), mark its status as `"reverted"` so the agent knows not to retry the same approach

### 5.2 Preventing Conflicting Changes

Rules for the cron agent:

1. **One concern per commit.** Each cron run addresses exactly one P0–P2 item. Never combine unrelated changes.
2. **Pull before work.** Always `git pull --rebase origin main` before starting any changes. The cron runner itself may have pushed a revert since the last run.
3. **Re-validate after pull.** If the pull brought in changes, re-run gates 1–3 on the pre-change state to confirm the baseline is clean.
4. **Lock file.** Use a simple file lock to prevent overlapping cron runs:

```bash
LOCKFILE=".cron/state/cron.lock"

if [ -f "$LOCKFILE" ]; then
  LOCK_AGE=$(( $(date +%s) - $(stat -c %Y "$LOCKFILE") ))
  if [ "$LOCK_AGE" -lt 7200 ]; then  # Less than 2 hours old
    echo "Another cron run is in progress (lock age: ${LOCK_AGE}s). Skipping."
    exit 0
  else
    echo "Stale lock detected (${LOCK_AGE}s). Removing."
    rm "$LOCKFILE"
  fi
fi

echo "$$" > "$LOCKFILE"
trap 'rm -f "$LOCKFILE"' EXIT
```

### 5.3 Commit Message Convention

All cron commits must follow this format:

```
cron(<YYYYMMDD-HHMMSS>): <P-level> <concise description>

Automated change by cron agent.
Priority: P0|P1|P2
Item: <item-id from backlog>
Files changed:
  - path/to/file1.ts
  - path/to/file2.ts

Safety gates passed: tsc ✓ | lint ✓ | test ✓ | build ✓ | bundle ✓ | smoke ✓
```

**Examples:**

```
cron(20260704-100000): P0 fix selector referential stability in use-live-data

Automated change by cron agent.
Priority: P0
Item: fix-selector-stability
Files changed:
  - src/lib/use-live-data.ts
  - src/__tests__/zustand-selectors.test.ts

Safety gates passed: tsc ✓ | lint ✓ | test ✓ | build ✓ | bundle ✓ | smoke ✓
```

This format allows:
- `git log --grep="^cron("` to list all cron commits
- `git log --grep="P0"` to find critical fixes
- Easy identification of what to revert

### 5.4 Branch Strategy

**Recommendation: Push directly to `main`, but with gates.**

Branching + PRs would be safer, but the cron agent has no human reviewer available. The alternative — create a branch, open a PR, auto-merge if CI passes — adds complexity without real value since the "reviewer" would just be the same CI checks.

Instead, the safety comes from:
- Gates 0–7 run **locally before commit** (not in CI after push)
- Gate 9 runs **after deploy** and triggers rollback
- The cron agent never force-pushes
- All cron commits are clearly labeled and trivially revertible

**If you want branch protection anyway** (belt + suspenders):

1. Enable GitHub branch protection on `main` requiring the CI workflow to pass
2. Have the cron agent push to `cron/<timestamp>`, open a PR, and wait for CI
3. Auto-merge if CI passes (use GitHub's auto-merge feature)
4. This adds ~5 min latency per run but gives a PR audit trail

---

## 6. Monitoring & Alerting

### 6.1 Audit Log

Every cron run produces a structured log entry, whether it succeeds or fails.

**Log location:** `.cron/audit/runs.jsonl` (one JSON line per run)

**Schema:**

```jsonc
{
  "runId": "20260704-100000",
  "startedAt": "2026-07-04T10:00:00Z",
  "completedAt": "2026-07-04T10:04:32Z",
  "durationSecs": 272,
  "status": "success",         // "success" | "gate_failure" | "rollback" | "skipped"
  "item": {
    "id": "fix-selector-stability",
    "priority": "P0",
    "description": "Fix selector referential stability in use-live-data"
  },
  "gates": {
    "preflight":   { "passed": true, "durationMs": 120 },
    "typecheck":   { "passed": true, "durationMs": 8500 },
    "lint":        { "passed": true, "durationMs": 4200 },
    "test":        { "passed": true, "durationMs": 12000 },
    "build":       { "passed": true, "durationMs": 45000 },
    "bundle_size": { "passed": true, "durationMs": 200, "sizeKb": 890 },
    "smoke":       { "passed": true, "durationMs": 8000 },
    "selectors":   { "passed": true, "durationMs": 1500 },
    "health":      { "passed": true, "durationMs": 3000 }
  },
  "diff": {
    "filesChanged": 2,
    "insertions": 45,
    "deletions": 12
  },
  "commitSha": "abc1234def5678",
  "bundleSizeKb": 890,
  "errors": []
}
```

**Failure entry example:**
```jsonc
{
  "runId": "20260704-120000",
  "startedAt": "2026-07-04T12:00:00Z",
  "completedAt": "2026-07-04T12:01:15Z",
  "durationSecs": 75,
  "status": "gate_failure",
  "item": {
    "id": "optimize-animations",
    "priority": "P2",
    "description": "Reduce framer-motion bundle"
  },
  "gates": {
    "preflight":   { "passed": true,  "durationMs": 100 },
    "typecheck":   { "passed": true,  "durationMs": 8200 },
    "lint":        { "passed": false, "durationMs": 3800, "error": "3 lint errors in particle-burst.tsx" },
    "test":        null,
    "build":       null,
    "bundle_size": null,
    "smoke":       null,
    "selectors":   null,
    "health":      null
  },
  "diff": null,
  "commitSha": null,
  "bundleSizeKb": null,
  "errors": ["Gate 2 (lint) failed: 3 errors in src/components/particle-burst.tsx"]
}
```

### 6.2 Logging Script

**`.cron/scripts/log-run.sh`:**

```bash
#!/usr/bin/env bash
# Usage: log-run.sh <status> <json-payload>
# Appends a run entry to the audit log

LOG_FILE=".cron/audit/runs.jsonl"
mkdir -p "$(dirname "$LOG_FILE")"

echo "$1" >> "$LOG_FILE"

# Also maintain a latest-run symlink for quick checks
echo "$1" > ".cron/state/last-run.json"
```

### 6.3 Bundle Size Tracking

Maintain a running history so you can spot gradual bloat:

**`.cron/audit/bundle-sizes.log`:**
```
2026-07-04T08:00:00Z commit=abc1234 bundle_kb=875
2026-07-04T10:00:00Z commit=def5678 bundle_kb=890
2026-07-04T12:00:00Z commit=ghi9012 bundle_kb=888
```

**Alert threshold:** If bundle size increases by more than 10% from the previous run, the cron agent must flag it in the audit log and include the increase in the commit message.

```bash
PREV_SIZE=$(tail -1 .cron/audit/bundle-sizes.log 2>/dev/null | grep -oP 'bundle_kb=\K\d+' || echo 0)
CURR_SIZE=$BUNDLE_SIZE_KB

if [ "$PREV_SIZE" -gt 0 ]; then
  INCREASE=$(( (CURR_SIZE - PREV_SIZE) * 100 / PREV_SIZE ))
  if [ "$INCREASE" -gt 10 ]; then
    echo "⚠️  BUNDLE SIZE ALERT: +${INCREASE}% (${PREV_SIZE}KB → ${CURR_SIZE}KB)"
    # Don't fail — but log the warning
  fi
fi
```

### 6.4 Alerting

When something goes wrong, the cron system should notify via available channels. Options in order of preference:

1. **GitHub Actions annotation/summary** — if running in CI, use `::error::` and `::warning::` annotations
2. **Commit message prefix** — a failed run followed by a rollback produces a commit: `revert: cron(20260704-120000) — AUTOMATED ROLLBACK`
3. **File-based alert** — write to `.cron/state/alerts.json` for the next human or cron check to see:

```json
{
  "active_alerts": [
    {
      "severity": "critical",
      "timestamp": "2026-07-04T12:05:00Z",
      "message": "Live site returned 500 after cron deploy. Rolled back to deployment xyz.",
      "runId": "20260704-120000",
      "resolved": false
    }
  ]
}
```

4. **GitHub Issue** (optional) — use the GitHub API to auto-create an issue for critical failures:

```bash
curl -s -X POST \
  -H "Authorization: token ${GITHUB_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  "https://api.github.com/repos/gzxultra/billionaire-cart/issues" \
  -d "{
    \"title\": \"🚨 Cron rollback triggered — $(date -u +%Y-%m-%d %H:%M)\",
    \"body\": \"Automated cron run broke the live site. Rollback completed.\\n\\nRun ID: $RUN_ID\\nCommit: $COMMIT_SHA\\nError: $ERROR_MSG\",
    \"labels\": [\"cron-incident\", \"P0\"]
  }"
```

### 6.5 Dashboard (Lightweight)

For a quick status view, generate a simple Markdown summary from the audit log:

**`.cron/scripts/generate-status.sh`:**

```bash
#!/usr/bin/env bash
# Generates .cron/STATUS.md from recent runs

OUTPUT=".cron/STATUS.md"
LOG=".cron/audit/runs.jsonl"

echo "# Cron Status" > "$OUTPUT"
echo "" >> "$OUTPUT"
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# Last 10 runs
echo "## Recent Runs" >> "$OUTPUT"
echo "" >> "$OUTPUT"
echo "| Run | Status | Item | Duration | Bundle |" >> "$OUTPUT"
echo "|-----|--------|------|----------|--------|" >> "$OUTPUT"

tail -10 "$LOG" | while IFS= read -r line; do
  RUN=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('runId','?'))")
  STATUS=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('status','?'))")
  ITEM=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('item',{}).get('id','—'))")
  DURATION=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\"{d.get('durationSecs',0)}s\")")
  BUNDLE=$(echo "$line" | python3 -c "import json,sys; d=json.load(sys.stdin); b=d.get('bundleSizeKb'); print(f'{b}KB' if b else '—')")
  
  ICON="✅"
  [ "$STATUS" = "gate_failure" ] && ICON="❌"
  [ "$STATUS" = "rollback" ] && ICON="🔄"
  [ "$STATUS" = "skipped" ] && ICON="⏭️"
  
  echo "| $RUN | $ICON $STATUS | $ITEM | $DURATION | $BUNDLE |" >> "$OUTPUT"
done

echo "" >> "$OUTPUT"
echo "---" >> "$OUTPUT"
echo "*Full log: \`.cron/audit/runs.jsonl\`*" >> "$OUTPUT"
```

---

## 7. Implementation Checklist

### Immediate (before enabling the cron)

- [ ] Install Vitest + testing-library: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`
- [ ] Create `vitest.config.ts`
- [ ] Write Zustand selector stability tests (`src/__tests__/zustand-selectors.test.ts`)
- [ ] Write store shape snapshot tests
- [ ] Write API response shape tests
- [ ] Add `/api/health` endpoint
- [ ] Add `"test": "vitest run"` to `package.json` scripts
- [ ] Create `.cron/` directory structure:
  ```
  .cron/
  ├── scripts/
  │   ├── preflight.sh
  │   ├── smoke-test.sh
  │   ├── health-check.sh
  │   ├── cf-rollback.sh
  │   ├── git-revert-cron.sh
  │   ├── auto-rollback.sh
  │   ├── log-run.sh
  │   └── generate-status.sh
  ├── state/
  │   ├── completed-items.json
  │   └── last-run.json
  └── audit/
      ├── runs.jsonl
      └── bundle-sizes.log
  ```
- [ ] Set GitHub secrets: `CF_ACCOUNT_ID`, `CF_API_TOKEN`
- [ ] Update `.gitignore` to include `.cron/state/cron.lock`

### Soon after (first few cron runs)

- [ ] Calibrate bundle size budget based on actual baseline
- [ ] Calibrate smoke test route list (add any new routes)
- [ ] Review and tune scope limits based on real cron output
- [ ] Add more snapshot tests as the codebase grows

### Ongoing

- [ ] Review `.cron/audit/runs.jsonl` weekly
- [ ] Check bundle size trends monthly
- [ ] Update `completed-items.json` when items are manually resolved
- [ ] Prune old audit logs (keep 90 days)

---

## 8. Summary: The Safety Contract

The cron agent agrees to:

1. **Never** modify read-only files (config, CI, dependencies, this doc)
2. **Never** change more than 8 files or 300 lines per commit
3. **Never** push without passing all 8 pre-commit gates
4. **Always** run the full Zustand selector test suite when touching store files
5. **Always** verify the live site after deploy and auto-rollback on failure
6. **Always** use the `cron(<timestamp>)` commit message format
7. **Always** log every run to the audit trail
8. **Always** pull and rebase before starting work
9. **Never** add, remove, or update dependencies
10. **Never** run if a lock file from another run exists (unless stale)

Violations of any of these rules indicate a bug in the cron runner, not a judgment call. They are hard gates, not guidelines.
