---
phase: 38-first-load-performance
verified: 2026-04-21T16:45:00Z
status: human_needed
score: 7/10 must-haves verified (3 items deferred to documented human checkpoints by design)
overrides_applied: 0
re_verification:
  previous_status: null
  previous_score: null
  gaps_closed: []
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Visually confirm no SkeletonCard flash on cached-auth revisit across 6 pages (Dashboard, Courses, Deadlines, Predict, Digest, Timetable) on either `pnpm dev` or a Vercel preview"
    expected: "First paint on each page shows real data (course cards, deadline list, donut chart, etc.) — no SkeletonCard visible to the naked eye. Covers Success Criterion #2 + PERF-01."
    why_human: "Success Criterion #2 is literally a naked-eye observation. Automated dual-verification is scaffolded by 38-04 (Playwright pixel-diff suite, maxDiffPixelRatio 0.02) but baselines cannot be generated without live Supabase credentials (PERF_TEST_PASSWORD + perf-test@uniboard.uk user + applied fixture migration), which are deferred to the 38-04 Task 5 human checkpoint by design (autonomous: false)."
  - test: "Run cold-start measurement (GitHub → Actions → 'Railway Cold-Start Measurement' → Run workflow with defaults N=10, IDLE=15), wait ~150 min, fill p50/p95 into coldstart-report.md, check decision box (warmup NOT enabled if p95 ≤ 2000ms, warmup ENABLED with schedule uncomment + commit if > 2000ms)"
    expected: "coldstart-report.md has 10 real sample values, p50/p95 numeric values, exactly one decision checkbox checked. If warmup enabled, railway-warmup.yml `schedule:` block is uncommented in a follow-up commit. Covers Success Criterion #4 + PERF-03."
    why_human: "Plan 38-03 is explicitly `autonomous: false`. The 150-minute wall-clock measurement loop cannot run inside an autonomous executor session, and the warmup activation decision requires human cost/benefit judgement. All infrastructure (script + measurement workflow + conditional warmup workflow + report stub with decision rubric) is in place; only the TBDs in coldstart-report.md remain."
  - test: "After 38-04 Step 1-8 complete (Supabase user created, PERF_TEST_PASSWORD secret set, fixture migration applied, 6 baseline PNGs captured and committed, local `pnpm exec playwright test first-paint` green), inspect each of the 6 baseline screenshots to confirm NO SkeletonCard pixels are visible, then flip ROADMAP.md §Backlog 999.2 verdict from provisional `retained` to final `obsolete` or `retained + residual case`"
    expected: "ROADMAP.md §Backlog 999.2 line 426 status updated from provisional `retained — pending final UAT sign-off` to one of the three rubric outcomes (lines 427-429), with commit `docs(38-04): close ROADMAP Backlog 999.2 as <obsolete|retained>`. Covers Success Criterion #5."
    why_human: "The rubric is committed (3-branch decision tree on ROADMAP.md lines 427-429). Binary `obsolete` vs `retained` flip requires observing the post-ship baselines, which in turn requires the 38-04 human credential checkpoint to complete first."
---

# Phase 38: First-Load Performance — Verification Report

**Phase Goal:** First paint shows real data across 6 card-heavy pages (Dashboard, Courses, Deadlines, Predict, Digest, Timetable) — no skeleton flash on cached-auth revisit — achieved via Next.js 15 Server Component prefetch + TanStack Query `HydrationBoundary`, with dashboard waterfall collapsed and Railway cold-start behaviour characterised.

