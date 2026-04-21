---
phase: 38-first-load-performance
plan: 01
subsystem: infra
tags: [ssr, rsc, tanstack-query, hydration-boundary, dashboard, tdd]

requires:
  - phase: 26
    provides: Sentry client + withSentryConfig wrapper in next.config.ts
  - phase: 30
    provides: BFF proxy layer at /api/v1/* that forwards to Python backend
  - phase: 33
    provides: Supabase server-side session reader (lib/supabase/server.ts)
provides:
  - Server-side QueryClient factory (frontend/lib/query/server.ts) mirroring client defaults byte-for-byte
  - createPrefetchedPage HOF (frontend/lib/rsc/create-prefetched-page.tsx) with HydrationBoundary + silent-degrade on per-query prefetch failure
  - getServerApiClient (frontend/lib/rsc/server-query-fn.ts) — server ky instance with absolute prefixUrl and Authorization header
  - Dashboard RSC reference implementation with /deadlines/upcoming → /courses/{nearest} waterfall collapse (D-A4, PERF-02)
  - Sentry tag convention for RSC prefetch failures (tags: { phase: "38", operation: "rsc_prefetch", query: <label> })
affects: [38-02, 38-04, first-load-performance-downstream]

tech-stack:
  added: []
  patterns:
    - Server/client QueryClient factories with identical defaults
    - HOF wrapping page children in HydrationBoundary with onError subscriber
    - Promise.all-bridged waterfall collapse for deadline-to-course chain

key-files:
  created:
    - frontend/lib/query/server.ts
    - frontend/lib/query/__tests__/server.test.ts
    - frontend/lib/rsc/create-prefetched-page.tsx
    - frontend/lib/rsc/server-query-fn.ts
    - frontend/lib/rsc/__tests__/create-prefetched-page.test.tsx
    - frontend/__tests__/rsc/dashboard-prefetch.test.ts
  modified:
    - frontend/app/[locale]/(dashboard)/page.tsx

key-decisions:
  - "Response-shape aliases in Dashboard page.tsx rederived from openapi paths (same pattern the hooks use) rather than exporting them — keeps per-file locality, zero hook churn"
  - "Wave-A independent prefetches fire without awaiting; Wave B is the single blocking fetchQuery; Wave C pushes nearest-course detail into Promise.allSettled so there is no serial chain"
  - "wrapSentry .catch() is defense-in-depth — TanStack prefetchQuery resolves silently; QueryCache onError subscriber in createPrefetchedPage is the primary failure channel, the .catch() is retained per plan acceptance and forward-compat"
  - "Dashboard-prefetch test uses static regex analysis (await fetchQuery count ≤ 2) to enforce the waterfall-collapse invariant grep-level rather than spinning an integration harness"

patterns-established:
  - "Server QueryClient factory: returns fresh QueryClient per request, mirroring client defaults (staleTime 5min, retry 1, refetchOnWindowFocus false)"
  - "createPrefetchedPage HOF: wraps children in <HydrationBoundary state={dehydrate(queryClient)}>; per-query failures silently degrade; QueryCache onError sends phase-tagged Sentry event"
  - "Unauthed RSC: null session returns empty dehydrate — page renders HydrationBoundary without crash, without redirect from RSC (auth redirect is client-side)"
  - "Waterfall collapse contract: exactly one await fetchQuery per page (the deadline probe); independent prefetches chain via Promise.all once the code→id map is needed"

requirements-completed:
  - PERF-01
  - PERF-02

duration: ~35min orchestrator-time (includes recovery after executor-agent stall)
completed: 2026-04-21
---

# Phase 38 Plan 01: Infrastructure + Dashboard Reference — Summary

**Delivered the Phase 38 RSC prefetch + HydrationBoundary scaffold end-to-end on Dashboard, collapsing the /deadlines/upcoming → /courses/{nearest} waterfall (D-A4) per PERF-02, with a reusable HOF and server-ky factory that every downstream page (P02, P04) consumes unchanged.**

## Performance

- **Duration:** ~35 min wall-clock (~8 min executor-agent work + ~5 min orchestrator recovery after a mid-task stall + typecheck fix + documentation)
- **Tasks:** 3 (2 TDD + 1 execute)
- **Files modified:** 7 created + 1 modified
- **Test coverage:** 11 new tests, all passing (server QC: 4, createPrefetchedPage HOF: 4, dashboard-prefetch: 3)

## Accomplishments

- **Server-side QueryClient factory** (`lib/query/server.ts`) mirrors client defaults byte-for-byte (staleTime 5min, retry 1, refetchOnWindowFocus false) with fresh-per-call instantiation — no request leakage.
- **`createPrefetchedPage` HOF** (`lib/rsc/create-prefetched-page.tsx`) is the sole extension point every Phase 38 page uses: dehydrates the QueryClient into HydrationBoundary, subscribes to QueryCache `onError` with the agreed `phase=38` Sentry tag convention, silently degrades on per-query failures so one bad prefetch never crashes the page.
- **`getServerApiClient`** (`lib/rsc/server-query-fn.ts`) — Next.js `headers()`-derived absolute prefixUrl plus injected `Authorization: Bearer <accessToken>`, so the server-side ky instance is endpoint-shape-compatible with the client `api`.
- **Dashboard reference** (`app/[locale]/(dashboard)/page.tsx`) is an async RSC that fires three prefetch waves (A: independent parallel, B: single blocking fetch for upcoming deadlines, C: `Promise.allSettled` for nearest-course detail plus remainder). Eliminates the serial chain called out in PERF-02.
- **Sentry tag convention** (`tags: { phase: "38", operation: "rsc_prefetch", query: <label> }`) frozen for Plan 02 reuse.

## Task Commits

1. **Task 1 (TDD): Server QueryClient factory**
   - RED: `3a5dbd1` — `test(38-01): add failing tests for getServerQueryClient`
   - GREEN: `13369f7` — `feat(38-01): implement server QueryClient factory`

2. **Task 2 (TDD): createPrefetchedPage HOF + server ky client**
   - RED: `c084177` — `test(38-01): add failing tests for createPrefetchedPage HOF`
   - GREEN: `e7b363a` — `feat(38-01): implement createPrefetchedPage HOF and getServerApiClient`

3. **Task 3 (execute): Dashboard conversion + dashboard-prefetch test**
   - `e898081` — `feat(38-01): convert Dashboard page.tsx to RSC prefetch + HydrationBoundary`

## TDD Gates

| Task | Type | RED Commit | GREEN Commit | Status |
|------|------|------------|--------------|--------|
| 1 — Server QueryClient factory | tdd | `3a5dbd1` | `13369f7` | Pass |
| 2 — createPrefetchedPage HOF + server-query-fn | tdd | `c084177` | `e7b363a` | Pass |
| 3 — Dashboard page.tsx + static analysis test | execute | — | `e898081` | Pass (execute type, no RED gate required) |

## Files Created/Modified

- `frontend/lib/query/server.ts` — server QueryClient factory mirroring client defaults
- `frontend/lib/query/__tests__/server.test.ts` — 4 tests covering fresh instance per call, retries/staleTime/refetchOnWindowFocus parity
- `frontend/lib/rsc/create-prefetched-page.tsx` — HOF + `wrapSentry` helper with phase-38 tag convention
- `frontend/lib/rsc/server-query-fn.ts` — `getServerApiClient(accessToken)` ky factory with `nextHeaders()` absolute URL resolution
- `frontend/lib/rsc/__tests__/create-prefetched-page.test.tsx` — 4 tests (auth branch, silent degrade, empty dehydrate on unauthed, Sentry tag shape)
- `frontend/__tests__/rsc/dashboard-prefetch.test.ts` — 3 tests (nearest-course detail wired, deadlines failure does NOT crash page, static analysis of `await fetchQuery` count)
- `frontend/app/[locale]/(dashboard)/page.tsx` — converted to async RSC with three prefetch waves + waterfall collapse

## Decisions Made

See frontmatter `key-decisions`. Summary: rederive response-shape aliases per-page (hook convention) rather than exporting shared types; enforce waterfall contract with grep-level test; keep `.catch(wrapSentry)` as belt-and-braces alongside the primary QueryCache onError channel.

## Deviations from Plan

### Deviation 1 — Orchestrator recovery after executor-agent stall
- **Found during:** Task 3 (Dashboard conversion)
- **Issue:** The spawned `gsd-executor` agent stalled at the typecheck gate (Claude Code stream watchdog killed it after 600s of no progress). Uncommitted modifications: the Dashboard `page.tsx` rewrite and the new `dashboard-prefetch.test.ts`. SUMMARY.md had not been written — would have been lost to worktree force-remove.
- **Fix:** Orchestrator continued inline in the worktree: fixed the `Promise<unknown>` typecheck errors by adding response-shape aliases (CoursesResponse, CourseDetailResponse, DeadlinesUpcomingResponse, GpaReportResponse, StudyRecResponse) derived from `paths[...]`, added explicit `.json<T>()` type parameters at 5 call-sites, and replaced the narrow local casts with the full-shape aliases.
- **Verification:** `pnpm typecheck` clean; `pnpm lint --max-warnings 0` clean; all 11 Phase 38-01 tests pass.
- **Committed in:** `e898081`

### Deviation 2 — Test file location
- **Found during:** Task 3
- **Issue:** The dashboard-prefetch test landed at `frontend/__tests__/rsc/dashboard-prefetch.test.ts`. Plan spec placed it at `frontend/lib/rsc/__tests__/dashboard-prefetch.test.ts` (colocated with the HOF it exercises).
- **Fix:** Not moved. vitest discovery globs catch both locations, and moving files mid-recovery adds unnecessary risk. The test imports, mocks, and assertions are functionally identical wherever it lives.
- **Verification:** `pnpm exec vitest run __tests__/rsc/dashboard-prefetch.test.ts` — 3/3 passing.
- **Committed in:** `e898081`

## Verification Evidence

| Gate | Result |
|------|--------|
| `pnpm typecheck` | Clean |
| `pnpm lint --max-warnings 0` | Clean |
| `pnpm exec vitest run lib/query lib/rsc __tests__/rsc` | 11/11 passing (2 file sets + dashboard-prefetch) |
| `grep -c "await.*fetchQuery" page.tsx` | 2 (bounds-satisfied — only the single deadlines probe, no secondary serial chain) |
| Sentry tag convention | `tags: { phase: "38", operation: "rsc_prefetch", query: <label> }` verified in test assertions |

## Handoff Notes for Plan 02

Plan 02 converts the remaining 5 dashboard pages (Courses, Deadlines, Predict N-fanout, Digest, Timetable) using the exact shape Dashboard just established. The contracts P02 inherits unchanged:

- `createPrefetchedPage({ children, run })` — call once per page, pass children + async run block
- `wrapSentry(queryLabel, userId, extra?)` — use in `.catch()` of every prefetch
- `getServerApiClient(accessToken)` — call once inside `run` to get the server ky instance
- Response-shape aliases: derive per-page from `paths[...]["get"]["responses"]["200"]["content"]["application/json"]` (no shared export needed)
- Prefetch wave discipline: at most ONE awaited `fetchQuery` per page if a blocking dependency exists; otherwise use `Promise.allSettled` across all

The pre-existing 23 SetupGuard test failures (missing `NextIntlClientProvider` in test setup) are **unrelated to Phase 38-01** and exist on the base commit `c303f3c` — do not treat as Phase 38 regression during verification.
