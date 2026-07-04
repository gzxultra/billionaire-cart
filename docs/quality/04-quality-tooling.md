# 04 — Performance & Quality Tooling

> Billionaire Cart · Next.js 14 · Cloudflare Pages · GitHub Actions CI
>
> Last updated: 2026-07-04

---

## Table of Contents

1. [ESLint Enhancement](#1-eslint-enhancement)
2. [Bundle Size Monitoring](#2-bundle-size-monitoring)
3. [Format Enforcement](#3-format-enforcement)
4. [Lighthouse CI](#4-lighthouse-ci)
5. [Dependency Security](#5-dependency-security)
6. [Code Complexity Metrics](#6-code-complexity-metrics)
7. [Pre-commit Hooks](#7-pre-commit-hooks)
8. [Complete CI Pipeline](#8-complete-ci-pipeline)

---

## 1. ESLint Enhancement

### Current State

The project uses only `next/core-web-vitals` with two rules disabled. This catches basic React and Next.js mistakes but misses import hygiene, console leaks, TypeScript-specific pitfalls, and Tailwind class ordering.

### Recommended Plugins

| Plugin | Purpose | Why |
|--------|---------|-----|
| `eslint-plugin-import` | Import ordering, no duplicates, no unresolved | Keeps imports clean as cron adds files |
| `eslint-plugin-unused-imports` | Auto-detect unused imports | Cron-generated code frequently leaves dead imports |
| `eslint-plugin-tailwindcss` | Class ordering + no contradicting classes | Catches `px-4 px-8` conflicts, enforces consistent ordering |
| `@typescript-eslint/eslint-plugin` | Stricter TS rules beyond `strict` tsconfig | `no-explicit-any`, `no-floating-promises`, etc. |

### Should we add `eslint-plugin-tailwindcss`?

**Yes.** It provides two high-value rules for an automated-change workflow:

- `tailwindcss/classnames-order` — enforces a canonical class order so diffs are minimal and readable.
- `tailwindcss/no-contradicting-classname` — catches `p-4 p-8` conflicts that a cron agent won't notice.
- `tailwindcss/no-custom-classname` — warns on classes not in the Tailwind config (optional, can be `warn`).

The cost is ~0.5s added to lint time. Worth it.

### Updated `.eslintrc.json`

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "plugin:tailwindcss/recommended"
  ],
  "plugins": [
    "@typescript-eslint",
    "import",
    "unused-imports",
    "tailwindcss"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "rules": {
    "@next/next/no-img-element": "off",
    "@next/next/no-page-custom-font": "off",

    "no-console": ["warn", { "allow": ["warn", "error"] }],

    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
    ],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { "prefer": "type-imports" }
    ],

    "unused-imports/no-unused-imports": "error",

    "import/order": [
      "error",
      {
        "groups": [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling"],
          "index",
          "type"
        ],
        "pathGroups": [
          { "pattern": "@/**", "group": "internal", "position": "before" }
        ],
        "pathGroupsExcludedImportTypes": ["type"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc", "caseInsensitive": true }
      }
    ],
    "import/no-duplicates": "error",

    "tailwindcss/classnames-order": "warn",
    "tailwindcss/no-contradicting-classname": "error",
    "tailwindcss/no-custom-classname": "off"
  },
  "settings": {
    "tailwindcss": {
      "callees": ["cn", "clsx", "cva"],
      "config": "tailwind.config.ts"
    }
  }
}
```

### DevDependencies to Install

```bash
npm install -D \
  @typescript-eslint/parser@^7 \
  @typescript-eslint/eslint-plugin@^7 \
  eslint-plugin-import@^2.31 \
  eslint-plugin-unused-imports@^3 \
  eslint-plugin-tailwindcss@^3.17 \
  --legacy-peer-deps
```

> **Note:** We stay on `@typescript-eslint` v7 because ESLint 8 is in use. v8 of the TS-ESLint packages requires ESLint 9 flat config.

### Key Rule Rationale

| Rule | Level | Why |
|------|-------|-----|
| `no-console` | `warn` | Catch `console.log` left by cron; allow `warn`/`error` for runtime diagnostics |
| `no-floating-promises` | `error` | Prevents fire-and-forget async in event handlers — a common Zustand action bug |
| `consistent-type-imports` | `error` | `import type {}` gets erased at compile time → smaller bundles |
| `unused-imports/no-unused-imports` | `error` | Dead imports accumulate fast under automated changes |
| `import/order` | `error` | Deterministic import blocks → smaller diffs from cron PRs |

---

## 2. Bundle Size Monitoring

### `size-limit` vs `@next/bundle-analyzer` — Which Is Better for CI?

| Criterion | `@next/bundle-analyzer` | `size-limit` |
|-----------|------------------------|--------------|
| **CI gating** | ❌ Visual-only (opens a treemap HTML) | ✅ Exits non-zero when limit exceeded |
| **PR comments** | ❌ Needs custom scripting | ✅ `size-limit-action` posts a table automatically |
| **Next.js awareness** | ✅ Built for Next.js internals | ⚠️ Needs manual path config to `.next` output |
| **Baseline tracking** | ❌ No history | ✅ Compares PR vs base branch |
| **Use case** | Manual investigation | Automated regression gate |

**Recommendation:** Use **both**.

- `@next/bundle-analyzer` for manual investigation when a regression is flagged.
- A **custom script** that parses Next.js build output for CI gating — simpler and more reliable than `size-limit` for Next.js apps because Next.js already prints per-route bundle sizes.

### Approach: Parse Next.js Build Output

Next.js prints a table like this during `next build`:

```
Route (app)                    Size     First load JS
┌ ○ /                          5.2 kB         87.3 kB
├ ○ /cart                      3.1 kB         85.2 kB
...
+ First Load JS shared by all  82.1 kB
```

We capture this with a script that fails CI if any route exceeds a threshold.

### `scripts/check-bundle-size.sh`

```bash
#!/usr/bin/env bash
# Fail if any Next.js route's first-load JS exceeds the budget.
# Usage: MAX_FIRST_LOAD_KB=200 ./scripts/check-bundle-size.sh

set -euo pipefail

MAX_KB="${MAX_FIRST_LOAD_KB:-200}"
BUILD_OUTPUT=".next/build-manifest.json"

echo "📦 Bundle size budget: ${MAX_KB} kB per route"
echo ""

# Next.js prints sizes to stdout during build. We parse the saved output.
# Alternative: use the .next/build-manifest.json + .next/server/pages-manifest.json
# For simplicity, we re-run a size check from the build trace.

FAILED=0

# Parse the Next.js output stored from the build step
if [ -f ".next/trace" ]; then
  echo "Using .next/trace for analysis..."
fi

# Simpler approach: use next build output captured to a file
BUILD_LOG="${1:-.next-build-output.txt}"

if [ ! -f "$BUILD_LOG" ]; then
  echo "⚠️  No build log found at $BUILD_LOG"
  echo "   Run: npm run build 2>&1 | tee .next-build-output.txt"
  exit 1
fi

echo "Route sizes from build:"
echo "────────────────────────────────────────"

# Extract lines with kB sizes (route lines from the Next.js output table)
grep -E '^\s*[├┌└○●ƒλ].*kB' "$BUILD_LOG" | while IFS= read -r line; do
  # Extract the last kB value on the line (first-load JS)
  size=$(echo "$line" | grep -oP '[\d.]+\s*kB' | tail -1 | grep -oP '[\d.]+')
  route=$(echo "$line" | sed 's/^[[:space:]├┌└○●ƒλ│─]*//' | awk '{print $1}')

  if [ -n "$size" ]; then
    # Compare as integers (bash doesn't do float comparison well)
    size_int=$(echo "$size" | cut -d. -f1)
    if [ "$size_int" -gt "$MAX_KB" ]; then
      echo "❌ $route → ${size} kB (exceeds ${MAX_KB} kB)"
      FAILED=1
    else
      echo "✅ $route → ${size} kB"
    fi
  fi
done

echo "────────────────────────────────────────"

# Also check shared JS
shared=$(grep -oP 'First Load JS shared by all\s+[\d.]+\s*kB' "$BUILD_LOG" | grep -oP '[\d.]+' || echo "0")
echo "📎 Shared JS: ${shared} kB"

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "💥 Bundle size budget exceeded. Investigate with:"
  echo "   ANALYZE=true npm run build"
  exit 1
fi

echo ""
echo "✅ All routes within ${MAX_KB} kB budget"
```

### `@next/bundle-analyzer` Setup (for Manual Investigation)

**Install:**

```bash
npm install -D @next/bundle-analyzer --legacy-peer-deps
```

**`next.config.mjs` (add at top):**

```js
import withBundleAnalyzer from "@next/bundle-analyzer";

const withAnalyze = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

// Wrap your existing config export:
export default withAnalyze(nextConfig);
```

**`package.json` script:**

```json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  }
}
```

### CI Step

```yaml
- name: Build (capture output)
  run: npm run build 2>&1 | tee .next-build-output.txt

- name: Check bundle sizes
  run: |
    chmod +x scripts/check-bundle-size.sh
    MAX_FIRST_LOAD_KB=200 ./scripts/check-bundle-size.sh .next-build-output.txt
```

### Establishing a Baseline

After the first CI run, note the largest route's first-load JS. Set `MAX_FIRST_LOAD_KB` to **~20% above** that value to allow organic growth while catching blowups. For a typical Next.js 14 app with Framer Motion + Zustand, expect 80–120 kB shared + 3–15 kB per route, so a 200 kB per-route ceiling is a good starting point.

---

## 3. Format Enforcement

### Is the Current Prettier Config Sufficient?

The current config is fine for general formatting:

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

**Two additions recommended:**

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

| Addition | Why |
|----------|-----|
| `printWidth: 100` | Default 80 causes excessive wrapping in JSX-heavy files; 100 is a better sweet spot |
| `prettier-plugin-tailwindcss` | Sorts Tailwind classes at format time, consistent with `eslint-plugin-tailwindcss` |

**Install:**

```bash
npm install -D prettier-plugin-tailwindcss --legacy-peer-deps
```

### `.prettierignore`

```
.next
node_modules
dist
coverage
.vercel
.wrangler
*.min.js
```

### CI Step: Check, Don't Fix

```yaml
- name: Check formatting
  run: npx prettier --check "src/**/*.{ts,tsx,css,json}" "*.{js,mjs,json,md}"
```

Key: `--check` exits non-zero if any file would change, but doesn't modify anything. This means:

- PRs from cron that have format drift get caught immediately.
- No surprise auto-fix commits polluting git history.

### Preventing Cron Format Noise

The cron that makes automated changes should run `npx prettier --write` on any files it touches **before** committing. This keeps the CI check clean. If the cron can't do that, the CI `--check` step will at least flag the problem immediately rather than letting format drift accumulate.

---

## 4. Lighthouse CI

### Is Lighthouse CI Feasible for Cloudflare Pages?

**Yes, with the right approach.** There are two strategies:

| Strategy | How | Pros | Cons |
|----------|-----|------|------|
| **Audit the live preview URL** | Deploy to Cloudflare Pages preview, then run Lighthouse against the preview URL | Tests real edge runtime, real CDN | Requires deploy before audit; slower CI |
| **Audit a local build** | `next start` locally in CI, audit localhost | Fast; no deploy needed | Doesn't test edge runtime behavior |

**Recommendation:** Audit the **live preview URL** for merge-to-main checks. Cloudflare Pages creates a preview deployment for every commit — use that URL.

For a lighter approach: audit locally against `next start`. The edge runtime differences (Cloudflare Workers vs Node.js) don't affect Lighthouse scores (which measure client-side performance).

### Lighthouse CI Config: `lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "startServerCommand": "npm run start",
      "startServerReadyPattern": "Ready in",
      "numberOfRuns": 3,
      "settings": {
        "preset": "desktop",
        "throttling": {
          "cpuSlowdownMultiplier": 2
        }
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.85 }],
        "categories:accessibility": ["error", { "minScore": 0.90 }],
        "categories:best-practices": ["error", { "minScore": 0.90 }],
        "categories:seo": ["warn", { "minScore": 0.80 }],
        "first-contentful-paint": ["warn", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["warn", { "maxNumericValue": 3000 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["warn", { "maxNumericValue": 300 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

### Budget Thresholds Rationale

| Metric | Threshold | Why |
|--------|-----------|-----|
| Performance ≥ 0.85 | `error` | Luxury e-commerce must feel fast; Framer Motion animations add weight |
| Accessibility ≥ 0.90 | `error` | Non-negotiable baseline; catches missing alt text, contrast issues |
| Best Practices ≥ 0.90 | `error` | Catches HTTPS issues, deprecated APIs, console errors |
| SEO ≥ 0.80 | `warn` | App is not SEO-critical (cart/product pages), but don't regress |
| LCP ≤ 3000ms | `warn` | Image-heavy product pages need room; flag but don't block |
| CLS ≤ 0.1 | `error` | Layout shifts during animation are a real risk with Framer Motion |

### Install

```bash
npm install -D @lhci/cli --legacy-peer-deps
```

### CI Step

```yaml
- name: Lighthouse CI
  run: npx lhci autorun --config=lighthouserc.json
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### Lighter Alternative (If Lighthouse CI Is Too Heavy)

If full LHCI is too slow (~3 min with 3 runs), use the **`treosh/lighthouse-ci-action`** GitHub Action which wraps it more efficiently:

```yaml
- name: Lighthouse
  uses: treosh/lighthouse-ci-action@v12
  with:
    configPath: ./lighthouserc.json
    uploadArtifacts: true
```

Or for even lighter: just track **web-vitals** client-side via `next/web-vitals` and log to analytics. This doesn't gate CI but monitors real-user performance.

---

## 5. Dependency Security

### npm Audit in CI

```yaml
- name: Security audit
  run: npm audit --audit-level=high --omit=dev
  continue-on-error: false
```

**Why `--audit-level=high`:** Low/moderate vulns in dev dependencies are noise. High+ in production dependencies are actionable. `--omit=dev` scopes to production deps only.

**Why not `--audit-level=critical`:** The project runs `--legacy-peer-deps`, which means the dependency tree is already permissive. Catching `high` severity is the right floor.

### Lock File Verification

```yaml
- name: Verify lock file
  run: |
    # Ensure package-lock.json is in sync with package.json
    npm ci --legacy-peer-deps
    # If npm ci succeeds, the lock file is valid.
    # Check for unexpected changes:
    git diff --exit-code package-lock.json || {
      echo "❌ package-lock.json is out of sync with package.json"
      echo "   Run 'npm install --legacy-peer-deps' locally and commit the lock file."
      exit 1
    }
```

### Dependabot Configuration

**`.github/dependabot.yml`:**

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
      timezone: "America/Los_Angeles"
    open-pull-requests-limit: 5
    reviewers:
      - "ernie-gu"  # adjust to actual GitHub username
    labels:
      - "dependencies"
      - "automated"
    ignore:
      # Don't auto-update major versions of core framework
      - dependency-name: "next"
        update-types: ["version-update:semver-major"]
      - dependency-name: "react"
        update-types: ["version-update:semver-major"]
      - dependency-name: "react-dom"
        update-types: ["version-update:semver-major"]
    groups:
      # Group minor/patch updates to reduce PR noise
      dev-dependencies:
        dependency-type: "development"
        update-types:
          - "minor"
          - "patch"
      production-dependencies:
        dependency-type: "production"
        update-types:
          - "patch"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "ci"
      - "automated"
```

### Why Dependabot Over Renovate?

For this project, Dependabot is simpler:

- Native GitHub integration, zero config beyond the YAML.
- The project has few dependencies (~10 production, ~6 dev).
- Renovate's power (monorepo support, custom managers) is overkill here.
- Dependabot security alerts are free and automatic.

---

## 6. Code Complexity Metrics

### Strategy

Use ESLint's built-in `complexity` rule plus a few custom limits. No need for a separate tool — ESLint already runs in CI, so adding complexity rules is zero-cost.

### ESLint Rules to Add

Add these to the `rules` section of `.eslintrc.json`:

```json
{
  "complexity": ["warn", { "max": 15 }],
  "max-depth": ["warn", { "max": 4 }],
  "max-lines-per-function": [
    "warn",
    { "max": 80, "skipBlankLines": true, "skipComments": true }
  ],
  "max-params": ["warn", { "max": 4 }]
}
```

### Rule Rationale

| Rule | Limit | Level | Why |
|------|-------|-------|-----|
| `complexity` | 15 | `warn` | Cyclomatic complexity > 15 is hard to test and review. Cron-generated code can create deeply nested conditionals. |
| `max-depth` | 4 | `warn` | Nesting > 4 levels signals need for extraction. |
| `max-lines-per-function` | 80 | `warn` | Long functions are a code smell; React components especially should be decomposed. |
| `max-params` | 4 | `warn` | > 4 params suggests the function needs an options object. |

**Why `warn` not `error`:** Complexity rules are guardrails, not gates. A cron-generated component might legitimately need a complex render function. `warn` flags it for human review without blocking the build. If a pattern persists, escalate specific rules to `error`.

### Optional: File-Level Metrics with `eslint-plugin-max-lines`

For tracking file size:

```json
{
  "max-lines": ["warn", { "max": 300, "skipBlankLines": true, "skipComments": true }]
}
```

This catches the "god component" anti-pattern where a cron keeps adding features to a single file.

---

## 7. Pre-commit Hooks

### Husky + lint-staged Setup

**Install:**

```bash
npm install -D husky lint-staged --legacy-peer-deps
npx husky init
```

**`.husky/pre-commit`:**

```bash
npx lint-staged
```

**`package.json` (add top-level key):**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings=0",
      "prettier --write"
    ],
    "*.{css,json,md}": [
      "prettier --write"
    ]
  }
}
```

### Is This Relevant When Changes Come from a Cron Agent?

**Tradeoff analysis:**

| Factor | Human developers | Cron agent |
|--------|-----------------|------------|
| Pre-commit hooks run? | ✅ Yes (local git) | ❌ No — the cron uses `git commit` programmatically, likely with `--no-verify` or in a CI-like environment |
| Who benefits? | Catches issues before push | Doesn't run |
| Alternative gate? | N/A | CI pipeline catches everything |

**Verdict:** Install Husky for human developers, but **don't rely on it for the cron**. The cron's quality gate is the CI pipeline. The two-layer approach works well:

1. **Husky** catches issues at commit time for humans (fast feedback).
2. **CI** catches everything for cron-generated commits (authoritative gate).

If the cron can be configured to run `npx lint-staged` on its changed files before committing, that's ideal but not required. CI is the real gate.

### Cron-Specific Recommendation

Add a step to the cron's workflow:

```bash
# Before committing, format and lint changed files
FILES=$(git diff --name-only --cached --diff-filter=ACMR)
echo "$FILES" | xargs npx prettier --write
echo "$FILES" | grep -E '\.(ts|tsx)$' | xargs npx eslint --fix --max-warnings=0
git add $FILES
```

---

## 8. Complete CI Pipeline

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: write  # For bundle size PR comments (if using size-limit-action)

jobs:
  quality:
    name: Quality checks
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      # ── Setup ──────────────────────────────────────────────
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      # ── Formatting ─────────────────────────────────────────
      - name: Check formatting
        run: npx prettier --check "src/**/*.{ts,tsx,css,json}" "*.{js,mjs,json,md}"

      # ── Linting ────────────────────────────────────────────
      - name: Lint
        run: npx eslint "src/**/*.{ts,tsx}" --max-warnings=0

      # ── Type checking ──────────────────────────────────────
      - name: Type check
        run: npx tsc --noEmit

      # ── Build ──────────────────────────────────────────────
      - name: Build
        run: npm run build 2>&1 | tee .next-build-output.txt

      # ── Bundle size check ──────────────────────────────────
      - name: Check bundle sizes
        run: |
          chmod +x scripts/check-bundle-size.sh
          MAX_FIRST_LOAD_KB=200 ./scripts/check-bundle-size.sh .next-build-output.txt

      # ── Security audit ─────────────────────────────────────
      - name: Security audit
        run: npm audit --audit-level=high --omit=dev
        continue-on-error: true  # Don't block deploys for upstream vulns

      # ── Lock file integrity ────────────────────────────────
      - name: Verify lock file
        run: |
          git diff --exit-code package-lock.json || {
            echo "❌ package-lock.json changed after npm ci"
            echo "   Run 'npm install --legacy-peer-deps' locally and commit the lock file."
            exit 1
          }

  lighthouse:
    name: Lighthouse audit
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: quality  # Only run if quality checks pass
    if: github.event_name == 'pull_request'  # Skip on push to main (deploy handles it)

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "npm"

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Build
        run: npm run build

      - name: Lighthouse CI
        uses: treosh/lighthouse-ci-action@v12
        with:
          configPath: ./lighthouserc.json
          uploadArtifacts: true
```

### Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    quality (every push + PR)                 │
│                                                             │
│  Checkout → Install → Format check → Lint → Type check     │
│     → Build → Bundle size check → Security audit            │
│     → Lock file verify                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │ (passes)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  lighthouse (PRs only)                       │
│                                                             │
│  Checkout → Install → Build → LHCI autorun                  │
│     → Upload artifacts                                      │
└─────────────────────────────────────────────────────────────┘
```

### CI Timing Estimate

| Step | Estimated Time |
|------|---------------|
| Install (cached) | ~15s |
| Format check | ~3s |
| Lint | ~10s |
| Type check | ~8s |
| Build | ~45s |
| Bundle size check | ~2s |
| Security audit | ~5s |
| Lock file verify | ~1s |
| **Total (quality)** | **~90s** |
| Lighthouse (3 runs) | ~120s |
| **Total (with LH)** | **~3.5 min** |

### What Gets Gated (Will Block Merge)

| Check | Blocks? | Rationale |
|-------|---------|-----------|
| Prettier `--check` | ✅ Yes | Format consistency is non-negotiable |
| ESLint `--max-warnings=0` | ✅ Yes | No warning accumulation |
| `tsc --noEmit` | ✅ Yes | Type errors are bugs |
| Build | ✅ Yes | If it doesn't build, it doesn't ship |
| Bundle size | ✅ Yes | Catches accidental 500 kB imports |
| npm audit | ⚠️ Soft | `continue-on-error: true` — don't block on upstream vulns |
| Lock file | ✅ Yes | Prevents "works on my machine" |
| Lighthouse | ⚠️ Soft | Runs only on PRs; performance is advisory until baselines stabilize |

---

## Summary: What to Install

```bash
# Linting
npm install -D \
  @typescript-eslint/parser@^7 \
  @typescript-eslint/eslint-plugin@^7 \
  eslint-plugin-import@^2.31 \
  eslint-plugin-unused-imports@^3 \
  eslint-plugin-tailwindcss@^3.17 \
  --legacy-peer-deps

# Formatting
npm install -D prettier-plugin-tailwindcss --legacy-peer-deps

# Bundle analysis (manual)
npm install -D @next/bundle-analyzer --legacy-peer-deps

# Lighthouse
npm install -D @lhci/cli --legacy-peer-deps

# Pre-commit hooks
npm install -D husky lint-staged --legacy-peer-deps
npx husky init
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `.eslintrc.json` | Replace with updated config above |
| `.prettierrc` | Add `printWidth` and `plugins` |
| `.prettierignore` | Create |
| `lighthouserc.json` | Create |
| `.github/dependabot.yml` | Create |
| `.github/workflows/ci.yml` | Replace with complete pipeline |
| `scripts/check-bundle-size.sh` | Create |
| `.husky/pre-commit` | Create (via `npx husky init`) |
| `package.json` | Add `lint-staged` config + `analyze` script |
| `next.config.mjs` | Wrap with `withBundleAnalyzer` |
