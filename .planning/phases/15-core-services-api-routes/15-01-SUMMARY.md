---
phase: 15-core-services-api-routes
plan: 01
subsystem: api
tags: [fastapi, pydantic, gpa, courses, openapi, contract-alignment]

requires:
  - phase: 13
    provides: SQLAlchemy ORM models (Course, Grade, UnitOutline, UnifiedDeadline, Profile)
  - phase: 02
    provides: OpenAPI spec / types.gen.d.ts frontend contract
provides:
  - Contract-aligned Pydantic schemas for GPA domain (GpaReportResponse, GpaPredictionResponse, GpaPathResponse)
  - Contract-aligned Pydantic schemas for Course domain (CourseResponse, CourseDetailResponse, GradeResponse, CourseOutlineResponse, CourseDeadlineResponse)
  - Fixed GPA route paths (GET /gpa, POST /gpa/predict, POST /gpa/path)
  - New /courses router with 5 endpoints (list, detail, grades, deadlines, outline)
affects: [15-02, 15-03, frontend-hooks]

tech-stack:
  added: []
  patterns: [adapter-layer-in-route converting legacy service output to contract shape, _parse_level_weight helper for course code level extraction]

key-files:
  created:
    - src/schemas/course.py
    - src/web/routes/courses.py
  modified:
    - src/schemas/gpa.py
    - src/web/routes/gpa.py
    - src/services/gpa.py
    - src/web/routes/__init__.py

key-decisions:
  - "Adapter logic in route handlers converts legacy GPAService output to contract-aligned shapes, avoiding service rewrite"
  - "CourseDeadlineResponse defined in course.py (not deadline.py) to keep Plan 01 self-contained"
  - "Legacy schemas preserved with deprecation comments for backward compat with existing tests"
  - "Deadline status computed from due_date + grade existence (completed/overdue/upcoming)"

patterns-established:
  - "Route adapter pattern: route handler calls legacy service, adapts output to new schema shape"
  - "Course-scoped deadline response omits course_code/course_name since scoped by URL path"

requirements-completed: [GPA-01, GPA-02, GPA-03, GPA-04, GPA-05]

duration: 6min
completed: 2026-03-27
---

# Phase 15 Plan 01: GPA & Course Contract Alignment Summary

**Contract-aligned Pydantic schemas and route paths for GPA/Course domains, with new /courses router serving 5 endpoints matching types.gen.d.ts**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-27T03:28:53Z
- **Completed:** 2026-03-27T03:35:19Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Created contract-aligned Pydantic schemas matching frontend types.gen.d.ts for both GPA and Course domains
- Fixed GPA route paths from legacy (/summary, /what-if, /target) to OpenAPI-compliant (root, /predict, /path)
- Created new /courses router with 5 endpoints: list, detail, grades, deadlines, outline

## Task Commits

Each task was committed atomically:

1. **Task 1: Create contract-aligned Pydantic schemas** - `8cf245e` (feat)
2. **Task 2: Fix GPA route paths and response schemas** - `6c78ecd` (feat)
3. **Task 3: Create /courses router with all 5 endpoints** - `e37c1a6` (feat)

## Files Created/Modified
- `src/schemas/gpa.py` - Added 9 new contract-aligned schema classes, preserved legacy classes
- `src/schemas/course.py` - NEW: 8 schema classes for Course domain (CourseResponse, CourseDetailResponse, GradeResponse, etc.)
- `src/web/routes/gpa.py` - Rewrote with adapter pattern: GET /gpa, POST /gpa/predict, POST /gpa/path
- `src/web/routes/courses.py` - NEW: 5 endpoints with computed fields (current_mark, status, days_remaining)
- `src/web/routes/__init__.py` - Registered courses_router under /courses prefix
- `src/services/gpa.py` - Added _parse_level_weight helper and re import

## Decisions Made
- Used adapter pattern in route handlers to convert legacy GPAService output to contract-aligned shapes, avoiding a risky service-layer rewrite
- CourseDeadlineResponse defined in course.py (not deadline.py) to avoid cross-plan dependency with Plan 02
- Legacy schemas preserved with comments for backward compatibility with existing unit tests
- Deadline status logic: past + graded -> "completed", past -> "overdue", else -> "upcoming"
- Grade letter computed from current_mark thresholds matching USYD bands (HD >= 85, D >= 75, etc.)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GPA and Course schemas are ready for frontend integration (zero changes needed when switching mock to real)
- Plan 02 (deadline/intelligence routes) can proceed, CourseDeadlineResponse already defined
- Plan 03 (remaining routes) can build on established adapter pattern

---
*Phase: 15-core-services-api-routes*
*Completed: 2026-03-27*
