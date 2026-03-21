---
phase: 02-api-contracts-mock-layer
plan: 02
subsystem: api
tags: [fixtures, mock, route-handlers, next-api, auth]

requires:
  - phase: 02-api-contracts-mock-layer
    plan: 01
    provides: OpenAPI spec, generated types, ky client, auth store
provides:
  - 13 fixture data files with realistic USYD course data
  - Mock helper utilities (mockResponse, mockError, mockDelay, shouldSimulateError, requireAuth, mockPaginatedResponse)
  - Auth mock endpoints (register, login, refresh, logout, forgot-password, confirm-password)
  - User mock endpoints (GET/PATCH/DELETE profile, token CRUD, verify, export)
affects: [02-03, 02-04, 02-05, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12]

tech-stack:
  added: []
  patterns: [Route Handler mock pattern with mockDelay/shouldSimulateError/requireAuth, base64 index-based cursor pagination, fixture data typed with OpenAPI generated types]

key-files:
  created:
    - frontend/lib/fixtures/helpers.ts
    - frontend/lib/fixtures/users.ts
    - frontend/lib/fixtures/courses.ts
    - frontend/lib/fixtures/grades.ts
    - frontend/lib/fixtures/deadlines.ts
    - frontend/lib/fixtures/materials.ts
    - frontend/lib/fixtures/discussions.ts
    - frontend/lib/fixtures/gpa.ts
    - frontend/lib/fixtures/digest.ts
    - frontend/lib/fixtures/alerts.ts
    - frontend/lib/fixtures/notifications.ts
    - frontend/lib/fixtures/sync.ts
    - frontend/lib/fixtures/search.ts
    - frontend/app/api/v1/auth/register/route.ts
    - frontend/app/api/v1/auth/login/route.ts
    - frontend/app/api/v1/auth/refresh/route.ts
    - frontend/app/api/v1/auth/logout/route.ts
    - frontend/app/api/v1/auth/forgot-password/route.ts
    - frontend/app/api/v1/auth/confirm-password/route.ts
    - frontend/app/api/v1/users/me/route.ts
    - frontend/app/api/v1/users/me/export/route.ts
    - frontend/app/api/v1/users/me/tokens/[platform]/route.ts
    - frontend/app/api/v1/users/me/tokens/[platform]/verify/route.ts
  modified: []

key-decisions:
  - "Base64 index-based cursors for mockPaginatedResponse instead of ID-based cursors for generic compatibility"
  - "Auth endpoints created as 6 separate route files (login, register, refresh, logout, forgot-password, confirm-password)"
  - "Next.js 15 params Promise pattern used for dynamic [platform] segments"

patterns-established:
  - "Route Handler mock pattern: mockDelay() -> shouldSimulateError() -> requireAuth() -> business logic -> mockResponse()"
  - "Fixture data uses import type { components } from '@/lib/api/types.gen' for type safety"
  - "Auth routes do NOT call requireAuth; user routes DO call requireAuth"
  - "Dynamic route params awaited as Promise per Next.js 15 convention"

requirements-completed: [INFRA-11]

duration: 9min
completed: 2026-03-21
---

# Phase 02 Plan 02: Fixture Data & Auth/User Route Handlers Summary

**13 fixture data files with realistic USYD course data and 10 auth/user Route Handler mocks using standard {data, meta} envelope format**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-21T01:43:37Z
- **Completed:** 2026-03-21T01:52:07Z
- **Tasks:** 2
- **Files modified:** 23

## Accomplishments
- 13 fixture data files covering users, courses (5 real USYD codes), grades, deadlines (10 items with overdue/upcoming mix), materials, discussions, GPA report/prediction/path, digest, alerts, notifications, sync, and search
- Mock helpers (mockResponse, mockError, mockDelay, shouldSimulateError, requireAuth, mockPaginatedResponse) providing consistent response envelope and auth validation
- 6 auth route handlers (register, login, refresh, logout, forgot-password, confirm-password) that accept any credentials
- 4 user route handler files covering profile CRUD, data export, platform token management, and token verification
- All fixture data typed against OpenAPI-generated types for compile-time safety

## Task Commits

Each task was committed atomically:

1. **Task 1: Create fixture data files and mock helpers** - `88c5e1a` (feat)
2. **Task 2: Create auth and user Route Handler mock endpoints** - `f0330ce` (feat)

## Files Created/Modified
- `frontend/lib/fixtures/helpers.ts` - Shared mock helpers: response envelope, error, delay, auth validation, pagination
- `frontend/lib/fixtures/users.ts` - Mock user and token data
- `frontend/lib/fixtures/courses.ts` - 5 USYD courses with diverse scenarios (normal, below-target, at-risk, high-performer, empty)
- `frontend/lib/fixtures/grades.ts` - Graded assessments per course
- `frontend/lib/fixtures/deadlines.ts` - 10 deadlines (2 overdue, 3 within 7 days, 5 within 30 days)
- `frontend/lib/fixtures/materials.ts` - Canvas modules and Ed lessons per course
- `frontend/lib/fixtures/discussions.ts` - 5-6 threads per course with staff/endorsed/high-relevance mix
- `frontend/lib/fixtures/gpa.ts` - GPA report (WAM 78.5, target 85.0), prediction, and path data
- `frontend/lib/fixtures/digest.ts` - Latest daily digest with 3 courses and 2 urgent deadlines
- `frontend/lib/fixtures/alerts.ts` - 4 alerts: gpa_risk, deadline_risk, token_expired
- `frontend/lib/fixtures/notifications.ts` - 6 notifications: deadline_reminder (3h/24h/72h), grade_published, token_expired, sync_complete
- `frontend/lib/fixtures/sync.ts` - Sync status with completed sync and healthy platforms
- `frontend/lib/fixtures/search.ts` - 6 search results across material and discussion types
- `frontend/app/api/v1/auth/*/route.ts` - 6 auth endpoint mocks (no auth required)
- `frontend/app/api/v1/users/me/*/route.ts` - 4 user endpoint mocks (auth required)

## Decisions Made
- Used base64 index-based cursors for `mockPaginatedResponse` instead of ID-based cursors, enabling generic compatibility with any array type
- Created 6 auth route files (including forgot-password and confirm-password) to keep route structure clean and match OpenAPI spec
- Used Next.js 15 Promise-based params pattern for dynamic `[platform]` route segments

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Fixture data and mock helpers ready for domain route handlers (Plans 03-04)
- Auth/user endpoints provide the foundation for authenticated mock API testing
- All data typed against OpenAPI schema, ensuring consistency across the mock layer
- `requireAuth` helper available for all auth-protected endpoints in Plans 03-04

## Self-Check: PASSED

All 23 created files verified present. Both task commits (88c5e1a, f0330ce) confirmed in git log. SUMMARY.md created.

---
*Phase: 02-api-contracts-mock-layer*
*Completed: 2026-03-21*
