---
phase: 38-first-load-performance
plan: 02
subsystem: frontend-rsc
tags: [ssr, rsc-prefetch, hydration, n-fanout, wave-parallel]

requires:
  - phase: 38
    plan: 01
    provides: createPrefetchedPage HOF, wrapSentry helper, getServerApiClient, server QueryClient factory
provides:
  - Courses page.tsx as async RSC prefetching /courses
  - Deadlines page.tsx as async RSC prefetching /deadlines + /courses in parallel
  - Predict page.tsx as async RSC with full N-fanout (/gpa + N × /courses/{id} + N × /courses/{id}/roi)
  - Digest page.tsx as async RSC prefetching /digest/latest
  - Timetable page.tsx as async RSC prefetching /timetable/sessions + /timetable/weeks + /deadlines + /courses in parallel
affects: [38-04, first-load-performance-6-page-scope-complete]

tech-stack:
  added: []
  patterns:
    - Single-query RSC baseline (Courses, Digest)
    - Multi-query parallel RSC (Deadlines, Timetable) via Promise.allSettled
    - N-fanout RSC (Predict) — 1 await + 2N parallel prefetches in single Promise.allSettled
    - Per-file response-shape aliases rederived from openapi paths
    - Consumer-parity-first queryKey selection (overrides plan text when client uses different hook)

key-files:
  created: []
  modified:
    - frontend/app/[locale]/(dashboard)/courses/page.tsx
    - frontend/app/[locale]/(dashboard)/deadlines/page.tsx
    - frontend/app/[locale]/(dashboard)/predict/page.tsx
    - frontend/app/[locale]/(dashboard)/digest/page.tsx
    - frontend/app/[locale]/(dashboard)/timetable/page.tsx

key-decisions:
  - "Predict N-source = gpaOptions.report() not courseOptions.list — PredictPage.tsx consumes gpaReport.data.data.courses for N, so hydrating /gpa is what populates the client-visible course list. Client separately reads /courses via useCourses only in subtrees not shown by Predict's primary render."
  - "Deadlines prefetches deadlineOptions.list() not upcoming() — DeadlinesPage.tsx uses useDeadlines() with no filters (queryKey [deadlines,list,undefined]). Plan text suggested upcoming(); consumer parity is the binding constraint (mismatched queryKey = SkeletonCard flash, defeating success criterion #2)."
  - "Timetable prefetches timetableOptions.sessions() with NO week arg — TimetablePage.tsx calls useTimetableSessions() with no week (queryKey [timetable,sessions,undefined]). A server-side computeCurrentWeek would be dead code since client's computeCurrentWeek(weeks) drives only local state (weekPosition) not the queryKey. Plan text assumed week-parameterised queryKey; actual consumer is week-less."
  - "/courses/{id}/roi is not in openapi types.gen — useRoi hook defines an inline SuccessResponse<CourseROIResponse> envelope. Server page mirrors this envelope locally so queryFn return types match the consumer byte-for-byte."

patterns-established:
  - "Consumer-parity rule: when plan text suggests a queryKey that differs from what the client hook emits, prefer the client's queryKey and document the deviation. Mismatched keys are cache misses and defeat the whole prefetch invariant."
  - "Response-shape alias locality: each page rederives aliases from openapi paths[...] rather than sharing a barrel export — keeps per-file context complete and matches the hook convention."
  - "N-source selection: for N-fanout pages, prefetch whichever endpoint the N-consumer actually reads, not whichever endpoint appears canonical. PredictPage reads /gpa-derived courses, so /gpa is the N-source."

requirements-completed:
  - PERF-01

duration: ~5min wall-clock
completed: 2026-04-21
---

# Phase 38 Plan 02: Remaining 5 Pages RSC Prefetch — Summary

**Converted the remaining 5 dashboard pages (Courses, Deadlines, Predict, Digest, Timetable) to the RSC prefetch + HydrationBoundary pattern established by P01, adopting consumer-parity-first queryKey selection over plan-text suggestions in 3 of 5 pages to preserve hydration correctness.**

## Performance

