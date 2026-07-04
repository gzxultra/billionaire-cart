# Expert 5 — Documentation & Change Tracking

> Audit date: 2026-07-04 | Billionaire Cart quality review

---

## Table of Contents

1. [CHANGELOG Automation](#1-changelog-automation)
2. [Cron Audit Log Format](#2-cron-audit-log-format)
3. [README Template](#3-readme-template)
4. [Priority Tracking](#4-priority-tracking)
5. [Health Dashboard](#5-health-dashboard)
6. [Architecture Decision Records](#6-architecture-decision-records)

---

## 1. CHANGELOG Automation

### Problem

With ~12 automated commits per day, the commit history becomes unreadable fast. A machine-generated CHANGELOG gives humans (and the cron agent itself) a clear view of what shipped and when.

### Commit Message Convention

All cron commits **must** use [Conventional Commits](https://www.conventionalcommits.org/) with these exact prefixes:

| Prefix | When to use | Bumps |
|---|---|---|
| `fix:` | Bug fix, crash fix, data correction | PATCH |
| `feat:` | New feature, new parser, new UI component | MINOR |
| `refactor:` | Code restructure, no behavior change | — |
| `perf:` | Performance improvement (bundle size, render, API) | PATCH |
| `test:` | Adding or fixing tests | — |
| `docs:` | Documentation only | — |
| `style:` | CSS/visual/formatting, no logic change | — |
| `chore:` | Deps, config, CI, build tooling | — |

**Scope is required for cron commits.** Format: `prefix(scope): description`

```
fix(parser): handle Walmart redirect URLs correctly
feat(checkout): add animated card flip on purchase
perf(bundle): tree-shake unused Framer Motion features
style(ui): lift surfaces, warm accents, boost contrast
```

**Breaking changes** append `!` before the colon: `feat(api)!: restructure /api/parse response shape`

### Tool Recommendation: `release-please`

For this project, **release-please** is the right choice. Here's why:

| Tool | Verdict | Reason |
|---|---|---|
| `standard-version` | ❌ | Deprecated, recommends alternatives |
| `changesets` | ❌ | Designed for monorepos with manual changeset files — bad fit for automated commits |
| **`release-please`** | ✅ | GitHub-native, reads conventional commits, auto-opens release PRs, zero manual steps |

### Setup Steps

**Step 1 — Install the GitHub Action**

Create `.github/workflows/release-please.yml`:

```yaml
name: Release Please

on:
  push:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          release-type: node
          token: ${{ secrets.GITHUB_TOKEN }}
```

**Step 2 — Add config**

Create `release-please-config.json` at repo root:

```json
{
  "packages": {
    ".": {
      "release-type": "node",
      "changelog-sections": [
        { "type": "feat", "section": "✨ Features" },
        { "type": "fix", "section": "🐛 Bug Fixes" },
        { "type": "perf", "section": "⚡ Performance" },
        { "type": "refactor", "section": "♻️ Refactors" },
        { "type": "style", "section": "🎨 Visual" },
        { "type": "test", "section": "✅ Tests" },
        { "type": "docs", "section": "📝 Docs" },
        { "type": "chore", "section": "🔧 Chores", "hidden": true }
      ]
    }
  }
}
```

Create `.release-please-manifest.json`:

```json
{
  ".": "0.1.0"
}
```

**Step 3 — Validate cron commit messages**

Add a pre-commit or CI check that rejects non-conventional commit messages from the cron agent:

```bash
#!/bin/bash
# .github/scripts/lint-commit.sh
MSG=$(head -1 "$1")
PATTERN='^(fix|feat|refactor|perf|test|docs|style|chore)(\(.+\))?(!)?: .{3,}'
if ! echo "$MSG" | grep -qE "$PATTERN"; then
  echo "❌ Commit message does not follow Conventional Commits:"
  echo "   $MSG"
  echo "   Expected: type(scope): description"
  exit 1
fi
```

### Current Commit Compliance

Reviewing the existing history:

| Commit | Conventional? | Fix |
|---|---|---|
| `ui: lift surfaces, warm accents...` | ❌ missing type | `style(ui): lift surfaces...` |
| `Fix React #185 — cached mergedBillionaires...` | ❌ wrong format | `fix(react): cache mergedBillionaires, add error boundaries` |
| `Disable D1 binding for initial deploy` | ❌ no type | `chore(deploy): disable D1 binding for initial deploy` |
| `Walmart/BestBuy/Etsy parsers...` | ❌ no type | `feat(parser): add Walmart/BestBuy/Etsy parsers, retry logic, OmniBox i18n` |

**Action: retroactive compliance isn't worth rewriting history, but all future commits must conform.**

---

## 2. Cron Audit Log Format

### Storage Decision

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Git commit body | Zero extra files, lives with the code | Hard to aggregate, no summary view | Use for per-commit detail |
| Separate log file | Easy to parse, single history | Merge conflicts, grows forever | ❌ |
| GitHub Issue | Searchable, commentable, labels | Noisy, hard to automate queries | ❌ |
| **`docs/cron-log.jsonl`** | Append-only, machine-readable, diffable | One more file in repo | ✅ Primary store |

**Use both:** structured data in `docs/cron-log.jsonl` (one JSON object per line, append-only), and a human summary in the git commit body.

### Audit Log Schema

Each cron run appends one line to `docs/cron-log.jsonl`:

```jsonc
{
  "run_id": "cron-2026-07-04T18:00:00Z",
  "timestamp": "2026-07-04T18:00:00Z",
  "priority": "P1",
  "commit_sha": "abc1234",
  "commit_message": "feat(parser): add Target.com parser",
  "summary": "Added Target.com product URL parsing with price, title, and image extraction",
  "files_changed": 4,
  "lines_added": 127,
  "lines_removed": 12,
  "tests": {
    "total": 48,
    "passed": 48,
    "failed": 0,
    "skipped": 0,
    "coverage_pct": 62.3
  },
  "build": {
    "success": true,
    "duration_ms": 18400,
    "bundle_size_kb": 412,
    "bundle_delta_kb": -3
  },
  "deploy": {
    "success": true,
    "url": "https://billionaire-cart.pages.dev"
  },
  "issues_fixed": [],
  "issues_created": [],
  "tags": ["parser", "e-commerce"]
}
```

### Git Commit Body Template

The cron agent should use this structure in the commit body (after the one-line subject):

```
feat(parser): add Target.com parser

Cron run: 2026-07-04T18:00Z | Priority: P1

Changes:
- Added Target.com URL detection and price extraction
- Updated parser registry with target.com domain
- Added 3 test cases for Target product URLs

Stats: 4 files | +127 -12 | tests 48/48 ✅ | bundle 412kb (-3kb)
```

### Cron Agent Logging Script

The cron agent should call this after each successful commit:

```bash
#!/bin/bash
# scripts/log-cron-run.sh
# Usage: ./scripts/log-cron-run.sh <priority> <summary>

PRIORITY="${1:-P2}"
SUMMARY="${2:-No summary provided}"
SHA=$(git rev-parse --short HEAD)
MSG=$(git log -1 --pretty=%s)
STATS=$(git diff --shortstat HEAD~1)
FILES=$(echo "$STATS" | grep -oP '\d+ file' | grep -oP '\d+')
ADDED=$(echo "$STATS" | grep -oP '\d+ insertion' | grep -oP '\d+')
REMOVED=$(echo "$STATS" | grep -oP '\d+ deletion' | grep -oP '\d+')

echo "{\"run_id\":\"cron-$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"priority\":\"$PRIORITY\",\"commit_sha\":\"$SHA\",\"commit_message\":\"$MSG\",\"summary\":\"$SUMMARY\",\"files_changed\":${FILES:-0},\"lines_added\":${ADDED:-0},\"lines_removed\":${REMOVED:-0}}" >> docs/cron-log.jsonl
```

---

## 3. README Template

The following should replace the current `README.md`:

````markdown
# 💳 Billionaire Cart

> Spend a billionaire's fortune. Add real products by URL — from Amazon, eBay, Walmart, and 7 more stores — and watch their net worth evaporate in real time.

**[▶ Live Demo](https://billionaire-cart.pages.dev)** · [Report Bug](https://github.com/gzxultra/billionaire-cart/issues) · [Request Feature](https://github.com/gzxultra/billionaire-cart/issues)

![Next.js](https://img.shields.io/badge/Next.js_14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwindcss&logoColor=white)
![Cloudflare Pages](https://img.shields.io/badge/Cloudflare_Pages-F38020?logo=cloudflare&logoColor=white)

---

## Features

- **12 Billionaires** with real-time Forbes net worth data (5-min cache)
- **Omni-Box URL Parsing** — paste any product URL, get price + image + title
- **10 E-Commerce Platforms** — Amazon, eBay, Walmart, Target, Best Buy, Etsy, Costco, Newegg, B&H, ASOS
- **6-Layer Parse Engine** — Open Graph → JSON-LD → meta tags → microdata → DOM → regex fallback
- **Black Card Checkout** with animated card flip
- **Earn-Back Speedometer** — see how fast the billionaire earns the money back
- **47 Catalog Items** across 5 price tiers
- **17 Toast Types**, **10 Easter Eggs**, speedrun mode, combo streaks
- **i18n** — English + Chinese (200+ translation keys)
- **Film Grain & Atmosphere Canvas** — cinematic visual layer
- **Exchange Rates** — live rates with 1-hour cache
- **Product History** — persistent via Cloudflare D1

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| State | Zustand v5 |
| Deploy | Cloudflare Pages |
| Database | Cloudflare D1 (SQLite) |
| Data | Forbes RTB API, exchange rate API |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Development

```bash
git clone https://github.com/gzxultra/billionaire-cart.git
cd billionaire-cart
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

### Deploy

Deployed automatically to Cloudflare Pages on push to `main`.

```bash
# Manual deploy
npx wrangler pages deploy .next --project-name=billionaire-cart
```

## Architecture

```
src/
├── app/              # Next.js App Router pages + API routes
│   ├── api/
│   │   ├── parse/        # Product URL parsing endpoint
│   │   ├── billionaires/ # Forbes data proxy
│   │   ├── rates/        # Exchange rate proxy
│   │   ├── image-proxy/  # CORS image proxy
│   │   └── products/     # D1 product persistence
│   └── page.tsx          # Main shopping experience
├── components/       # React components
├── store/            # Zustand state management
├── lib/              # Parsers, utils, i18n
│   ├── parsers/          # Per-site product parsers
│   └── i18n/             # zh/en translation files
└── styles/           # Tailwind + global styles
```

## API Routes

| Endpoint | Method | Description |
|---|---|---|
| `/api/parse` | POST | Parse a product URL → price, title, image |
| `/api/billionaires` | GET | Forbes billionaire data (cached 5 min) |
| `/api/rates` | GET | Exchange rates (cached 1 hr) |
| `/api/image-proxy` | GET | Proxy external images to avoid CORS |
| `/api/products` | GET/POST | Product history (D1) |

## Automated Iteration

This project uses a **cron-driven improvement loop** that runs every 2 hours:

1. A scheduled agent reviews the codebase against a priority queue
2. It picks the highest-priority actionable item (P0 → P1 → P2)
3. Makes the change, runs tests, verifies the build
4. Commits with a conventional commit message and deploys
5. Logs the run to `docs/cron-log.jsonl`

This means **~12 automated improvements per day**. All changes are traceable through git history and the cron audit log.

### Priority Levels

- **P0** — Bugs, crashes, broken deploys (fix immediately)
- **P1** — Missing features, performance issues (implement next)
- **P2** — Polish, UX tweaks, code cleanup (when P0/P1 are clear)

See [`docs/PRIORITIES.md`](docs/PRIORITIES.md) for the current queue.

## Contributing (for the Cron Agent)

1. Always use Conventional Commits: `type(scope): description`
2. Run `npm run build` before committing — broken builds are P0
3. Keep commits atomic — one logical change per commit
4. Update `docs/cron-log.jsonl` after each run
5. If a change is architectural, create an ADR in `docs/adr/`
6. Never skip tests; if you can't test it, note that in the commit body

## License

MIT
````

---

## 4. Priority Tracking

### Location: `docs/PRIORITIES.md`

Reasons to use `PRIORITIES.md` over `ROADMAP.md`:
- The cron agent needs a **machine-parseable task queue**, not a vision doc
- `PRIORITIES.md` signals "pick the next thing" — exactly what the cron does
- A roadmap implies timelines and milestones that don't apply to continuous iteration

### Format Specification

Use a checkbox-based format that's both human-readable and machine-parseable:

```markdown
# Priorities

> Updated: 2026-07-04T18:00Z
> Last completed: feat(parser): add Target.com parser

## P0 — Critical (bugs, crashes, broken deploys)

- [ ] `fix(deploy)` D1 binding fails on cold start — #12
- [x] `fix(react)` React #185 — cached mergedBillionaires — 8cde7c4
- [x] `fix(deploy)` Disable D1 for initial deploy — 85189f1

## P1 — Features & Performance

- [ ] `feat(parser)` Add Target.com parser
- [ ] `feat(a11y)` Keyboard navigation for cart items
- [ ] `perf(bundle)` Tree-shake Framer Motion (currently 78kb)
- [ ] `feat(test)` Unit tests for all 10 parsers
- [x] `feat(parser)` Walmart/BestBuy/Etsy parsers — df44e53
- [x] `feat(db)` D1 product persistence — 59462e2

## P2 — Polish & Cleanup

- [ ] `style(ui)` Dark mode toggle
- [ ] `refactor(store)` Split monolithic Zustand store
- [ ] `docs(readme)` Write comprehensive README
- [ ] `perf(img)` Lazy-load product images below fold
- [x] `style(ui)` Lift surfaces, warm accents, contrast — 6c471e5
```

### Machine-Parsing Rules

The cron agent parses this file with these rules:

1. **Scan top-down.** First unchecked `- [ ]` item in the highest priority section wins.
2. **Format:** `- [ ] \`type(scope)\` description` — optional `— #issue` or `— sha` suffix
3. **Completed:** `- [x] \`type(scope)\` description — <commit_sha>`
4. **The cron agent marks items `[x]` and appends the commit SHA after completing them.**
5. **Only humans add new items.** The cron agent consumes the queue; it doesn't grow it (unless it discovers a P0 bug during its work).

### Parsing Script

```bash
#!/bin/bash
# scripts/next-priority.sh — returns the next item for the cron agent
grep -m1 '^\- \[ \]' docs/PRIORITIES.md | sed 's/- \[ \] //'
```

---

## 5. Health Dashboard

### Approach: `STATUS.md` + CI Auto-Update

A full dashboard app is overkill. A `STATUS.md` at the repo root, auto-updated by CI, gives the snapshot view.

### `STATUS.md` Template

```markdown
# Project Status

> Auto-updated by CI on each push to `main`

| Metric | Value | Trend |
|---|---|---|
| **Build** | ✅ Passing | — |
| **Tests** | 48/48 passing | +3 since last |
| **Coverage** | 62.3% | ▲ +1.2% |
| **Bundle Size** | 412 KB | ▼ -3 KB |
| **Build Time** | 18.4s | — |
| **Last Deploy** | 2026-07-04T18:00Z | ✅ |
| **Cron Runs (24h)** | 11 | 11 ✅ 0 ❌ |
| **Open P0s** | 1 | ⚠️ |

### Last 5 Commits

| SHA | Message | Priority | Status |
|---|---|---|---|
| `abc1234` | feat(parser): add Target.com parser | P1 | ✅ |
| `6c471e5` | style(ui): lift surfaces, warm accents | P2 | ✅ |
| `8cde7c4` | fix(react): cache mergedBillionaires | P0 | ✅ |
| `85189f1` | chore(deploy): disable D1 binding | P0 | ✅ |
| `df44e53` | feat(parser): Walmart/BestBuy/Etsy | P1 | ✅ |
```

### CI Auto-Update Workflow

```yaml
# .github/workflows/update-status.yml
name: Update STATUS.md

on:
  push:
    branches: [main]

jobs:
  status:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 10

      - uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Build & collect metrics
        run: |
          npm ci
          npm run build 2>&1 | tee /tmp/build.log
          npm test -- --coverage 2>&1 | tee /tmp/test.log || true

      - name: Generate STATUS.md
        run: node scripts/generate-status.js

      - name: Commit STATUS.md
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add STATUS.md
          git diff --cached --quiet || git commit -m "docs(status): auto-update STATUS.md [skip ci]"
          git push
```

**Important:** The `[skip ci]` in the commit message prevents infinite CI loops.

### GitHub Badges

Add to the README header:

```markdown
![Build](https://img.shields.io/github/actions/workflow/status/gzxultra/billionaire-cart/ci.yml?label=build)
![Tests](https://img.shields.io/badge/tests-48%2F48-brightgreen)
![Bundle](https://img.shields.io/badge/bundle-412kb-blue)
```

The first badge is live from GitHub Actions. The other two can be generated as dynamic badges via `shields.io/endpoint` pointed at a JSON file in the repo, updated by CI:

```bash
# scripts/badges.sh — generates badge endpoint JSON
echo '{"schemaVersion":1,"label":"tests","message":"48/48","color":"brightgreen"}' > docs/badges/tests.json
echo '{"schemaVersion":1,"label":"bundle","message":"412kb","color":"blue"}' > docs/badges/bundle.json
```

---

## 6. Architecture Decision Records (ADRs)

### Should This Project Use ADRs?

**Yes, but lightweight.** With automated commits, the "why" behind architectural decisions gets lost. ADRs preserve the reasoning. But given the project's size and velocity, keep them short.

**When to write an ADR:**
- Switching a core dependency (e.g., Zustand → Jotai)
- Changing the data model or API contract
- Adding a new infrastructure component (e.g., D1 database, KV store)
- Changing the deployment target or build pipeline
- Any `feat!:` or `refactor!:` (breaking change)

**When NOT to write an ADR:**
- Adding a new parser (routine feature)
- CSS/visual changes
- Test additions
- Bug fixes

### Location

```
docs/adr/
├── 0001-use-zustand-for-state.md
├── 0002-cloudflare-d1-for-persistence.md
├── 0003-six-layer-parse-engine.md
└── TEMPLATE.md
```

### ADR Template (`docs/adr/TEMPLATE.md`)

```markdown
# ADR-NNNN: Title

**Date:** YYYY-MM-DD
**Status:** proposed | accepted | deprecated | superseded by ADR-NNNN
**Priority:** P0 | P1 | P2
**Commit:** (SHA, filled after implementation)

## Context

What is the problem or situation? 2-3 sentences max.

## Decision

What are we doing about it? Be specific.

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| Chosen approach | ... | ... |
| Alternative A | ... | ... |

## Consequences

What changes as a result? What trade-offs are we accepting?
```

### Cron Agent ADR Rules

1. **If your commit message contains `!` (breaking change), you must create an ADR.**
2. Number sequentially: check the highest `NNNN` in `docs/adr/` and increment.
3. Set status to `accepted` (the cron agent is both proposer and decider for non-breaking changes).
4. Keep it under 150 words total. This isn't a thesis.

### Retroactive ADRs Worth Writing

Based on the current commit history, these decisions should be documented:

| ADR | Decision | Why it matters |
|---|---|---|
| 0001 | Zustand v5 for state management | Core architectural choice over Context/Redux |
| 0002 | Cloudflare D1 for product persistence | Database choice affects API design |
| 0003 | 6-layer parse engine with per-site parsers | Core feature architecture |
| 0004 | Forbes RTB API with 5-min cache | External data dependency + caching strategy |
| 0005 | Disabled D1 for initial deploy | Temporary regression, should track when re-enabled |

---

## Summary of Recommendations

| Area | Action | Priority | Effort |
|---|---|---|---|
| Commit messages | Enforce Conventional Commits immediately | **P0** | 10 min |
| CHANGELOG | Set up `release-please` GitHub Action | P1 | 30 min |
| Cron audit log | Add `docs/cron-log.jsonl` + logging script | P1 | 20 min |
| README | Replace with template from §3 | P1 | 15 min |
| Priorities file | Create `docs/PRIORITIES.md` with current queue | **P0** | 20 min |
| STATUS.md | Add CI workflow for auto-update | P2 | 45 min |
| ADRs | Write 5 retroactive ADRs + template | P2 | 30 min |

### File Tree After Implementation

```
billionaire-cart/
├── README.md                          # From §3 template
├── STATUS.md                          # Auto-updated by CI (§5)
├── CHANGELOG.md                       # Auto-generated by release-please (§1)
├── release-please-config.json         # §1 config
├── .release-please-manifest.json      # §1 version tracking
├── docs/
│   ├── PRIORITIES.md                  # §4 task queue
│   ├── cron-log.jsonl                 # §2 append-only audit log
│   ├── badges/                        # §5 dynamic badge JSON
│   │   ├── tests.json
│   │   └── bundle.json
│   ├── adr/                           # §6 decision records
│   │   ├── TEMPLATE.md
│   │   ├── 0001-use-zustand-for-state.md
│   │   ├── 0002-cloudflare-d1-for-persistence.md
│   │   └── ...
│   └── quality/                       # This audit
│       └── 05-documentation-tracking.md
├── scripts/
│   ├── log-cron-run.sh                # §2 audit logger
│   ├── next-priority.sh               # §4 queue reader
│   ├── generate-status.js             # §5 STATUS.md generator
│   ├── badges.sh                      # §5 badge JSON generator
│   └── lint-commit.sh                 # §1 commit message validator
└── .github/
    └── workflows/
        ├── release-please.yml         # §1 changelog automation
        └── update-status.yml          # §5 health dashboard
```