**Verified:** 2026-04-21T16:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All 6 target pages have `page.tsx` as an async Server Component that prefetches required queries and returns `<HydrationBoundary state={dehydrate(queryClient)}>` | VERIFIED | All 6 files (`dashboard`, `courses`, `deadlines`, `predict`, `digest`, `timetable`) import `createPrefetchedPage` from `@/lib/rsc/create-prefetched-page` and use it as the render root. The HOF internally wraps children in `<HydrationBoundary state={dehydrate(queryClient)}>` (`create-prefetched-page.tsx:79-82` unauthed branch, `:128-132` authed branch). All 6 pages declare `export const dynamic = "force-dynamic"`. None contain `"use client"`, `useAuthStore`, or cookie-forwarding anti-patterns. |
| 2 | On cached-auth revisit (JWT valid, warm Railway), first paint shows real data across the 6 pages — no `SkeletonCard` visible | HUMAN_NEEDED | Scaffolding exists: hydrated cache flows from RSC prefetch → HydrationBoundary → client `useQuery` reads hydrated state on first paint before any refetch (staleTime 5min, retry 1). Consumer-parity queryKeys confirmed in Dashboard (`useUpcomingDeadlines` → `deadlineOptions.upcoming()`), Deadlines (`useDeadlines()` → `deadlineOptions.list()`), Predict (`useGpaReport` as N-source), Timetable (no-week sessions + weeks). But the "naked eye" check and dual-verification pixel-diff run require baseline capture + live credentials — deferred by design to 38-04 Task 5 (autonomous: false). See human_verification item #1. |
| 3 | Dashboard `/deadlines/upcoming → /courses/{nearest}` waterfall eliminated via `Promise.all` in RSC prefetch layer | VERIFIED | `frontend/app/[locale]/(dashboard)/page.tsx`: exactly 1 awaited `.fetchQuery` call (line 94, `deadlineOptions.upcoming()`); independent prefetches (`courses`, `gpa`, `study-rec`) fire immediately in parallel (lines 67-87); `Promise.all(independentPrefetches)` bridges the nearest-course lookup (line 106) without re-fetching; conditional nearest-course detail prefetch is added to `Promise.allSettled` on line 132 (never serial). Regex audit (stricter `await[^\n]*?\.fetchQuery\b` from WR-02 fix) confirms count ≤ 2 (actual: 1). |
| 4 | Railway cold-start behaviour characterised — p50/p95 measured + warmup decision | HUMAN_NEEDED | Infrastructure complete: `measure-coldstart.ts` (zero-dep Node 22 runner), `railway-coldstart-measure.yml` (workflow_dispatch, N×IDLE loop, p50/p95 computed inline), `railway-warmup.yml` (shipped with `schedule:` commented out, activation recipe in header), `coldstart-report.md` (measurement spec + decision rubric + TBD placeholders). Plan 38-03 is `autonomous: false` — the 150-min measurement loop + warmup activation decision gated on human action. See human_verification item #2. |
| 5 | Backlog 999.2 (viewport lazy-mount) re-evaluated post-ship — obsolete OR retained + residual case | PARTIAL | ROADMAP.md line 426 records provisional `retained` verdict pending pixel-diff baseline capture; 3-branch decision rubric committed at lines 427-429. Final verdict flip (obsolete vs retained + residual) requires post-ship observation of the 6 committed baselines — gated on 38-04 Task 5 checkpoint completion. See human_verification item #3. |
| 6 | Server `QueryClient` factory isolated per request (T-38-01) | VERIFIED | `frontend/lib/query/server.ts` returns fresh `QueryClient` per call (no module singleton, no React.cache). Unit test asserts fresh instance + byte-identical defaults (staleTime 5min, retry 1, refetchOnWindowFocus false, mutation retry 0). All 4 tests pass. |
| 7 | `createPrefetchedPage` HOF silently degrades per-query + auth-gates on null session | VERIFIED | HOF wires QueryCache `onError` subscriber (lines 91-107) with `phase: "38", operation: "rsc_prefetch", query: deriveQueryLabel(queryKey)` tag convention. Null-session branch (lines 76-83) returns empty-dehydrate HydrationBoundary (no `run` call, no backend calls). All 4 HOF tests pass (happy path, null session, per-query degrade, outer error). |
| 8 | `getServerApiClient` uses absolute URL + `Authorization: Bearer <jwt>` (NOT cookie forwarding) + trusted origin resolution (WR-01 fix) | VERIFIED | `server-query-fn.ts` injects `Authorization: Bearer ${accessToken}` via ky. Origin resolution chain (WR-01 hardening): `APP_ORIGIN` → `VERCEL_URL` (https-wrapped) → `headers()` fallback. `prefixUrl: ${origin}/api/v1` is absolute. No `useAuthStore`, no 401 retry handler. |
| 9 | All 5 pages (P02) reuse P01's `wrapSentry` helper verbatim (consistent Sentry tag convention) | VERIFIED | Every P02 page imports `wrapSentry` from `@/lib/rsc/create-prefetched-page`. wrapSentry call counts: dashboard 6, courses 1, deadlines 2, predict 3 (gpa + course-detail per id + roi per id), digest 1, timetable 4. Tag shape `tags: { phase: "38", operation: "rsc_prefetch", query: <label> }` + `extra: { userId, ... }` — unit-test-verified in `create-prefetched-page.test.tsx`. |
| 10 | Playwright pixel-diff harness shipped (infrastructure only; baselines gated on human credential checkpoint) | VERIFIED | `@playwright/test@^1.59.1` installed; `playwright.config.ts` has `maxDiffPixelRatio: 0.02`, zh-CN locale, 1440×900 viewport, sequential run; `first-paint.spec.ts` has describe-level `test.skip(!shouldRunPerfSuite())` env gate + 6-page loop generating exactly 6 test cases; `loginAsPerfTestUser` fails fast on missing `PERF_TEST_PASSWORD` (T-38-11); `installFixedClock` freezes time to `2026-04-01T08:00:00+10:00`; `playwright-e2e` job added to `.github/workflows/frontend-ci.yml` with all required secrets wired. `__screenshots__/.gitkeep` placeholder committed (baselines captured at 38-04 Task 5 checkpoint — deferred by design). |

