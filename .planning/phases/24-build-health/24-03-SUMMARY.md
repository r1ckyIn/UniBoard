---
phase: 24-build-health
plan: 03
subsystem: ui
tags: [typescript, eslint, react-hooks, useMemo, exhaustive-deps, unused-vars]

# Dependency graph
requires:
  - phase: 24-build-health
    provides: "Frontend components with TypeScript and ESLint violations"
provides:
  - "Zero TypeScript errors in DeadlineCard and CourseCard test files"
  - "Zero ESLint warnings in 10 target component/test files"
  - "Stable useMemo references for derived data in PredictPage, TimetablePage, DeadlinesPage"
affects: [24-build-health]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useMemo wrapper for TanStack Query data?.field || [] expressions to stabilize references"
    - "Remove unused destructured props from function signature while keeping interface intact"

key-files:
  created: []
  modified:
    - frontend/__tests__/deadlines/DeadlineCard.test.tsx
    - frontend/__tests__/courses/CourseCard.test.tsx
    - frontend/components/course-detail/AiCourseChat.tsx
    - frontend/components/course-detail/QuickLinksPanel.tsx
    - frontend/components/course-detail/UnitReviewSection.tsx
    - frontend/components/deadlines/DeadlinesPage.tsx
    - frontend/components/digest/HighlightItem.tsx
    - frontend/components/predict/PredictPage.tsx
    - frontend/components/setup/GuideCard.tsx
    - frontend/components/timetable/TimetableGrid.tsx
    - frontend/components/timetable/TimetablePage.tsx
    - frontend/src/test/setup.ts

key-decisions:
  - "useMemo with [data] dependency for TanStack Query logical expressions -- data is referentially stable between renders when unchanged"
  - "Keep unused props in interface but remove from destructuring -- allows callers to continue passing them without breaking"

patterns-established:
  - "useMemo wrapper pattern: const x = useMemo(() => data?.items ?? [], [data]) for stable array references"

requirements-completed: [CRIT-02]

# Metrics
duration: 6min
completed: 2026-04-01
---

# Phase 24 Plan 03: Frontend TypeScript & ESLint Zero Violations Summary

**Fixed 8 TypeScript errors (missing course_id + beforeEach import) and 23 ESLint warnings (10 unused vars + 13 exhaustive-deps) across 12 frontend files**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-01T10:38:02Z
- **Completed:** 2026-04-01T10:44:32Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Eliminated all 8 TypeScript errors in target test files: 7 TS2322 (missing course_id in DeadlineCard fixtures) and 1 TS2304 (missing beforeEach import in CourseCard)
- Removed 10 unused variable warnings across 8 component files (clearMessages, courseCode x2, courseName, sourceThreadId, t, cn, weekPosition, getCourseColor, importFn)
- Wrapped 5 logical expressions in useMemo to fix 13 react-hooks/exhaustive-deps warnings (deadlineList, courses, semesterWeeks, allSessions, allDeadlines)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix 8 TypeScript errors in test files** - `14721c8` (fix)
2. **Task 2: Fix 23 ESLint warnings (unused vars + exhaustive-deps)** - `e3d614b` (fix)

## Files Created/Modified
- `frontend/__tests__/deadlines/DeadlineCard.test.tsx` - Added course_id to test fixtures
- `frontend/__tests__/courses/CourseCard.test.tsx` - Added beforeEach import, removed unused importFn param
- `frontend/components/course-detail/AiCourseChat.tsx` - Removed unused clearMessages
- `frontend/components/course-detail/QuickLinksPanel.tsx` - Removed unused courseCode from destructuring
- `frontend/components/course-detail/UnitReviewSection.tsx` - Removed unused courseName from destructuring
- `frontend/components/deadlines/DeadlinesPage.tsx` - Wrapped deadlineList in useMemo
- `frontend/components/digest/HighlightItem.tsx` - Removed unused sourceThreadId and courseCode
- `frontend/components/predict/PredictPage.tsx` - Removed unused t/useTranslations, wrapped courses in useMemo
- `frontend/components/setup/GuideCard.tsx` - Removed unused cn import
- `frontend/components/timetable/TimetableGrid.tsx` - Removed unused weekPosition
- `frontend/components/timetable/TimetablePage.tsx` - Removed unused getCourseColor import, wrapped semesterWeeks/allSessions/allDeadlines in useMemo
- `frontend/src/test/setup.ts` - Suppressed ESLint for IntersectionObserver polyfill _options

## Decisions Made
- Used useMemo with [data] dependency for TanStack Query logical expressions -- TanStack Query data is referentially stable between renders when unchanged, making [data] a safe dependency
- Kept unused props in component interfaces (courseCode, courseName, sourceThreadId) but removed from destructuring -- prevents breaking callers while silencing ESLint

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Fixed unused importFn in CourseCard.test.tsx mock**
- **Found during:** Task 2 (ESLint verification)
- **Issue:** withClientOnly mock had unused importFn parameter causing ESLint warning not listed in original plan
- **Fix:** Removed importFn parameter from mock function signature
- **Files modified:** frontend/__tests__/courses/CourseCard.test.tsx
- **Verification:** ESLint reports no warnings for this file
- **Committed in:** e3d614b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Minor scope addition for clean ESLint pass on plan target files. No scope creep.

## Issues Encountered
- Pre-existing tsc errors (2800+) exist across the frontend from missing vitest/testing-library type declarations in tsconfig -- these are NOT in scope for this plan which targeted only the 8 specific TS2322/TS2304 errors in the two test files
- Remaining ESLint warnings (14) exist in files not targeted by this plan (test files with unused expect imports, use-ai-stream.ts SSEEvent type, use-auth.test.ts display name)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Target files are now clean of TypeScript and ESLint violations
- Remaining warnings in non-target files can be addressed in a follow-up plan if desired

## Self-Check: PASSED

All key files verified present. Both task commits (14721c8, e3d614b) confirmed in git history.

---
*Phase: 24-build-health*
*Completed: 2026-04-01*
