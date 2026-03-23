---
phase: 07-course-detail-page
plan: 01
subsystem: ui
tags: [i18n, react-query, next-intl, vitest, next.js]

# Dependency graph
requires:
  - phase: 06-courses-page
    provides: courses page route, CourseCard navigation to /courses/{id}
  - phase: 02-api-contract
    provides: OpenAPI spec with /courses/{id}/deadlines endpoint
provides:
  - courseDetail i18n namespace (en + zh) for all course detail UI text
  - useCourseDeadlines hook for course-specific deadline data
  - page.tsx server component route for /courses/[id]
  - 23 Wave 0 test stubs across 5 component test files
  - placeholder CourseDetailPage component
affects: [07-02-PLAN, 07-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "byCourse key factory extension for per-course queries"

key-files:
  created:
    - frontend/__tests__/course-detail/AssessmentSection.test.tsx
    - frontend/__tests__/course-detail/MaterialsSection.test.tsx
    - frontend/__tests__/course-detail/EdPostsPanel.test.tsx
    - frontend/__tests__/course-detail/CourseDetailPage.test.tsx
    - frontend/__tests__/course-detail/QuickLinksPanel.test.tsx
    - frontend/app/[locale]/(dashboard)/courses/[id]/page.tsx
    - frontend/components/course-detail/CourseDetailPage.tsx
  modified:
    - frontend/messages/en.json
    - frontend/messages/zh.json
    - frontend/hooks/use-deadlines.ts

key-decisions:
  - "Created placeholder CourseDetailPage component to avoid TypeScript errors until Plan 03 implements the full component"
  - "Used vitest directory path filter instead of --testPathPattern (deprecated in vitest 4.x)"

patterns-established:
  - "byCourse query key pattern: [...keys.all, 'course', courseId] for per-course data hooks"

requirements-completed: [UI-11]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 07 Plan 01: Course Detail Foundation Summary

**courseDetail i18n namespace (en/zh), useCourseDeadlines hook, page.tsx route entry, and 23 Wave 0 test stubs for course detail components**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T07:18:02Z
- **Completed:** 2026-03-23T07:21:32Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Added courseDetail i18n namespace with full EN/ZH key parity (8 sub-namespaces: assessment, gradeSummary, materials, aiChat, quickLinks, deadlines, edPosts, empty)
- Added useCourseDeadlines hook following established keys-factory -> queryOptions-factory -> thin-wrapper pattern
- Created page.tsx server component for /courses/[id] route following Next.js 15 Promise-based params pattern
- Created 23 Wave 0 test stubs across 5 files covering all Phase 7 component test surfaces

## Task Commits

Each task was committed atomically:

1. **Task 1: i18n courseDetail namespace + useCourseDeadlines hook** - `b53c485` (feat)
2. **Task 2: Wave 0 test stubs + page.tsx route entry** - `c959a1a` (test)

## Files Created/Modified
- `frontend/messages/en.json` - Added courseDetail namespace with all course detail UI text
- `frontend/messages/zh.json` - Added courseDetail namespace with Chinese translations
- `frontend/hooks/use-deadlines.ts` - Added CourseDeadlinesResponse type, byCourse key/options, useCourseDeadlines hook
- `frontend/__tests__/course-detail/AssessmentSection.test.tsx` - 6 it.todo stubs
- `frontend/__tests__/course-detail/MaterialsSection.test.tsx` - 5 it.todo stubs
- `frontend/__tests__/course-detail/EdPostsPanel.test.tsx` - 4 it.todo stubs
- `frontend/__tests__/course-detail/CourseDetailPage.test.tsx` - 5 it.todo stubs
- `frontend/__tests__/course-detail/QuickLinksPanel.test.tsx` - 3 it.todo stubs
- `frontend/app/[locale]/(dashboard)/courses/[id]/page.tsx` - Server component route entry
- `frontend/components/course-detail/CourseDetailPage.tsx` - Placeholder component for Plan 03

## Decisions Made
- Created placeholder CourseDetailPage component to resolve TypeScript import errors until Plan 03 implements the full component
- Used vitest directory path filter (`vitest run __tests__/course-detail`) instead of `--testPathPattern` which is not supported in vitest 4.x

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- vitest 4.x does not support `--testPathPattern` CLI flag (used in plan's verify command) - resolved by using directory path argument instead

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- i18n namespace ready for all course detail components to consume
- useCourseDeadlines hook ready for integration in AssessmentSection and sidebar panels
- page.tsx route entry ready to serve the CourseDetailPage component from Plan 03
- 23 test stubs ready for Plan 02/03 to implement with real assertions

## Self-Check: PASSED

All 11 files verified present. Both task commits (b53c485, c959a1a) verified in git log.

---
*Phase: 07-course-detail-page*
*Completed: 2026-03-23*
