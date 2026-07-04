# Billionaire Cart — Quality Playbook

> 持续自动迭代的质量保障总纲要  
> Generated 2026-07-04 · Synthesized from 5 expert reports

---

## 目录

1. [核心原则](#核心原则)
2. [Phase 1 — 立刻执行](#phase-1--立刻执行)
3. [Phase 2 — 下一轮 (1-2 周内)](#phase-2--下一轮)
4. [Phase 3 — 长期](#phase-3--长期)
5. [Cron 安全门控 (10-Gate Pipeline)](#cron-安全门控)
6. [文件访问分级](#文件访问分级)
7. [架构硬规则速查](#架构硬规则速查)
8. [详细报告索引](#详细报告索引)

---

## 核心原则

1. **每次 cron commit 必须通过全部 10 道 Gate，任何一道失败 = 放弃本次改动**
2. **单次 cron 改动上限 8 文件 / 300 行** — 小步快跑
3. **关键文件（store.ts、use-live-data.ts、layout.tsx）修改需额外验证**
4. **零容忍回归** — 测试覆盖率只能升不能降
5. **每次改动可审计** — Conventional Commits + JSONL 审计日志

---

## Phase 1 — 立刻执行

### 1.1 安装 Vitest 测试框架

```bash
npm install -D vitest vite-tsconfig-paths
```

创建 `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      thresholds: {
        "src/lib/format.ts": { statements: 85 },
        "src/lib/asset-classifier.ts": { statements: 85 },
        "src/lib/url-validator.ts": { statements: 90 },
      },
    },
  },
});
```

添加 scripts 到 `package.json`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

### 1.2 写 P0 测试 (5 个文件)

立刻创建以下测试，覆盖最关键的纯逻辑:

| 测试文件 | 目标 | 覆盖率目标 |
|----------|------|-----------|
| `src/lib/__tests__/format.test.ts` | `proxyImage`, `formatCurrency`, `formatNetWorth`, `generateId`, `timeAgo` | ≥ 90% |
| `src/lib/__tests__/asset-classifier.test.ts` | 全部 12 个分类关键词组 + overhead 计算 | ≥ 85% |
| `src/lib/__tests__/url-validator.test.ts` | SSRF 防护 (所有私有 IP 段 + cloud metadata) | ≥ 90% |
| `src/lib/__tests__/store.test.ts` | Zustand store actions + **selector 引用稳定性** | ≥ 80% |
| `src/lib/__tests__/data-integrity.test.ts` | 12 billionaires, 47 catalog items, 25 achievements 的数据完整性 | 100% |

> 完整测试代码见 [`01-testing-strategy.md`](./01-testing-strategy.md) §5

### 1.3 CI 加入测试 Gate

更新 `.github/workflows/ci.yml`:
```yaml
- name: Test
  run: npm test

- name: Coverage check
  run: npm run test:coverage
```

**构建流程变为:** Lint → Type Check → **Test** → Build

### 1.4 Conventional Commits 格式

**所有 cron commit 必须使用以下前缀:**

| 前缀 | 用途 | 例子 |
|------|------|------|
| `fix:` | Bug 修复 (P0) | `fix: Zustand selector referential stability` |
| `feat:` | 新功能 (P1) | `feat: add Walmart parser` |
| `refactor:` | 重构 (P2) | `refactor: extract omni-box hooks` |
| `perf:` | 性能优化 | `perf: lazy-load catalog images` |
| `test:` | 测试 | `test: add url-validator coverage` |
| `style:` | 格式/UI | `style: adjust card border opacity` |

### 1.5 创建 PRIORITIES.md

`docs/PRIORITIES.md` 用 checkbox 格式追踪任务队列:
```markdown
## P0 — Bug Fixes
- [x] React #185 infinite loop
- [ ] Next task...

## P1 — Features  
- [ ] ...

## P2 — Polish
- [ ] ...
```

Cron 扫描第一个未完成的最高优先级任务执行。

### 1.6 Prettier 格式化

确保 cron 每次 commit 前运行:
```bash
npx prettier --write "src/**/*.{ts,tsx}"
```

CI 检查:
```bash
npx prettier --check "src/**/*.{ts,tsx}"
```

---

## Phase 2 — 下一轮

### 2.1 ESLint 增强

安装额外插件:
```bash
npm install -D \
  @typescript-eslint/parser@^7 \
  @typescript-eslint/eslint-plugin@^7 \
  eslint-plugin-import@^2.31 \
  eslint-plugin-unused-imports@^3 \
  eslint-plugin-tailwindcss@^3.17
```

关键新规则:
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-floating-promises`: error
- `@typescript-eslint/consistent-type-imports`: error
- `unused-imports/no-unused-imports`: error
- `tailwindcss/no-contradicting-classname`: error

> 完整 `.eslintrc.json` 见 [`04-quality-tooling.md`](./04-quality-tooling.md) §1

### 2.2 Bundle Size 监控

创建 `scripts/check-bundle-size.sh` — 解析 Next.js build 输出，任何路由 first load JS > 200kB 则 CI 失败。

CI 添加:
```yaml
- name: Bundle size check
  run: MAX_FIRST_LOAD_KB=200 bash scripts/check-bundle-size.sh
```

### 2.3 文件结构重构

按优先级拆分超标文件:

| 文件 | 当前行数 | 目标 |
|------|---------|------|
| `api/parse/route.ts` | 838 | 拆成 6+ 文件: 每个平台 extractor 独立 (`extractors/amazon.ts`, `extractors/walmart.ts` 等) |
| `omni-box.tsx` | 642 | 拆成 5 文件: `useOmniBox` hook + `ManualEntryForm` + `RecentProducts` + `BatchParse` + 主组件 |
| `i18n.ts` | 423 | 拆成 2 文件: `strings.ts` (数据) + `i18n.ts` (运行时逻辑) |

### 2.4 组件目录重组

```
src/components/
├── shopping/    # omni-box, product-card, catalog, purchase-feed
├── game/        # speedrun-timer, combo-streak, achievements, easter-egg-overlay
├── finance/     # balance-display, earnings-ticker, category-breakdown, wealth-context, spending-speed
├── identity/    # identity-selector, billionaire-reactions
├── effects/     # atmosphere, particle-burst, checkout-animation, black-card
└── share/       # share-receipt, absurd-toast, bankrupt-overlay, guilt-meter, vault
```

每个子目录一个 `index.ts` barrel export。

### 2.5 Cron 审计日志

每次 cron 运行后追加一行到 `docs/cron-log.jsonl`:
```json
{
  "run_id": "cron-2026-07-04T17:00:00Z",
  "timestamp": "2026-07-04T17:00:00Z",
  "priority": "P1",
  "commit_sha": "abc1234",
  "files_changed": 3,
  "lines_added": 45,
  "lines_removed": 12,
  "tests_passed": true,
  "bundle_size_kb": 142,
  "deploy_status": "success"
}
```

### 2.6 README 更新

完整 README 模板见 [`05-documentation-tracking.md`](./05-documentation-tracking.md) §3，包含项目说明、技术栈、开发指南、架构概览、自动迭代说明。

---

## Phase 3 — 长期

### 3.1 覆盖率提升

| 层 | Phase 1 目标 | 长期目标 |
|----|-------------|---------|
| 纯逻辑 (lib/) | 85-90% | 95% |
| 数据文件 | 95% | 100% |
| Store 逻辑 | 80% | 90% |
| API Routes | 0% | 80% |
| 组件 | 0% | 50% |

### 3.2 Lighthouse CI

对 Cloudflare Pages preview deploy 跑 Lighthouse:
- Performance ≥ 0.85
- Accessibility ≥ 0.90
- Best Practices ≥ 0.90
- CLS ≤ 0.1

> 配置详见 [`04-quality-tooling.md`](./04-quality-tooling.md) §4

### 3.3 Post-Deploy 健康检查

部署后自动 curl 线上地址:
```bash
BODY=$(curl -sL https://billionaire-cart.pages.dev)
echo "$BODY" | grep -q "亿万富翁购物车" || ROLLBACK
echo "$BODY" | grep -q "Application error" && ROLLBACK
curl -sf https://billionaire-cart.pages.dev/api/billionaires > /dev/null || ROLLBACK
curl -sf https://billionaire-cart.pages.dev/api/rates > /dev/null || ROLLBACK
```

失败时通过 CF Pages API 自动回滚到上一个成功部署。

### 3.4 Dependabot

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    groups:
      minor-and-patch:
        update-types: [minor, patch]
```

### 3.5 ADR (架构决策记录)

重大架构变更记录到 `docs/adr/`，模板 < 150 字:
- Context → Decision → Alternatives → Consequences

---

## Cron 安全门控

### 10-Gate 必过流水线

```
Gate 0  ─ 预检: diff 范围 ≤ 8 文件 / 300 行, 不触碰 🔴 只读文件
Gate 1  ─ tsc --noEmit (0 errors)
Gate 2  ─ eslint --max-warnings 0
Gate 3  ─ vitest run (全部通过)
Gate 4  ─ next build (成功)
Gate 5  ─ Bundle size ≤ 200kB per route first-load
Gate 6  ─ Smoke test: 启动 server, curl 关键路由返回 200
Gate 7  ─ Zustand selector 引用稳定性测试 (防止 React #185 重现)
Gate 8  ─ git commit + push (conventional commit 格式)
Gate 9  ─ Post-deploy: 线上 health check 通过
```

**Gate 9 失败 → 自动 CF Pages rollback + git revert**

### Zustand Selector 专项 (Gate 7)

React #185 的根因是 `useLiveData((s) => s.getMerged())` 每次调用创建新数组引用。防止重现:

```ts
it("mergedBillionaires selector returns stable reference", () => {
  const ref1 = useLiveData.getState().mergedBillionaires;
  const ref2 = useLiveData.getState().mergedBillionaires;
  expect(ref1).toBe(ref2); // === 引用相等
});
```

静态分析: grep 所有 Zustand selector，禁止在 selector 内使用 `.map()`, `.filter()`, `[...spread]`, `Object.keys()` 等创建新引用的操作。

---

## 文件访问分级

### 🔴 只读 — Cron 绝对不碰

| 文件 | 原因 |
|------|------|
| `package.json`, `package-lock.json` | 依赖变更需人工审批 |
| `.github/workflows/*.yml` | CI 管线 — 改错等于失去所有安全门 |
| `tsconfig.json`, `.eslintrc.json`, `.prettierrc` | 工具配置 |
| `wrangler.toml` | 部署配置 |
| `tailwind.config.ts` | 设计系统 Token |
| `docs/quality/*` | 质量规则本身 |
| `vitest.config.ts` | 测试配置 |

### 🟡 谨慎 — 需额外 Gate

| 文件 | 风险 | 额外验证 |
|------|------|---------|
| `src/lib/store.ts` | Zustand 核心 — 改错全站崩 | Gate 7 selector 稳定性 |
| `src/lib/use-live-data.ts` | React #185 重灾区 | Gate 7 + 无 `.map()/.filter()` in selector |
| `src/app/layout.tsx` | 根布局 | Gate 6 smoke test |
| `src/app/page.tsx` | 主入口 | Gate 6 smoke test |
| `src/app/error.tsx`, `global-error.tsx` | 错误兜底 | 不允许删除 |

### 🟢 正常 — 标准 Gate 流水线

所有 `src/components/`, `src/data/`, `src/lib/` (非上述文件), `src/app/api/` 下的文件。

---

## 架构硬规则速查

| ID | 规则 | 检查方式 |
|----|------|---------|
| `SIZE-001` | 组件文件 ≤ 300 行 | `wc -l` |
| `SIZE-002` | API route 文件 ≤ 250 行 | `wc -l` |
| `SIZE-003` | Lib 文件 ≤ 200 行 | `wc -l` |
| `SIZE-004` | 数据/配置文件 ≤ 500 行 (仅 warn) | `wc -l` |
| `FUNC-001` | 组件逻辑体 ≤ 80 行 (hooks+handlers, 不含 JSX) | 行数计算 |
| `FUNC-002` | JSX return ≤ 120 行 — 超了就提取子组件 | 行数计算 |
| `FUNC-003` | `useCallback`/`useMemo` 体 ≤ 30 行 | grep |
| `EXP-001` | 组件: 只用 named export | grep `export default` |
| `NAME-001` | 文件名 kebab-case | regex |
| `NAME-004` | 自定义 hook 文件以 `use-` 开头 | 文件名检查 |
| `DEP-001` | 零循环依赖 | import 分析 |
| `DEP-002` | 组件不互相 import (通过 page.tsx 组合) | grep |
| `SCOPE-001` | 单次 commit ≤ 8 文件 | `git diff --stat` |
| `SCOPE-002` | 单次 commit ≤ 300 行变动 | `git diff --stat` |

---

## 详细报告索引

| 报告 | 内容 | 行数 |
|------|------|------|
| [`01-testing-strategy.md`](./01-testing-strategy.md) | 测试框架、覆盖率目标、5 个完整测试文件、CI 集成 | 1,584 |
| [`02-architecture-rules.md`](./02-architecture-rules.md) | 文件拆分计划、组件重组、26 条机器可执行规则、`arch-lint.sh` | 498 |
| [`03-cron-safety.md`](./03-cron-safety.md) | 10-Gate 流水线、范围限制、回滚策略、冲突防范、审计 | 1,183 |
| [`04-quality-tooling.md`](./04-quality-tooling.md) | ESLint 增强、Bundle 监控、Lighthouse CI、完整 CI YAML | 858 |
| [`05-documentation-tracking.md`](./05-documentation-tracking.md) | Conventional Commits、审计日志、README 模板、优先级追踪 | 671 |

---

> **底线**: 没有通过 10 道 Gate 的改动，不许 commit。没有 Conventional Commit 格式的消息，不许 push。没有通过线上 health check 的部署，自动 rollback。
