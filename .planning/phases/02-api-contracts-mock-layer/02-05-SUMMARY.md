---
phase: 02-api-contracts-mock-layer
plan: 05
subsystem: api
tags: [tanstack-query, react-hooks, ky, zustand, typescript, openapi]

# Dependency graph
requires:
  - phase: 02-api-contracts-mock-layer (plan 01)
    provides: types.gen.d.ts, ky client, auth store, QueryProvider
provides:
  - 12 TanStack Query v5 hooks covering all data domains
  - Query key factories for type-safe cache invalidation
  - queryOptions factories for prefetching and reusable configs
  - Wave 0 hooks test validating useCourses with QueryClient wrapper
affects: [03-dashboard, 04-course-detail, 05-grades, 06-deadlines, 07-gpa, 08-digest, 09-predict, 10-materials, 11-discussions, 12-settings]

# Tech tracking
tech-stack:
  added: []
  patterns: [query-key-factory, queryOptions-factory, thin-hook-wrappers, vi-hoisted-mock]

key-files:
  created:
    - frontend/hooks/use-auth.ts
    - frontend/hooks/use-courses.ts
    - frontend/hooks/use-grades.ts
    - frontend/hooks/use-deadlines.ts
    - frontend/hooks/use-gpa.ts
    - frontend/hooks/use-digest.ts
    - frontend/hooks/use-materials.ts
    - frontend/hooks/use-discussions.ts
    - frontend/hooks/use-notifications.ts
    - frontend/hooks/use-sync.ts
    - frontend/hooks/use-search.ts
    - frontend/hooks/use-user.ts
    - frontend/__tests__/hooks/use-courses.test.ts
  modified: []

key-decisions:
  - "All hooks follow keys-factory -> queryOptions-factory -> thin-wrapper pattern for consistency"
  - "useSearch enabled guard at q.length >= 2 to prevent empty API calls"
  - "Auth mutations use useAuthStore.getState() (not hook) since callbacks run outside render"
  - "useExportData uses enabled: false for on-demand fetching pattern"

patterns-established:
  - "Query key factory: xxxKeys.all -> lists() -> list(filters) -> details() -> detail(id)"
  - "queryOptions factory: xxxOptions.list/detail wrapping queryOptions() for reuse with prefetch"
  - "Mutation with cache invalidation: onSuccess calls queryClient.invalidateQueries()"
  - "Hook test pattern: vi.hoisted() + createWrapper() with fresh QueryClient (retry: false)"

requirements-completed: [INFRA-11]

# Metrics
duration: 4min
completed: 2026-03-21
---

# Phase 02 Plan 05: TanStack Query Hooks Summary

**12 domain hooks with query key factories and queryOptions factories covering auth, courses, grades, deadlines, GPA, digest, materials, discussions, notifications, sync, search, and user management**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-21T01:56:15Z
- **Completed:** 2026-03-21T01:59:46Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Created 12 hook files covering every data domain that page phases (3-12) will consume
- Each hook exports query key factory, queryOptions factory, and thin hook wrappers with typed responses
- Auth hooks integrate with zustand store for login/logout state management
- Wave 0 hooks test validates useCourses with QueryClient wrapper and ky mock

## Task Commits

Each task was committed atomically:

1. **Task 1: Create all domain hooks with query key factories** - `8bc2e32` (feat)
2. **Task 2: Create Wave 0 hooks test for use-courses** - `cddaa33` (test)

## Files Created/Modified
- `frontend/hooks/use-auth.ts` - Auth mutations: login, register, logout, refresh token
- `frontend/hooks/use-courses.ts` - Course queries: list (with semester filter) and detail
- `frontend/hooks/use-grades.ts` - Grade query by course ID
- `frontend/hooks/use-deadlines.ts` - Deadline queries with date/course filters and upcoming
- `frontend/hooks/use-gpa.ts` - GPA report query + predict/path mutations with cache invalidation
- `frontend/hooks/use-digest.ts` - Digest latest and history with cursor pagination
- `frontend/hooks/use-materials.ts` - Materials by course with optional source filter
- `frontend/hooks/use-discussions.ts` - Discussions by course with filter/cursor/limit
- `frontend/hooks/use-notifications.ts` - Notifications with unread filter + alerts
- `frontend/hooks/use-sync.ts` - Sync status query + trigger mutation
- `frontend/hooks/use-search.ts` - Search with enabled guard (q >= 2 chars)
- `frontend/hooks/use-user.ts` - User profile, token CRUD, account deletion, data export
- `frontend/__tests__/hooks/use-courses.test.ts` - Wave 0 hooks test (7 test cases)

## Decisions Made
- All hooks follow a consistent 3-layer pattern: keys factory, queryOptions factory, thin hook wrappers
- Auth mutations access zustand via `useAuthStore.getState()` (not the hook) since mutation callbacks run outside React render cycle
- useSearch has `enabled: q.length >= 2` to prevent wasteful empty/single-char API calls
- useExportData uses `enabled: false` so it only fetches on-demand (GDPR export is not auto-fetched)
- Mutation hooks that modify server state (predict, path, sync trigger, profile update, token configure) invalidate relevant queries on success

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 12 hook files are ready for page phases (3-12) to import directly
- Pages only need `import { useCourses } from '@/hooks/use-courses'` to get typed data with loading/error states
- Query key factories enable targeted cache invalidation across related hooks
- Phase 02 (API contracts & mock layer) is fully complete

## Self-Check: PASSED

- All 13 files verified present on disk
- Both task commits (8bc2e32, cddaa33) verified in git log
- typecheck, build, and all 45 tests pass

---
*Phase: 02-api-contracts-mock-layer*
*Completed: 2026-03-21*
