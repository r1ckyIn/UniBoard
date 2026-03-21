---
phase: 02-api-contracts-mock-layer
plan: 03
subsystem: api
tags: [next-route-handlers, mock-api, courses, gpa, deadlines, rest-api]

requires:
  - phase: 02-api-contracts-mock-layer
    plan: 01
    provides: OpenAPI 3.1 spec with generated TypeScript types
  - phase: 02-api-contracts-mock-layer
    plan: 02
    provides: Fixture data files (courses, grades, deadlines, materials, discussions, GPA) and mock helpers (mockResponse, requireAuth, mockPaginatedResponse)
provides:
  - 7 course Route Handler mocks (list, detail, grades, materials, discussions, deadlines, outline)
  - 3 GPA Route Handler mocks (report GET, predict POST, path POST)
  - 2 deadline Route Handler mocks (list with filtering, upcoming within 7 days)
affects: [03, 04, 05, 06, 07, 08, 09, 10, 11, 12]

tech-stack:
  added: []
  patterns: [Next.js 15 async params for dynamic route segments, query param filtering in route handlers, CourseDeadline field projection from Deadline type]

key-files:
  created:
    - frontend/app/api/v1/courses/route.ts
    - frontend/app/api/v1/courses/[id]/route.ts
    - frontend/app/api/v1/courses/[id]/grades/route.ts
    - frontend/app/api/v1/courses/[id]/materials/route.ts
    - frontend/app/api/v1/courses/[id]/discussions/route.ts
    - frontend/app/api/v1/courses/[id]/deadlines/route.ts
    - frontend/app/api/v1/courses/[id]/outline/route.ts
    - frontend/app/api/v1/gpa/route.ts
    - frontend/app/api/v1/gpa/predict/route.ts
    - frontend/app/api/v1/gpa/path/route.ts
    - frontend/app/api/v1/deadlines/route.ts
    - frontend/app/api/v1/deadlines/upcoming/route.ts
  modified: []

key-decisions:
  - "Course deadlines endpoint projects fields explicitly rather than destructuring to avoid unused-variable lint warnings"
  - "Course outline endpoint generates mock CourseOutline from courseDetails assessment_weights rather than a separate fixture"
  - "Discussion filtering uses switch/case for clarity across 4 filter modes (high_value, endorsed, staff, all)"

patterns-established:
  - "Dynamic route params: use Next.js 15 async params pattern — { params }: { params: Promise<{ id: string }> } with await"
  - "Auth-required endpoints: requireAuth(request) as first check, early return on error"
  - "Query param filtering: new URL(request.url).searchParams for reading query strings in route handlers"
  - "POST body validation: try/catch around request.json() with VALIDATION_ERROR response on invalid shape"

requirements-completed: [INFRA-11]

duration: 6min
completed: 2026-03-21
---

# Phase 02 Plan 03: Courses, GPA & Deadlines Route Handlers Summary

**12 Route Handler mocks for courses (7 endpoints with semester/source/filter query params), GPA (report + what-if predict + target path), and deadlines (date range filtering + upcoming 7-day view)**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-21T01:43:59Z
- **Completed:** 2026-03-21T01:50:47Z
- **Tasks:** 1
- **Files modified:** 12

## Accomplishments
- 7 course endpoints covering list, detail, grades, materials, discussions (with cursor pagination), per-course deadlines, and unit outline
- 3 GPA endpoints: GET report returns full WAM/GPA data, POST predict/path validate request body and return fixture predictions
- 2 deadline endpoints: GET with from/to/course_id filtering, GET upcoming returns deadlines within 0-7 days
- All 12 endpoints validate Bearer token via requireAuth before returning data
- Build, typecheck, and all 24 existing tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Create courses, GPA, and deadlines Route Handler mocks** - `fb0d1ce` (feat)

## Files Created/Modified
- `frontend/app/api/v1/courses/route.ts` - GET /courses with optional semester filter
- `frontend/app/api/v1/courses/[id]/route.ts` - GET /courses/{id} returning CourseDetail or 404
- `frontend/app/api/v1/courses/[id]/grades/route.ts` - GET /courses/{id}/grades returning grade array
- `frontend/app/api/v1/courses/[id]/materials/route.ts` - GET /courses/{id}/materials with optional source filter
- `frontend/app/api/v1/courses/[id]/discussions/route.ts` - GET /courses/{id}/discussions with filter/cursor/limit params
- `frontend/app/api/v1/courses/[id]/deadlines/route.ts` - GET /courses/{id}/deadlines projecting CourseDeadline fields
- `frontend/app/api/v1/courses/[id]/outline/route.ts` - GET /courses/{id}/outline generating CourseOutline from detail
- `frontend/app/api/v1/gpa/route.ts` - GET /gpa returning GpaReport fixture
- `frontend/app/api/v1/gpa/predict/route.ts` - POST /gpa/predict with body validation
- `frontend/app/api/v1/gpa/path/route.ts` - POST /gpa/path with body validation
- `frontend/app/api/v1/deadlines/route.ts` - GET /deadlines with from/to/course_id filtering
- `frontend/app/api/v1/deadlines/upcoming/route.ts` - GET /deadlines/upcoming (0-7 days remaining)

## Decisions Made
- Used explicit field projection instead of destructuring with underscore-prefixed unused vars for the course deadlines endpoint (avoids lint warnings)
- Generated CourseOutline dynamically from courseDetails rather than creating a separate outline fixture file (reduces fixture maintenance burden)
- Used switch/case for discussion filter modes instead of if/else chain for readability

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Initial course deadlines route used destructuring with `_` prefixed vars to strip `course_code`, `course_name`, `is_confirmed` from Deadline type, which triggered `@typescript-eslint/no-unused-vars` warnings. Fixed by using explicit field projection with `map()`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 12 academic data mock endpoints ready for consumption by Dashboard, Courses, Course Detail, Predict, and Deadlines pages
- Combined with Plan 02-02 fixtures and Plan 02-04 route handlers, the full mock API layer covers all 32 TRD endpoints
- TanStack Query hooks (Plan 02-05) can now be wired to these endpoints

## Self-Check: PASSED

- All 12 route handler files exist on disk
- Task commit `fb0d1ce` found in git history
- SUMMARY.md created successfully
- Build: 0 errors, 0 warnings
- Typecheck: 0 errors
- Tests: 24/24 passed (5 test files)

---
*Phase: 02-api-contracts-mock-layer*
*Completed: 2026-03-21*
