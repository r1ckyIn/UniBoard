---
phase: 11-timetable-page
plan: 01
subsystem: ui
tags: [timetable, tanstack-query, openapi, i18n, overlap-algorithm, fixtures]

# Dependency graph
requires:
  - phase: 02-api-contracts
    provides: OpenAPI spec structure, mock helpers, TanStack Query hook patterns
provides:
  - TimetableSession and SemesterWeek TypeScript types
  - timeToY() dual-density pixel mapping utility
  - assignCols() transitive overlap column assignment algorithm
  - 19 timetable session fixtures from real ICS data
  - 14 semester week fixtures for S1 2026
  - OpenAPI schemas and endpoints for timetable sessions and weeks
  - Route Handler mocks with week filtering
  - TanStack Query hooks (useTimetableSessions, useSemesterWeeks)
  - i18n timetable namespace in EN and ZH
affects: [11-02-PLAN, 11-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns: [dual-density-pixel-mapping, transitive-overlap-grouping]

key-files:
  created:
    - frontend/lib/timetable/types.ts
    - frontend/lib/timetable/time-utils.ts
    - frontend/lib/timetable/overlap.ts
    - frontend/lib/fixtures/timetable.ts
    - frontend/app/api/v1/timetable/sessions/route.ts
    - frontend/app/api/v1/timetable/weeks/route.ts
    - frontend/hooks/use-timetable.ts
    - frontend/__tests__/timetable/time-utils.test.ts
    - frontend/__tests__/timetable/overlap.test.ts
  modified:
    - frontend/openapi/openapi.yaml
    - frontend/lib/api/types.gen.d.ts
    - frontend/messages/en.json
    - frontend/messages/zh.json

key-decisions:
  - "Transitive overlap with greedy column reuse: events that end exactly when another starts can share columns"
  - "Week param in sessions API maps directly to teaching_week number, not slider position"

patterns-established:
  - "Dual-density pixel zones: 60px/h for 8-19, 28px/h for 19-23, total 772px grid height"
  - "OverlappableEvent interface with _col/_cc mutable fields for column assignment"

requirements-completed: [UI-08]

# Metrics
duration: 7min
completed: 2026-03-25
---

# Phase 11 Plan 01: Timetable Data Layer Summary

**Timetable data layer with dual-density pixel mapping, transitive overlap algorithm, 19-session ICS fixtures, OpenAPI schemas, route handler mocks, TanStack Query hooks, and bilingual i18n**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-25T03:16:28Z
- **Completed:** 2026-03-25T03:23:42Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- TimetableSession/SemesterWeek types, timeToY() pixel mapping, and assignCols() overlap algorithm with TDD tests
- 19 recurring-event session fixtures and 14 semester week fixtures accurately ported from real ICS prototype data
- OpenAPI schema extended with TimetableSession and SemesterWeek schemas, two new endpoints
- Route handlers with week-based filtering, auth validation, and error simulation
- TanStack Query hooks following established keys-factory pattern
- Complete timetable i18n namespace in English and Chinese

## Task Commits

Each task was committed atomically:

1. **Task 1: Types, time-utils, overlap algorithm, and fixture data** - `e74d2c3` (feat)
2. **Task 2: OpenAPI schema, Route Handler mocks, TanStack Query hooks, and i18n** - `b039c17` (feat)

## Files Created/Modified
- `frontend/lib/timetable/types.ts` - TimetableSession, SemesterWeek, WeekMode type definitions
- `frontend/lib/timetable/time-utils.ts` - timeToY() dual-density pixel mapping, formatTime(), grid constants
- `frontend/lib/timetable/overlap.ts` - assignCols() transitive overlap grouping with greedy column assignment
- `frontend/lib/fixtures/timetable.ts` - 19 timetable sessions + 14 semester weeks from real ICS
- `frontend/__tests__/timetable/time-utils.test.ts` - Boundary condition tests for pixel mapping
- `frontend/__tests__/timetable/overlap.test.ts` - Overlap grouping and column assignment tests
- `frontend/openapi/openapi.yaml` - Added timetable tag, /timetable/sessions and /timetable/weeks paths, schemas
- `frontend/lib/api/types.gen.d.ts` - Regenerated from updated OpenAPI spec
- `frontend/app/api/v1/timetable/sessions/route.ts` - Mock route handler with week filtering
- `frontend/app/api/v1/timetable/weeks/route.ts` - Mock route handler returning semester weeks
- `frontend/hooks/use-timetable.ts` - useTimetableSessions and useSemesterWeeks hooks
- `frontend/messages/en.json` - Added timetable namespace (EN)
- `frontend/messages/zh.json` - Added timetable namespace (ZH)

## Decisions Made
- Transitive overlap algorithm reuses columns greedily: when an event starts at the exact time another ends (start >= end), they share a column. This matches the prototype behavior and minimizes column count.
- Week parameter in the sessions API maps directly to teaching_week number (1-13), not slider position (1-14). Callers convert position to teaching_week before calling.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed transitive overlap test expectation**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** Test expected cc=3 for 3 transitively overlapping events (A:9-11, B:10-12, C:11-13), but the greedy algorithm correctly assigns only 2 columns since C starts at 11 >= A's end at 11
- **Fix:** Updated test to expect cc=2 with C reusing column 0
- **Files modified:** frontend/__tests__/timetable/overlap.test.ts
- **Verification:** All overlap tests pass
- **Committed in:** e74d2c3 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test expectation)
**Impact on plan:** Corrected test to match actual algorithm behavior. No scope creep.

## Issues Encountered
- Pre-existing TypeScript error in `__tests__/courses/CourseCard.test.tsx` (missing `beforeEach` global type) - not caused by this plan, not in scope.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All timetable types, utilities, fixtures, API mocks, hooks, and i18n are in place
- Plan 02 (grid rendering) can directly import types from `@/lib/timetable/types`, use `timeToY()` and `assignCols()`, and consume data via `useTimetableSessions()` and `useSemesterWeeks()`
- No blockers or concerns

## Self-Check: PASSED

All 13 created/modified files verified present. Both task commits (e74d2c3, b039c17) verified in git log.

---
*Phase: 11-timetable-page*
*Completed: 2026-03-25*
