# Phase 38: First-Load Performance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 38-first-load-performance
**Mode:** `/gsd-discuss-phase 38 --analyze` (interactive, analyze flag = trade-off tables up front)
**Areas discussed:** GA-4 (Verification), GA-5 (Prefetch Granularity), GA-6 (Plan Structure)
**Areas auto-locked (user did not select to discuss, recommendations applied):** GA-1 (RSC auth path), GA-2 (Waterfall fix), GA-3 (Railway cold-start)

---

## Gray Area Selection (Round 1 — Architecture)

| Option | Description | Selected |
|--------|-------------|----------|
| GA-1 RSC 鉴权路径 | BFF proxy loopback vs 直连 Railway vs 仅已登录时 prefetch | |
| GA-2 Waterfall 消除 | 后端聚合 vs 前端 Promise.all vs 混合 | |
| GA-3 Railway 冷启动 | 先测后定 vs GH Actions cron vs always-on | |

**User's choice:** None selected → all three auto-locked to recommended defaults:
- GA-1 → A (BFF proxy loopback)
- GA-2 → B (frontend RSC Promise.all)
- GA-3 → A→B (先测后定；如 >2s 加 GH Actions cron)

---

## Gray Area Selection (Round 2 — Execution)

| Option | Description | Selected |
|--------|-------------|----------|
| GA-4 验收方式 | 手工 vs Playwright 自动化 vs 两者都做 | ✓ |
| GA-5 预取粒度 | Hero-only vs Critical-path 全量 vs Streaming | ✓ |
| GA-6 Plan 切分结构 | 单 plan vs 每页一 plan vs 按依赖分层 | ✓ |

**User's choice:** All three selected for deep-dive.

---

## GA-4 — Verification Approach

### Assertion Content

| Option | Description | Selected |
|--------|-------------|----------|
| A 纯 DOM 否定 | Network-idle 前断言 `[data-testid^=skeleton]` 为空 | |
| B DOM + LCP 定量 | 加 web-vitals 库测 LCP <1.5s | |
| C 截图 diff | 首屏截图 vs baseline 像素 diff | ✓ |

**User's choice:** C (pixel-diff)
**Notes:** User reads success criterion #2 literally ("no SkeletonCard visible to the naked eye") — pixel diff is the only assertion that matches that bar strictly. DOM-only cannot catch timing-related skeleton flash.

### Coverage Scope

| Option | Description | Selected |
|--------|-------------|----------|
| A 仅 Dashboard | 1 页 | |
| B Dashboard + Predict (代表页) | 2 页 | |
| C 全 6 页 | 6 页 | ✓ |

**User's choice:** C (all 6 pages)
**Notes:** Full regression protection. Claude committed the fixture seed + time-freeze scaffolding to Claude's Discretion (D-C4 in CONTEXT.md) — user did not push back.

---

## GA-5 — Prefetch Granularity

### Predict Page N-Fanout

| Option | Description | Selected |
|--------|-------------|----------|
| A 全量预取 | Server parallel fetches all N courses × 2 endpoints | ✓ |
| B Top-3 预取 | Only first 3 courses; rest client-side | |
| C 仅预取课列表 | Hero-only fallback | |

**User's choice:** A (full N-fanout)
**Notes:** Cold-start amplification accepted because GA-3 warmup (if needed) neutralises it. Consistency with the "no skeleton" bar outweighs the cold-start risk.

### Prefetch Failure Handling

| Option | Description | Selected |
|--------|-------------|----------|
| A 静默降级 | Empty dehydrate(), client useQuery 补发 + SkeletonCard | ✓ |
| B 整页 error.tsx | Throw to Next error boundary | |
| C 关键 throw 非关键降级 | Per-query classification | |

**User's choice:** A (silent graceful degrade)
**Notes:** Phase 38 must never be worse than today's experience on failure. Sentry tag `phase: 38, operation: rsc_prefetch` added for observability.

---

## GA-6 — Plan Structure

### P02 Execution Strategy (5 pages)

| Option | Description | Selected |
|--------|-------------|----------|
| A Wave-parallel (single plan) | 5 sub-tasks parallel in one plan | ✓ |
| B Sequential 5 plans | One page per plan | |
| C Paired 3 plans | 2-3 pages per plan | |

**User's choice:** A (wave-parallel)
**Notes:** File-level non-overlap makes this safe. Matches the "standard executor wave" pattern from prior phases.

### Playwright Spec Location

| Option | Description | Selected |
|--------|-------------|----------|
| A 独立 P04 | Dedicated plan after functional landing | ✓ |
| B Per-page 内嵌 | Each functional plan includes its page spec | |
| C 先手工后自动化 | Manual UAT during P01-P02, automate in P04 | |

**User's choice:** A (dedicated P04)
**Notes:** Baseline screenshots easier to generate once when the 6-page experience is stable. Functional PRs stay focused; regression suite lands as a coherent bundle.

---

## Claude's Discretion

These decisions were not explicitly asked but are non-obvious and recorded in CONTEXT.md D-C4:

- Playwright test account: dedicated Supabase `perf-test@uniboard.uk` seeded via SQL migration
- Time freeze: Playwright 1.45+ `page.clock.install({ time: '2026-04-01T08:00:00+10:00' })`
- Locale coverage: `zh-CN` only in Playwright; `en` in manual UAT
- Diff tolerance: `maxDiffPixelRatio: 0.02`
- Baseline storage: `frontend/tests/e2e/perf/__screenshots__/` (committed)
- Plan structure: 4 plans — P01 Infra+Dashboard, P02 5-page wave, P03 Railway cold-start, P04 Playwright suite
- No feature flag — silent-degrade failure mode is equivalent to today's behaviour

## Deferred Ideas

Preserved in CONTEXT.md `<deferred>` section. Not lost:

- Backend aggregation of `assessment_weights` into `/deadlines/upcoming`
- Streaming with Suspense boundaries per region (GA-5 option C)
- Partial Prerendering (PPR)
- `en` locale in Playwright coverage
- LCP / Core Web Vitals instrumentation beyond Vercel Analytics
- Sentry Performance tracing on RSC prefetch spans
- Settings page first-load (not in 6-page scope; possible 38.x follow-up)
