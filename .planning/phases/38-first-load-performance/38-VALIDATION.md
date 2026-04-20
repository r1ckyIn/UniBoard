---
phase: 38
slug: first-load-performance
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 38 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.x (frontend unit) + Playwright 1.59.1 (e2e pixel-diff) + tsc (types) + eslint |
| **Config file** | `frontend/vitest.config.ts`, `frontend/playwright.config.ts` (new in P04), `frontend/tsconfig.json` |
| **Quick run command** | `cd frontend && pnpm vitest run --changed` |
| **Full suite command** | `cd frontend && pnpm test && pnpm typecheck && pnpm lint` |
| **Estimated runtime** | ~25s (vitest+tsc+lint); Playwright e2e ~3–6 min (P04 only) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && pnpm vitest run --changed && pnpm typecheck`
- **After every plan wave:** Run `cd frontend && pnpm test && pnpm typecheck && pnpm lint`
- **Before `/gsd-verify-work`:** Full suite must be green + Playwright e2e pixel-diff green (all 6 pages, `zh-CN`)
- **Max feedback latency:** 30 seconds for unit/type/lint; ~6 min for e2e full suite

---

## Per-Task Verification Map

> Populated by gsd-planner in step 8 — one row per task across P01–P04.
> Every task must map to either an `<automated>` command OR a Wave 0 stub entry below.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 38-01-01 | 01 | 1 | PERF-01 | T-38-01 | Server QueryClient is per-request (no cross-user leak) | unit | `cd frontend && pnpm vitest run lib/query/server` | ❌ W0 | ⬜ pending |
| 38-01-XX | 01 | 1–N | PERF-01/02 | — | (fill by planner) | unit/e2e | (fill by planner) | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `frontend/lib/query/server.ts` — new per-request `getServerQueryClient()` factory
- [ ] `frontend/lib/query/__tests__/server.test.ts` — isolation + defaults-mirror assertions
- [ ] `frontend/lib/rsc/__tests__/create-prefetched-page.test.tsx` — HOF contract (degrades on prefetch failure, preserves dehydrated state)
- [ ] `frontend/tests/e2e/perf/` — Playwright pixel-diff harness (P04 Wave 0 spike: verify `page.clock.install()` works against Next.js 15 dev server)
- [ ] `frontend/tests/e2e/perf/__screenshots__/` — baseline directory (committed)
- [ ] `supabase/migrations/*_perf_test_seed.sql` — `perf-test@uniboard.uk` fixture (3 courses, fixed deadlines)

*No new test framework installation needed — vitest + Playwright already in repo.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "No SkeletonCard flash to the naked eye" on cached-auth revisit (all 6 pages) | PERF-01 / Success #2 | Subjective human judgement; pixel-diff covers regression but initial sign-off is human | Walk through Dashboard, Courses, Deadlines, Predict, Digest, Timetable on Vercel preview with warm session; no skeleton visible |
| `en` locale coverage | PERF-01 | CI spec count bounded to `zh-CN` only (D-C4) | Manual UAT rotation — spot-check `en` path on preview |
| Backlog 999.2 re-evaluation | Success #5 | Requires human judgement on whether RSC prefetch resolves viewport-lazy symptom | Update `.planning/ROADMAP.md` entry with "obsolete" or "retained + residual case" after Phase 38 ship |
| Railway warmup cron activation decision | PERF-03 / Success #4 | Conditional — depends on measured p95 value | After P03 measurement report: if p95 > 2s, enable GH Actions cron; otherwise document "not needed" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (unit/type/lint) / 6 min (e2e)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