- **Duration:** ~5 min wall-clock
- **Tasks:** 5 (all `type="execute"`, file-isolated no-conflict)
- **Files modified:** 5
- **Verification:** `pnpm typecheck` clean; `pnpm lint --max-warnings 0` clean across entire frontend.

## Per-Page Rationale

| Page | Pattern | Rationale |
|------|---------|-----------|
| **Courses** | Single-query baseline | D-B2 critical path = `/courses` only (grades summary embedded in response). |
| **Deadlines** | 2-query parallel `Promise.allSettled` | `/courses` (color mapping) + `/deadlines` (list — matches consumer's `useDeadlines()`). D-B4 silent degrade. |
| **Predict** | Full N-fanout per D-B3 | Step 1: `await fetchQuery` on `/gpa` (N source). Step 2: ALL N × `/courses/{id}` + ALL N × `/courses/{id}/roi` in ONE `Promise.allSettled`. No cap, no batching. |
| **Digest** | Single-query baseline | D-B2 critical path = `/digest/latest` only. Inner `<Suspense>` preserved. |
| **Timetable** | 4-query parallel `Promise.allSettled` | `/timetable/sessions` (no week) + `/timetable/weeks` + `/deadlines` + `/courses` — matches consumer's four `useX()` hook calls. |

## Predict N-source Decision

**Chosen:** `gpaOptions.report()`, not `courseOptions.list()`.

Reading `frontend/components/predict/PredictPage.tsx` confirmed the consumer sources N from `gpaReport.data?.data.courses ?? []` (line 68). Each course has `course_id: string`. The subsequent `useQueries({ queries: courses.map(c => courseOptions.detail(c.course_id)) })` uses that same list to fan out detail and ROI queries. Therefore the server-side N-source must be `/gpa`, mirrored via `fetchQuery({ ...gpaOptions.report(), queryFn: ... })`, and the fanout uses `gpaReport.data.courses.map(c => c.course_id)`.

This does mean `courseOptions.list()` is NOT prefetched for the Predict page (it is for Courses, Deadlines, Timetable). Consumer parity: `PredictPage.tsx` never calls `useCourses()`, only `useGpaReport` + `useQueries(courseOptions.detail(c.course_id))` — so a `/courses` prefetch on Predict would be dead weight.

## Timetable computeCurrentWeek Decision

**Chosen:** do NOT compute current week server-side; do NOT extract to a shared utility.

The plan's Task 5 assumed `useTimetableSessions(week)` is called with a week argument so the queryKey is week-parameterised. Reading `TimetablePage.tsx` (line 58) shows the actual call is `useTimetableSessions()` with NO week argument — queryKey `["timetable", "sessions", undefined]`. The existing `computeCurrentWeek(weeks: SemesterWeek[])` function (TimetablePage.tsx line 30) takes the weeks array and is used only to initialise local state (`setWeekPosition` at line 103) AFTER `/timetable/weeks` resolves. It does NOT alter the sessions queryKey.

Therefore:
- A server-side `computeCurrentWeek(new Date())` would need a different signature (different computation — semester-agnostic vs semester-aware) and would produce a value that is never used to drive a queryKey.
- Extracting the existing `computeCurrentWeek` to a shared util would serve no server-side purpose.

Server instead prefetches `/timetable/weeks` directly. Client's initialisation effect (line 102) hydrates from that prefetched data and computes `weekPosition` on first render without a network round-trip. This achieves the plan's intent (no skeleton flash) via hydration parity rather than server-side computation.

## QueryKey Parity Notes

Three pages deviate from plan-text queryKeys in favour of consumer parity:

| Page | Plan text | Consumer hook | Server prefetch (parity-correct) |
|------|-----------|---------------|----------------------------------|
| Deadlines | `deadlineOptions.upcoming()` | `useDeadlines()` = `deadlineOptions.list()` | `deadlineOptions.list()` |
| Timetable | `timetableOptions.sessions(currentWeek)` + `deadlineOptions.upcoming()` | `useTimetableSessions()` + `useDeadlines()` | `timetableOptions.sessions()` + `deadlineOptions.list()` |
| Predict | `courseOptions.list` | `useGpaReport` (N-source) | `gpaOptions.report()` |

Each deviation is documented inline in the page's file header comment.

## Task Commits

1. **Task 1:** `c81f4f0` — `feat(38-02): convert Courses page.tsx to RSC prefetch + HydrationBoundary`
2. **Task 2:** `48f0fe1` — `feat(38-02): convert Deadlines page.tsx to RSC prefetch + HydrationBoundary`
3. **Task 3:** `51150cc` — `feat(38-02): convert Predict page.tsx to RSC prefetch (full N-fanout per D-B3)`
4. **Task 4:** `d6c80ee` — `feat(38-02): convert Digest page.tsx to RSC prefetch + HydrationBoundary`
5. **Task 5:** `b8f540e` — `feat(38-02): convert Timetable page.tsx to RSC prefetch + HydrationBoundary`

## wrapSentry Helper Reuse

All 5 pages import `wrapSentry` from `@/lib/rsc/create-prefetched-page` (P01's module). No re-implementation. Tag labels used:

| Page | wrapSentry labels |
|------|-------------------|
| Courses | `courses` |
| Deadlines | `courses`, `deadlines-list` |
| Predict | `gpa`, `course-detail` (per courseId), `roi` (per courseId) |
| Digest | `digest-latest` |
| Timetable | `timetable-sessions`, `timetable-weeks`, `deadlines-list`, `courses` |

Sentry event shape per P01 contract: `tags: { phase: "38", operation: "rsc_prefetch", query: <label> }`, `extra: { userId, ...extraFields }`.

## Deviations from Plan

### Deviation 1 — Deadlines: prefetch `list()` not `upcoming()`

- **Rule applied:** Rule 1 (Bug — queryKey mismatch causes SkeletonCard flash, defeating success criterion #2)
- **Found during:** Task 2 — reading `DeadlinesPage.tsx` per `<read_first>` block.
- **Issue:** Plan text suggests `deadlineOptions.upcoming()`. Client uses `useDeadlines()` (no filters) which maps to `deadlineOptions.list()` (queryKey `["deadlines", "list", undefined]`). Prefetching `upcoming()` populates a DIFFERENT cache entry that the client never reads — client renders skeleton, hydration is wasted.
- **Fix:** Prefetch `deadlineOptions.list()` instead. Inline comment explains the parity reasoning.
- **Files modified:** `frontend/app/[locale]/(dashboard)/deadlines/page.tsx`
- **Commit:** `48f0fe1`

### Deviation 2 — Timetable: drop `computeCurrentWeek`, prefetch `list()` + `sessions()` no-week

- **Rule applied:** Rule 1 (Bug — queryKey mismatch)
- **Found during:** Task 5 — reading `TimetablePage.tsx`.
- **Issue:** Plan text assumed week-parameterised sessions queryKey and suggested server-side `computeCurrentWeek(new Date())`. Actual consumer: `useTimetableSessions()` no-arg → queryKey `["timetable", "sessions", undefined]`. Existing `computeCurrentWeek(weeks)` in `TimetablePage.tsx` takes the weeks array and drives only local state (`weekPosition`), not a queryKey.
- **Fix:** Prefetch `timetableOptions.sessions()` (no week) to match client key. Prefetch `timetableOptions.weeks()` additionally so client's init effect can compute `weekPosition` from hydrated data. Also swap `deadlineOptions.upcoming()` → `list()` for same parity reason.
- **Files modified:** `frontend/app/[locale]/(dashboard)/timetable/page.tsx`
- **Commit:** `b8f540e`

### Deviation 3 — Predict: N-source is `/gpa` not `/courses`

- **Rule applied:** Rule 2 (Critical functionality — wrong N-source means fanout prefetches course IDs the consumer never uses)
- **Found during:** Task 3 — reading `PredictPage.tsx`.
- **Issue:** Plan text offers a choice between `courseOptions.list` and `gpaOptions.report`; reading the consumer confirmed `useGpaReport` is the authoritative N-source (line 68 of `PredictPage.tsx`). `useQueries({ queries: courses.map(c => courseOptions.detail(c.course_id)) })` at line 77-79 uses GPA-derived course_ids. `useCourses` is never called in PredictPage.
- **Fix:** Server prefetches `/gpa` as the single blocking fetch, reads `gpaReport.data.courses.map(c => c.course_id)` for the fanout set. Also defines a local `CourseRoiResponse = { data: CourseROIResponse, meta: ... }` envelope because `/courses/{id}/roi` is not in `types.gen.d.ts` — mirrors the hook's inline `SuccessResponse<CourseROIResponse>` type verbatim.
- **Files modified:** `frontend/app/[locale]/(dashboard)/predict/page.tsx`
- **Commit:** `51150cc`

## Verification Evidence

| Gate | Result |
|------|--------|
| `cd frontend && pnpm typecheck` | Clean (exit 0) |
| `cd frontend && pnpm lint --max-warnings 0` | Clean (exit 0) |
| 5 pages contain `createPrefetchedPage` | Pass (grep audit) |
| 5 pages contain `"use client"`: NONE | Pass |
| 5 pages contain `useAuthStore`: NONE | Pass |
| 5 pages forward `Cookie` header: NONE | Pass |
| 5 pages `export const dynamic = "force-dynamic"` | Pass |
| Predict: `courseIds.map` present | Pass (2 occurrences — detail fanout + roi fanout) |
| Predict: exactly 1 `await fetchQuery` | Pass |
| Predict: `courseOptions.detail` + `roiOptions.course` | Pass |
| Predict: `Promise.allSettled` | Pass |
| Predict + Digest + Timetable: inner `<Suspense>` preserved | Pass |
| `wrapSentry` imported from P01, not re-implemented | Pass (all 5 files import from `@/lib/rsc/create-prefetched-page`) |

## Manual Smoke — Status

Manual smoke (visit each of 5 pages on `pnpm dev` with a seeded user, confirm no SkeletonCard flash on cached-auth revisit) is **not yet executed** in this worktree. The success criteria for this plan include a naked-eye visual check; that will be covered by Phase 38 Plan 04 (Playwright screenshot-diff suite). Wave-2 executor completes the code conversion; Wave-3 (P04) delivers the visual regression harness.

Preconditions for manual smoke (documented for the orchestrator / verifier):
- `pnpm install` run in `frontend/` (done in this worktree)
- `pnpm dev` from `frontend/` on port 3001
- Test account signed in (cookie cached in the Supabase client)
- Navigate: `/zh-CN/courses`, `/zh-CN/deadlines`, `/zh-CN/predict`, `/zh-CN/digest`, `/zh-CN/timetable`
- Expected: each page renders data on first paint, no SkeletonCard frames visible to the eye

## Handoff Notes

- **For P04 (Playwright perf suite):** All 5 pages now rely on same-origin loopback to `/api/v1/*` with `Authorization: Bearer <access_token>`. Playwright's time-freeze + fixture seed must hit the 5 pages POST-auth; page-level `export const dynamic = "force-dynamic"` ensures Next.js does not attempt static generation of user-specific data.
- **Orchestrator:** Three of five pages deviate from the plan's literal acceptance-criteria grep strings (`deadlineOptions.upcoming`, `computeCurrentWeek`, etc.) in favour of consumer parity. The verifier should evaluate against the parity-corrected acceptance (contains EITHER `upcoming` OR `list` for deadline; `computeCurrentWeek` absent in timetable is correct). Inline comments in each file explain the deviation.
- **Future:** If Predict's cold-start p95 > 2s per P03 measurement, warmup cron mitigates (D-A5 fallback). If `/courses/{id}/roi` is added to `openapi.yaml` in a later phase, the local `CourseRoiResponse` envelope in `predict/page.tsx` should be swapped to `paths["/courses/{id}/roi"][...]` and `CourseROIResponse` import from the hook removed.

## Self-Check: PASSED

All 5 modified `page.tsx` files exist on disk. All 5 task commits (`c81f4f0`, `48f0fe1`, `51150cc`, `d6c80ee`, `b8f540e`) present in `git log`. `pnpm typecheck` and `pnpm lint --max-warnings 0` both exit 0.
