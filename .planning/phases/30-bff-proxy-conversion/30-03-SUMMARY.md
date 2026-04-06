---
phase: 30-bff-proxy-conversion
plan: 03
subsystem: api
tags: [bff, proxy, route-handlers, deadlines, users, digest, search, sync, notifications]

requires:
  - phase: 30-bff-proxy-conversion
    plan: 01
    provides: proxyRequest() shared BFF utility
provides:
  - 12 Route Handlers converted from mock fixtures to Python backend proxy
  - deadlineActions shared state removed (decoupled deadline routes)
  - Spot-check test suite for proxy route verification
affects: []

tech-stack:
  added: []
  patterns: [proxy-delegation, dynamic-param-backendPath, multi-method-route-handler]

key-files:
  created:
    - frontend/__tests__/api/proxy-routes.test.ts
  modified:
    - frontend/app/api/v1/deadlines/route.ts
    - frontend/app/api/v1/deadlines/upcoming/route.ts
    - frontend/app/api/v1/deadlines/[deadlineId]/actions/route.ts
    - frontend/app/api/v1/deadlines/[deadlineId]/actions/[action]/route.ts
    - frontend/app/api/v1/users/me/route.ts
    - frontend/app/api/v1/users/me/tokens/[platform]/route.ts
    - frontend/app/api/v1/notifications/route.ts
    - frontend/app/api/v1/digest/latest/route.ts
    - frontend/app/api/v1/digest/history/route.ts
    - frontend/app/api/v1/search/route.ts
    - frontend/app/api/v1/sync/status/route.ts
    - frontend/app/api/v1/sync/trigger/route.ts

key-decisions:
  - "All 4 deadline routes converted atomically to avoid import errors from removed deadlineActions"
  - "Dynamic param routes use backendPath override to construct correct Python backend URLs"
  - "Multi-method routes (users/me: GET/PATCH/DELETE, tokens: PUT/DELETE) each export separate handler"
  - "Spot-check tests mock proxyRequest via vi.mock and verify delegation with correct arguments"

patterns-established:
  - "Dynamic params: await params, construct backendPath with template literal"
  - "Body forwarding: request.text() in caller, pass as body option to proxyRequest"
  - "Simple GET proxy: single-line proxyRequest(request) with query params auto-forwarded"

requirements-completed: [BFF-01, BFF-02, BFF-03]

duration: 5min
completed: 2026-04-06
---

# Phase 30 Plan 03: Remaining Route Handler BFF Conversion Summary

**12 Route Handlers converted from mock fixtures to proxyRequest proxy, deadlineActions shared state removed, 7 spot-check tests verifying delegation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-06T05:02:14Z
- **Completed:** 2026-04-06T05:07:59Z
- **Tasks:** 2 (deadline domain + remaining routes with tests)
- **Files modified:** 13

## Accomplishments

- Converted 12 Route Handlers from mock fixture data to Python backend proxy via proxyRequest
- Removed `deadlineActions` module-scoped Map (shared mutable state between 3 coupled routes)
- All 4 deadline routes converted atomically to prevent import errors
- Multi-method routes: users/me (GET, PATCH, DELETE), tokens/[platform] (PUT, DELETE)
- Dynamic param routes construct correct backendPath with template literals
- 7 spot-check tests verify proxyRequest delegation with correct arguments
- All existing 28 API tests remain green
- TypeScript clean, ESLint clean

## Task Commits

Each task was committed atomically:

1. **Task 1: Convert deadline domain routes** - `7dec76a` (feat) - 4 deadline routes converted, deadlineActions removed
2. **Task 2: Convert remaining 8 routes + spot-check tests** - `f78b4cf` (feat) - users, digest, search, sync, notifications + 7 tests

## Files Created/Modified

### Created
- `frontend/__tests__/api/proxy-routes.test.ts` - 7 spot-check tests verifying proxy delegation (125 lines)

### Modified (12 Route Handlers)
- `frontend/app/api/v1/deadlines/route.ts` - GET proxy (was: fixture data with filtering + deadlineActions export)
- `frontend/app/api/v1/deadlines/upcoming/route.ts` - GET proxy (was: fixture data with date filtering)
- `frontend/app/api/v1/deadlines/[deadlineId]/actions/route.ts` - POST proxy with body + backendPath (was: deadlineActions Map mutation)
- `frontend/app/api/v1/deadlines/[deadlineId]/actions/[action]/route.ts` - DELETE proxy with backendPath (was: deadlineActions Map deletion)
- `frontend/app/api/v1/users/me/route.ts` - GET/PATCH/DELETE proxy (was: mock-state read/write)
- `frontend/app/api/v1/users/me/tokens/[platform]/route.ts` - PUT/DELETE proxy with backendPath (was: mock validation)
- `frontend/app/api/v1/notifications/route.ts` - GET proxy (was: fixture pagination)
- `frontend/app/api/v1/digest/latest/route.ts` - GET proxy (was: fixture data)
- `frontend/app/api/v1/digest/history/route.ts` - GET proxy (was: fixture pagination)
- `frontend/app/api/v1/search/route.ts` - GET proxy (was: fixture filtering)
- `frontend/app/api/v1/sync/status/route.ts` - GET proxy (was: fixture data)
- `frontend/app/api/v1/sync/trigger/route.ts` - POST proxy with body (was: mock random response)

## Decisions Made

- Converted all 4 deadline routes in a single atomic task to avoid broken imports from removed `deadlineActions`
- Used `request.text()` for body forwarding (preserves raw JSON string for proxyRequest)
- Dynamic param routes explicitly construct `backendPath` rather than relying on URL rewriting
- Spot-check tests validate 7 representative routes covering: simple GET, POST with body, DELETE with dynamic params, PATCH with body, PUT with body and backendPath

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] proxy.ts dependency from Plan 01 not in worktree**
- **Found during:** Task 1
- **Issue:** This worktree branched from main before Plan 01 committed proxy.ts
- **Fix:** Created proxy.ts in the worktree (identical content to Plan 01's version) so routes can compile
- **Files modified:** frontend/lib/api/proxy.ts
- **Commit:** 7dec76a

## Issues Encountered

None beyond the proxy.ts dependency noted above.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all 12 routes are production-ready proxy handlers.

## Next Phase Readiness

- Combined with Plan 02 (parallel), all 25 mock-to-proxy Route Handler conversions will be complete
- Only 5 intentionally mock routes remain: health, timetable x2, export, verify
- Ready for Phase 31 (E2E verification) which will test the full data flow

## Self-Check: PASSED

- [x] frontend/__tests__/api/proxy-routes.test.ts exists (7 tests)
- [x] All 12 route handler files modified to use proxyRequest
- [x] No deadlineActions references in codebase
- [x] No fixture imports in converted routes
- [x] Commit 7dec76a exists
- [x] Commit f78b4cf exists
- [x] 30-03-SUMMARY.md exists

---
*Phase: 30-bff-proxy-conversion*
*Completed: 2026-04-06*