> **Truth #1 SUPERSEDED BY PHASE 38.2 (2026-04-22):** The "All 6 pages declare
> `export const dynamic = "force-dynamic"`" portion of Truth #1 was reversed
> by Phase 38.2 (CONTEXT.md D-01 through D-05). Rationale: the `force-dynamic`
> directive defeated Next.js 15's client router cache, causing full RSC re-
> render on every sidebar navigation to a previously-visited page. Phase
> 38.2 removes the directive on all 6 pages and relies on Next.js's implicit
> dynamic-rendering detection via `cookies()` / `getSession()` in the HOF
> tree. See `.planning/phases/38.2-navigation-cache-parity/38.2-VERIFICATION.md`
> for the new contract. The rest of Truth #1 (async Server Component,
> `createPrefetchedPage` HOF usage, `HydrationBoundary` wrapping, no
> anti-patterns) remains VERIFIED and in force.

**Score:** 7 fully verified / 3 human-needed (deferred to documented checkpoints) = **7/10 automatable must-haves**. No gaps in automated scope; all 3 human items are the explicitly-scheduled `autonomous: false` checkpoints in 38-03 and 38-04.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `frontend/lib/query/server.ts` | Server QueryClient factory + isServer guard | VERIFIED | 37 lines. Exports `makeQueryClient` + `getServerQueryClient` (throws on client misuse). Defaults byte-identical to client. No `"use client"`, no `React.cache`. |
| `frontend/lib/query/__tests__/server.test.ts` | Unit tests for isolation + defaults mirror | VERIFIED | Tests pass (4 cases). Location note: final location is `frontend/__tests__/query/server.test.ts` per 38-01 Deviation 2; vitest discovery covers both paths. |
| `frontend/lib/rsc/create-prefetched-page.tsx` | HOF with auth gate + HydrationBoundary + per-query degrade | VERIFIED | 156 lines. Exports `createPrefetchedPage`, `wrapSentry`, `PrefetchContext`. Wires QueryCache onError with phase-38 tag. Null-session returns empty dehydrate. |
| `frontend/lib/rsc/server-query-fn.ts` | Server ky factory with JWT injection | VERIFIED | 66 lines. Exports `getServerApiClient(accessToken)`. Origin resolution: APP_ORIGIN → VERCEL_URL → headers fallback (WR-01 fix applied). |
| `frontend/lib/rsc/__tests__/create-prefetched-page.test.tsx` | HOF contract tests | VERIFIED | Tests pass (4 cases: happy path, null session, silent degrade, Sentry tag shape). |
| `frontend/app/[locale]/(dashboard)/page.tsx` | Dashboard RSC prefetch + HydrationBoundary + waterfall collapse | VERIFIED | 135 lines. 1 awaited fetchQuery (`deadlineOptions.upcoming`) + 3 independent prefetches (Wave A) + Promise.all bridge (Wave B) + Promise.allSettled for nearest-course detail (Wave C). 6 wrapSentry call sites. No anti-patterns. |
| `frontend/app/[locale]/(dashboard)/courses/page.tsx` | Courses RSC prefetch | VERIFIED | 45 lines. Single-query baseline. Contains `createPrefetchedPage`, `courseOptions.list`, `wrapSentry("courses", ...)`. |
| `frontend/app/[locale]/(dashboard)/deadlines/page.tsx` | Deadlines RSC prefetch (2-query parallel) | VERIFIED | 61 lines. `Promise.allSettled` over `courseOptions.list` + `deadlineOptions.list` (consumer parity — `useDeadlines` → `list()`, documented deviation). |
| `frontend/app/[locale]/(dashboard)/predict/page.tsx` | Predict RSC prefetch (full N-fanout) | VERIFIED | 100 lines. 1 awaited fetchQuery (`gpaOptions.report` — N source, consumer-parity deviation vs plan text), `courseIds.map` fanout (2× for detail + roi), single `Promise.allSettled` over 2N prefetches. Inner `<Suspense>` preserved. |
| `frontend/app/[locale]/(dashboard)/digest/page.tsx` | Digest RSC prefetch (Suspense preserved) | VERIFIED | 46 lines. Single-query (`digestOptions.latest`), inner `<Suspense>` preserved. |
| `frontend/app/[locale]/(dashboard)/timetable/page.tsx` | Timetable RSC prefetch (parallel) | VERIFIED | 95 lines. `Promise.allSettled` over 4 queries (sessions, weeks, deadlines-list, courses-list). computeCurrentWeek intentionally NOT used server-side (consumer-parity deviation — documented). |
| `frontend/tests/e2e/perf/coldstart.spec.ts` | Playwright-style measurement spec placeholder | VERIFIED | 40 lines. `@ts-nocheck` + `test.skip(true, ...)` guards. ESLint ignore entry added. Note: IN-01 (stale comment since P04 landed) is info-level only, not blocking. |
| `frontend/tests/e2e/perf/measure-coldstart.ts` | Runner script for N spaced samples | VERIFIED | 8 matches for `SAMPLE_MS=` / `AbortSignal.timeout` / `NEXT_PUBLIC_API_URL` / `healthz`. Zero-dep Node 22 (`--experimental-strip-types`). |
| `.github/workflows/railway-coldstart-measure.yml` | On-demand GH Actions measurement | VERIFIED | 108 lines. `workflow_dispatch` only, input validation, env-var indirection, p50/p95 computed inline, samples uploaded as artifact. YAML valid. |
| `.github/workflows/railway-warmup.yml` | Conditional warmup cron (disabled by default) | VERIFIED | 42 lines. `schedule:` block commented out. `workflow_dispatch` active for manual test. Activation recipe in header comment. YAML valid. |
| `.planning/phases/38-first-load-performance/coldstart-report.md` | Measurement output + decision record | PARTIAL | Stub file committed. Contains measurement spec (both options), TBD placeholders for samples + p50 + p95, 2 mutually-exclusive decision checkboxes. **Real values pending human measurement run (human_verification item #2).** |
| `frontend/playwright.config.ts` | Playwright config with pixel-diff tolerance | VERIFIED | Contains `maxDiffPixelRatio: 0.02`, `locale: "zh-CN"`, `testDir: "./tests/e2e"`, sequential run, GitHub-format reporter under CI. |
| `frontend/tests/e2e/perf/first-paint.spec.ts` | 6-page pixel-diff spec | VERIFIED | 93 lines. `test.describe` with `test.skip(!shouldRunPerfSuite())` env gate. Loop generates exactly 6 test cases (one per `PAGES` entry). Contains `toHaveScreenshot`, `installFixedClock`, `loginAsPerfTestUser`. |
| `frontend/tests/e2e/perf/helpers/auth.ts` | loginAsPerfTestUser helper | VERIFIED | Exports `shouldRunPerfSuite()` + `loginAsPerfTestUser()`. Contains `PERF_TEST_PASSWORD`, `perf-test@uniboard.uk`, `signInWithPassword` equivalent via `/auth/v1/token`. Fails fast on missing password. |
| `frontend/tests/e2e/perf/helpers/clock.ts` | installFixedClock helper | VERIFIED | 27 lines. Exports `FROZEN_CLOCK_ISO = "2026-04-01T08:00:00+10:00"` + `installFixedClock(page)` wrapping `page.clock.install`. |
| `supabase/migrations/20260420000001_phase38_perf_test_seed.sql` | Idempotent fixture migration | VERIFIED | 197 lines. Contains `perf-test@uniboard.uk` (7 refs), 3 fixed-UUID courses (`38c00001-*`), 3 fixed-UUID unified_deadlines (`38d00001-*`), ON CONFLICT blocks, BEGIN/COMMIT, RAISE NOTICE guard, 2026-04 due dates anchored to frozen clock. Uses real schema (`unified_deadlines` table, not legacy `deadlines`). |
| `.github/workflows/frontend-ci.yml` | Playwright CI job | VERIFIED | `playwright-e2e` job added; reads `PERF_TEST_PASSWORD`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL`. Cache keyed on lockfile. `playwright install chromium --with-deps`. Conditional `upload-artifact` on `failure()`. YAML valid. |
| `frontend/tests/e2e/perf/__screenshots__/.gitkeep` | Directory placeholder | VERIFIED | Placeholder committed. **Baseline PNGs (6 expected) NOT captured in this executor run — deferred by design to 38-04 Task 5 human checkpoint (requires PERF_TEST_PASSWORD + applied fixture migration).** |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `frontend/app/[locale]/(dashboard)/page.tsx` | `frontend/lib/rsc/create-prefetched-page.tsx` | `createPrefetchedPage` HOF call | WIRED | Imports + call on line 55. |
| `frontend/lib/rsc/create-prefetched-page.tsx` | `frontend/lib/supabase/server.ts` | `createClient() + supabase.auth.getSession()` | WIRED | Import line 36; call lines 71-74. |
| `frontend/lib/rsc/server-query-fn.ts` | Next.js `headers()` API | host/x-forwarded-proto resolution | WIRED | `nextHeaders()` call inside `resolveOrigin()` fallback branch (line 49). Primary resolution now via `APP_ORIGIN` / `VERCEL_URL` (WR-01 hardening). |
| All 6 pages | BFF proxy `/api/v1/*` | `getServerApiClient → api.get(...)` | WIRED | All 6 pages import `getServerApiClient` from `@/lib/rsc/server-query-fn` and invoke `api.get(...)` inside their `run` callback. |
| RSC prefetch failures | Sentry | `captureException` with phase-38 tag | WIRED | `create-prefetched-page.tsx:92-107` (QueryCache onError primary channel) + `:121-124` (outer try/catch) + `wrapSentry` helper `:140-155`. Tag shape: `tags: { phase: "38", operation: "rsc_prefetch" | "rsc_prefetch_outer", query: <label> }`. |
| All 5 P02 pages | P01 `createPrefetchedPage` + `wrapSentry` | Import from `@/lib/rsc/create-prefetched-page` | WIRED | Every P02 page imports both from the P01 module — no re-implementation. Helper is invoked inside each page's `run` callback. |
| Playwright spec | `helpers/auth.ts` + `helpers/clock.ts` | Import `loginAsPerfTestUser` + `installFixedClock` | WIRED | Confirmed in `first-paint.spec.ts:29-33`. |
| `helpers/auth.ts` | Supabase Auth `/auth/v1/token` | `page.request.post` with password grant | WIRED | Posts to `${supabaseUrl}/auth/v1/token?grant_type=password` with `PERF_TEST_PASSWORD`. |
| `coldstart-report.md` | `railway-warmup.yml` | User decision — uncomment schedule if p95 > 2s | PARTIAL | Activation recipe documented in both files. Linkage complete; activation itself gated on measurement (human_verification #2). |
| `railway-coldstart-measure.yml` | Railway `/healthz` | Node fetch in measure-coldstart.ts with 30s timeout | WIRED | Workflow runs `node --experimental-strip-types tests/e2e/perf/measure-coldstart.ts`; script hits `${RAILWAY_URL}/healthz` via fetch + AbortSignal.timeout. |

### Data-Flow Trace (Level 4)

Target pages render dynamic data from hydrated cache. Level 4 traces server prefetch → hydrated cache → client component read.

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| `(dashboard)/page.tsx` | courses / gpa / studyRec / upcoming deadlines / nearestCourse detail | 5 endpoints prefetched via server ky + populated in QueryClient | Real (per BFF → Railway), hydrated into client via HydrationBoundary | FLOWING (architecturally; confirmation of "no skeleton flash" requires human visual check — human_verification #1) |
| `courses/page.tsx` | courses list | `/courses` prefetched via `courseOptions.list()` | Real | FLOWING (same caveat) |
| `deadlines/page.tsx` | courses + deadlines list | 2 endpoints via `Promise.allSettled` (consumer-parity queryKeys) | Real | FLOWING (consumer-parity verified: `useDeadlines()` → `deadlineOptions.list()`) |
| `predict/page.tsx` | gpaReport (N source) + N × courseDetail + N × roi | `/gpa` awaited, then 2N prefetches in `Promise.allSettled` | Real (fanout uses `gpaReport.data.courses` map) | FLOWING (consumer-parity verified: `PredictPage.tsx` uses `useGpaReport` + `useQueries(courseOptions.detail(c.course_id))`) |
| `digest/page.tsx` | digest.latest | `/digest/latest` via `digestOptions.latest()` | Real | FLOWING |
| `timetable/page.tsx` | sessions + weeks + deadlines + courses | 4 endpoints via `Promise.allSettled` (parallel, consumer-parity queryKeys) | Real (no-week sessions matches client `useTimetableSessions()` call; weeks drives client's local state init) | FLOWING (parity verified: client uses `useSemesterWeeks`, `useTimetableSessions` no-arg, `useDeadlines`, `useCourses`) |

All 6 artifacts flow real data architecturally. The "skeleton flash" observable gate is a human visual check (human_verification #1).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase 38-01 unit tests pass | `cd frontend && pnpm vitest run __tests__/query/server.test.ts __tests__/rsc/create-prefetched-page.test.tsx __tests__/rsc/dashboard-prefetch.test.ts` | 14 tests passed (3 files) in 2.33s | PASS |
| Frontend typecheck clean | `cd frontend && pnpm typecheck` | Exit 0, no output | PASS |
| All 3 Phase 38 YAML workflows valid | `python3 -c "yaml.safe_load(...)"` on all three | `all-3-yaml-valid` | PASS |
| Dashboard waterfall invariant (≤2 awaited fetchQuery) | `grep -c "await.*\.fetchQuery\b" frontend/app/[locale]/(dashboard)/page.tsx` | 1 (well under limit) | PASS |
| Predict has exactly 1 awaited fetchQuery (N-source) | `grep -c "await.*\.fetchQuery\b" frontend/app/[locale]/(dashboard)/predict/page.tsx` | 1 | PASS |
| Other 4 pages (no blocking await — pure parallel) | `grep -c "await.*\.fetchQuery\b" courses/predict/digest/timetable/deadlines page.tsx` | 0 on courses/deadlines/digest/timetable | PASS |
| Sentry tag convention used across all 6 pages | `grep -c "wrapSentry(" <6 pages>` | 17 total (6/1/2/3/1/4) | PASS |
| No anti-patterns in any of the 6 pages | `grep -cE '"use client"\|useAuthStore\|headers: \{ Cookie' <6 pages>` | 0 on all 6 | PASS |
| Warmup cron disabled by default | `grep -E 'schedule:\|cron:' railway-warmup.yml` | Both lines begin with `# ` | PASS |
| Measurement workflow is dispatch-only | `grep "workflow_dispatch" railway-coldstart-measure.yml` | Present; no `schedule:` block | PASS |
| Migration idempotency markers | `grep -cE "ON CONFLICT\|BEGIN;\|COMMIT;\|RAISE NOTICE\|perf-test@uniboard.uk"` | 15 matches | PASS |
| ROADMAP 999.2 verdict rubric committed | `grep "obsolete\|retained" .planning/ROADMAP.md` | Lines 423-429 contain rubric | PASS |
| Playwright first-paint spec generates 6 tests | Loop over `PAGES` array (6 entries) in describe block | 6 test cases | PASS |

All 13 automated spot-checks pass. No spot-check skipped.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PERF-01 | 38-01, 38-02, 38-04 | First paint shows real data on Dashboard/Courses/Deadlines/Predict/Digest/Timetable for cached-auth revisits (no SkeletonCard flash) | NEEDS HUMAN | Automated: all 6 pages are RSC async components with HydrationBoundary + consumer-parity prefetch. Architecturally satisfied. Visual "no skeleton flash" confirmation gated on 38-04 Task 5 baseline capture (human_verification #1). |
| PERF-02 | 38-01 | Dashboard serial waterfall eliminated via server-side `Promise.all` | SATISFIED | Grep-verified: exactly 1 awaited fetchQuery in dashboard page.tsx (line 94); independent prefetches fire in parallel; `Promise.all` bridges nearest-course lookup (line 106); `courseOptions.detail` added to `Promise.allSettled` (line 132). Static-analysis test in `dashboard-prefetch.test.ts` enforces the invariant with stricter WR-02 regex (`\.fetchQuery\b`). |
| PERF-03 | 38-03 | Railway cold-start p50/p95 characterised; if p95 > 2s, warmup strategy implemented | NEEDS HUMAN | Infrastructure fully shipped (measurement script + on-demand workflow + conditional warmup workflow + report stub). Empirical measurement gated on human (`autonomous: false` plan explicitly designed this way — 150-min wall-clock loop + cost/benefit decision). See human_verification #2. |

No orphaned requirements — all 3 PERF IDs are accounted for across the 4 plans. REQUIREMENTS.md line 126-128 maps all three to Phase 38.

### Anti-Patterns Found

Scan scope: 23 files from REVIEW.md `files_reviewed_list`.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `frontend/tests/e2e/perf/coldstart.spec.ts` | 1 | `@ts-nocheck` comment + stale "pending P04 install" message | Info | Placeholder spec still self-gated via `test.skip(true, ...)`. IN-01 in REVIEW.md. Cleanup is post-phase hygiene, not a goal blocker. |
| `frontend/app/[locale]/(dashboard)/digest/page.tsx`, `predict/page.tsx`, `timetable/page.tsx` | Suspense wrappers | `<Suspense>` with no `fallback` prop | Info | Intentional per IN-02 design (RSC prefetch populates cache; missed prefetch falls through to component's internal loading state). Doc-only suggestion. |
| `frontend/lib/rsc/create-prefetched-page.tsx` | 65 | JSDoc says "returns nothing" but signature is `Promise<void>` | Info | Minor doc correctness (IN-03). No functional impact. |
| `frontend/lib/rsc/server-query-fn.ts` | 55 | `getServerApiClient` does not reject empty `accessToken` defensively | Info | Caller (`createPrefetchedPage`) already gates on non-null session (line 76). IN-04 is forward-compat hardening suggestion. |
| `.github/workflows/railway-coldstart-measure.yml` | 93-95 | p50 index math picks lower-median for even N | Info | N=10 default is odd in percentile terms; IN-05 edge case only relevant for manual N=2 invocations. |
| `supabase/migrations/20260420000001_phase38_perf_test_seed.sql` | 189-193 | `ON CONFLICT DO UPDATE SET` omits `dedup_key` | Info | Fixture dedup_keys are phase-38-scoped strings (cannot collide). IN-06 is idempotency-over-non-clean-state hardening suggestion. |

**Blocker count: 0. Warning count: 0 (WR-01 and WR-02 already fixed — see 38-REVIEW-FIX.md commits `0b20ac8` and `2d06f0a`). Info count: 6 (all non-blocking, documented in REVIEW.md for future cleanup).**

No TODO/FIXME/placeholder comments indicating incomplete implementation. No hardcoded empty data in render paths (the only empty-array defaults are `courseIds: string[] = []` in Predict's try/catch fallback — legitimate silent-degrade behavior per D-B4).

### Human Verification Required

Three items require human action — each is an explicitly-designed `autonomous: false` checkpoint, not an unplanned gap.

#### 1. Visual confirmation: no SkeletonCard flash across 6 pages (PERF-01 + SC#2)

**Test:**
- Start `cd frontend && pnpm dev` (port 3001)
- Sign in as any test user with cached Supabase session
- Navigate in order: `/zh-CN/`, `/zh-CN/courses`, `/zh-CN/deadlines`, `/zh-CN/predict`, `/zh-CN/digest`, `/zh-CN/timetable`
- On each first-paint frame, observe that real data (course cards, deadline rows, donut chart, digest placeholder copy) is visible — no `SkeletonCard` is visible to the naked eye
- (Preferred) Follow 38-04 Task 5 Steps 1-8 to generate + commit pixel-diff baselines as automated dual-verification

**Expected:** All 6 pages render real data on first paint. The automated pixel-diff (`pnpm exec playwright test first-paint`) goes green after baselines are captured.

**Why human:** Success Criterion #2 is literally "no skeleton flash visible to the naked eye". The Playwright pixel-diff suite (38-04) is the scaffolded automation, but baseline generation requires live credentials (`PERF_TEST_PASSWORD`, `perf-test@uniboard.uk` Supabase user, applied fixture migration) that are explicitly deferred to the 38-04 Task 5 human checkpoint by design (`autonomous: false`).

#### 2. Run cold-start measurement + fill coldstart-report.md + warmup decision (PERF-03 + SC#4)

**Test:**
- Confirm `NEXT_PUBLIC_API_URL` is set as a GitHub Actions secret (Settings → Secrets and variables → Actions)
- GitHub → Actions → "Railway Cold-Start Measurement" → Run workflow (default inputs N=10, IDLE=15)
- Wait ~150 min. Download `samples.txt` artifact from the workflow run page.
- Edit `.planning/phases/38-first-load-performance/coldstart-report.md`:
  - Replace 10 TBD rows with real sample values
  - Fill p50 and p95 numeric values
  - Check exactly ONE decision box (warmup NOT enabled if p95 ≤ 2000ms, warmup ENABLED if p95 > 2000ms)
- If p95 > 2000ms: edit `.github/workflows/railway-warmup.yml` — uncomment both `# schedule:` and `#   - cron: "*/10 * * * *"`. Commit as `chore(38-03): enable railway warmup cron (p95=<value>ms)`.

**Expected:** `coldstart-report.md` contains real 10 samples + p50/p95 + decision checkbox. If warmup enabled, `railway-warmup.yml` schedule block is uncommented.

**Why human:** Plan 38-03 is explicitly `autonomous: false`. The 150-min wall-clock measurement loop cannot run inside an autonomous executor session (exceeds stream watchdog budget), and the warmup cost/benefit decision requires human judgement. Infrastructure is 100% in place; only the empirical measurement is pending.

#### 3. Flip ROADMAP §Backlog 999.2 verdict from provisional to final (SC#5)

**Test:**
- After human_verification #1 baselines are captured and 6-page pixel-diff is green:
  - Inspect each baseline PNG (open with default image viewer)
  - Apply 3-branch rubric at ROADMAP.md lines 427-429:
    - 0 of 6 show skeleton pixels → edit status to `obsolete — superseded by Phase 38 RSC prefetch`
    - Specific sub-region still flashes → edit status to `retained + residual case: <describe>`
    - Hero card flashes despite RSC → treat as Phase 38 bug, file gap-closure plan
- Commit: `docs(38-04): close ROADMAP Backlog 999.2 as <obsolete|retained>`

**Expected:** ROADMAP.md §Backlog 999.2 status line updated from provisional `retained — pending final UAT sign-off` to a final verdict matching the rubric.

**Why human:** The final obsolete/retained decision requires observing the post-ship baselines, which are human_verification #1 artifacts. The rubric is committed and ready; only the empirical observation + verdict text is pending.

### Deferred Items

None. All three human items are gated on human checkpoints designed into the phase plans themselves (38-03 Task 4 + 38-04 Task 5), not deferred to later phases.

### Gaps Summary

**No gaps blocking goal achievement in automated scope.**

All 7 automatable must-haves are VERIFIED. The 3 non-automatable items map to the explicit `autonomous: false` human checkpoints that the phase was intentionally designed with — they are not executor-time failures but scheduled human action items:

1. **38-04 Task 5 checkpoint** (credential + baseline capture + visual confirm + ROADMAP 999.2 verdict flip): addresses human_verification #1 and #3.
2. **38-03 Task 4 checkpoint** (150-min measurement run + warmup activation decision): addresses human_verification #2.

The phase has shipped everything an autonomous executor could ship:
- 3 infrastructure pieces (server QC factory, createPrefetchedPage HOF, getServerApiClient) — verified via 14 passing tests.
- 6 page rewrites across 2 waves — all using HydrationBoundary + consumer-parity queryKeys (3 parity-corrected deviations documented in 38-02 SUMMARY).
- Dashboard waterfall collapse — grep-enforced invariant, exactly 1 awaited fetchQuery + Promise.all bridge.
- Cold-start infrastructure — zero-dep Node 22 script + workflow_dispatch measurement + conditional warmup (dormant).
- Playwright pixel-diff harness — config + spec + helpers + fixture migration + CI job + ROADMAP rubric.
- 2 code review findings (WR-01 host-header trust, WR-02 waterfall regex scoping) fixed in review-fix iteration.

Status is `human_needed` (not `passed`) because the developer-facing observable conditions (visible no-skeleton-flash, empirical cold-start p95) require live execution that the executor cannot perform. Once the 3 human checkpoints complete, re-running `/gsd-verify-work 38` should promote status to `passed` with no automated regressions.

---

*Verified: 2026-04-21T16:45:00Z*
*Verifier: Claude (gsd-verifier)*
