---
phase: 11-timetable-page
plan: 03
subsystem: ui
tags: [react, timetable, portal, orchestrator, next-intl, tanstack-query]

# Dependency graph
requires:
  - phase: 11-timetable-page/plan-01
    provides: TanStack Query hooks (useTimetableSessions, useSemesterWeeks, useDeadlines, useCourses), types, fixtures
  - phase: 11-timetable-page/plan-02
    provides: TimetableTitleRow, TimetableGrid, TimetableEvent, TimetableDeadlineOverlay, TimetableNowLine, TimetableBreakMessage
provides:
  - TimetableUpcomingDeadlines right panel card with 4 nearest deadlines and urgency badges
  - TimetableCourseLegend right panel card with course color dots and enrolled count
  - TimetableRightPanel container assembling MiniCalendar, deadlines, legend
  - TimetablePage orchestrator with week state, mode toggle, portal injection
  - Route entry at /[locale]/timetable with server-side locale
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [page-orchestrator-portal-slot, computeCurrentWeek-from-system-date]

key-files:
  created:
    - frontend/components/timetable/TimetableUpcomingDeadlines.tsx
    - frontend/components/timetable/TimetableCourseLegend.tsx
    - frontend/components/timetable/TimetableRightPanel.tsx
    - frontend/components/timetable/TimetablePage.tsx
    - frontend/app/[locale]/(dashboard)/timetable/page.tsx
  modified: []

key-decisions:
  - "MiniCalendar reused from dashboard via withClientOnly wrapper, passed empty deadlineDays and noop onDateClick"
  - "computeCurrentWeek uses differenceInWeeks from date-fns with semester start date, clamped to 1-14"
  - "Deadline urgency classification: <=2 urgent, <=4 warning, <=7 normal, >7 later"

patterns-established:
  - "Page orchestrator: single client component managing all state, hooks, derived data, portal"
  - "computeCurrentWeek: system-date to semester-position mapping with fallback"

requirements-completed: [UI-08]

# Metrics
duration: 4min
completed: 2026-03-25
---

# Phase 11 Plan 03: Timetable Page Assembly Summary

**Complete timetable page with right panel (MiniCalendar, 4 nearest deadlines, course legend), orchestrator managing week state and mode toggle, and route entry at /timetable**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-25T03:35:48Z
- **Completed:** 2026-03-25T03:40:02Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- TimetableUpcomingDeadlines showing 4 nearest deadlines with course color stripes, urgency-based countdown badges, and tinted backgrounds
- TimetableCourseLegend with color dots, course code/name, and enrolled count badge
- TimetableRightPanel container with staggered AnimatedEntry delays for MiniCalendar, deadlines, legend
- TimetablePage orchestrator managing weekPosition, mode toggle, computeCurrentWeek from system date, portal injection, loading skeletons, and error retry
- Route entry at /[locale]/timetable with setRequestLocale and Suspense boundary

## Task Commits

Each task was committed atomically:

1. **Task 1: Right panel components (UpcomingDeadlines, CourseLegend, RightPanel container)** - `cdfed67` (feat)
2. **Task 2: TimetablePage orchestrator and route page.tsx** - `0758cf2` (feat)

## Files Created/Modified
- `frontend/components/timetable/TimetableUpcomingDeadlines.tsx` - 4 nearest deadlines with urgency badges and course color stripes
- `frontend/components/timetable/TimetableCourseLegend.tsx` - Course color dots, code/name, enrolled count badge
- `frontend/components/timetable/TimetableRightPanel.tsx` - Container assembling MiniCalendar + deadlines + legend with animations
- `frontend/components/timetable/TimetablePage.tsx` - Page orchestrator with week state, mode, portal, loading/error states
- `frontend/app/[locale]/(dashboard)/timetable/page.tsx` - Server component route entry with locale

## Decisions Made
- Reused MiniCalendar from dashboard with withClientOnly wrapper for Rough.js SSR safety, passing empty deadlineDays and noop onDateClick since timetable page doesn't need calendar deadline dots
- computeCurrentWeek uses differenceInWeeks(now, semesterStart) to auto-detect the current semester week position, with fallback to position 4
- Deadline urgency classification thresholds: <=2 days urgent (orange), <=4 days warning (amber), <=7 days normal (blue), >7 days later (green) -- matching the prototype badge colors

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 11 complete: all 3 plans delivered (data layer, grid components, page assembly)
- Timetable page is fully accessible at /en/timetable and /zh/timetable
- Full Next.js build passes, all 272 existing tests pass with no regressions
- Ready for next phase

## Self-Check: PASSED

All 5 created files verified present. Both task commits (cdfed67, 0758cf2) confirmed in git log. TypeScript compiles with zero timetable-related errors. Full build succeeds with timetable route in output.

---
*Phase: 11-timetable-page*
*Completed: 2026-03-25*
