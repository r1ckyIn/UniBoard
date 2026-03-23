---
phase: 08-deadlines-page
plan: 02
subsystem: ui
tags: [deadlines, timeline, roughjs, expandable-card, date-fns, vitest]

# Dependency graph
requires:
  - phase: 08-deadlines-page
    provides: "i18n namespace (23 keys), shared urgency utility, route entry, Wave 0 test stubs"
  - phase: 05-dashboard-page
    provides: "DeadlineTimeline Rough.js dot drawing pattern, AnimatedEntry component"
  - phase: 06-courses-page
    provides: "CoursesPage orchestrator pattern (loading/error/empty/content)"
provides:
  - "DeadlineCard: expandable card with summary, urgency badge, materials, AI chat placeholder"
  - "DeadlineTimelineView: CSS vertical line with Rough.js dots and staggered animations"
  - "DeadlineTitleRow: page header with filter controls and view toggle"
  - "DeadlinesPage: full page orchestrator with client-side filtering and state management"
  - "14 passing tests across DeadlineCard (6) and DeadlinesPage (8)"
affects: [08-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-side filtering with useMemo for responsive course and time-mode filtering"
    - "Accordion expand pattern with max-height CSS transition"
    - "Per-card Rough.js dot via withClientOnly SSR-safe wrapper"

key-files:
  created:
    - "frontend/components/deadlines/DeadlineCard.tsx"
    - "frontend/components/deadlines/DeadlineTimelineView.tsx"
    - "frontend/components/deadlines/DeadlineTitleRow.tsx"
  modified:
    - "frontend/components/deadlines/DeadlinesPage.tsx"
    - "frontend/__tests__/deadlines/DeadlineCard.test.tsx"
    - "frontend/__tests__/deadlines/DeadlinesPage.test.tsx"

key-decisions:
  - "Compute daysRemaining via differenceInCalendarDays(due_date, now) instead of using fixture days_remaining field — matches research pitfall #4"
  - "Client-side filtering (course + time mode) via useMemo for instant UI response, no server round-trips"
  - "Placeholder materials and AI summary since Deadline schema has no materials/summary fields"

patterns-established:
  - "Accordion card pattern: max-height 0/800px with cubic-bezier transition for expandable sections"
  - "Per-card Rough.js dot rendering via withClientOnly wrapper for SSR safety"

requirements-completed: [UI-03]

# Metrics
duration: 10min
completed: 2026-03-23
---

# Phase 08 Plan 02: Core Deadlines Page Summary

**Expandable timeline cards with urgency badges, materials/AI sections, page orchestrator with client-side course and time-mode filtering**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-23T10:28:07Z
- **Completed:** 2026-03-23T10:38:10Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- DeadlineCard renders expandable cards matching prototype: title, urgency badge, course info, due date, AI summary, expand hint, materials section, AI chat Coming Soon placeholder
- DeadlineTimelineView renders timeline with CSS vertical line, per-card Rough.js dots, and staggered entry animations
- DeadlineTitleRow renders page header with Calendar icon, semester badge, filter count, course dropdown, All/This Week toggle, and Timeline/Calendar toggle
- DeadlinesPage orchestrator fetches via useDeadlines, filters client-side by course and time mode, manages expanded card accordion state, handles loading/error/empty/content states
- 14 tests passing (6 DeadlineCard + 8 DeadlinesPage), 0 it.todo() remaining in those files

## Task Commits

Each task was committed atomically:

1. **Task 1: DeadlineCard + DeadlineTimelineView components** - `9128add` (feat)
2. **Task 2: DeadlineTitleRow + DeadlinesPage orchestrator + page test** - `59b780b` (feat)

## Files Created/Modified
- `frontend/components/deadlines/DeadlineCard.tsx` - Expandable card with summary, urgency badge, materials section, AI chat placeholder
- `frontend/components/deadlines/DeadlineTimelineView.tsx` - Timeline container with CSS vertical line, Rough.js dots, AnimatedEntry stagger
- `frontend/components/deadlines/DeadlineTitleRow.tsx` - Page title row with filter controls and view mode toggle
- `frontend/components/deadlines/DeadlinesPage.tsx` - Page orchestrator with useDeadlines, filtering, expand state, loading/error/empty states
- `frontend/__tests__/deadlines/DeadlineCard.test.tsx` - 6 tests: title, urgency badge, expand hint, materials on click, AI Coming Soon, color stripe
- `frontend/__tests__/deadlines/DeadlinesPage.test.tsx` - 8 tests: title, skeleton, empty, error, data render, course filter, mode toggle, view switch

## Decisions Made
- Compute daysRemaining via differenceInCalendarDays(due_date, now) instead of using fixture days_remaining — avoids stale data per research pitfall #4
- Client-side filtering (course + time mode) via useMemo for instant UI response, no server round-trips needed
- Placeholder materials and AI summary hardcoded since Deadline schema has no materials/summary fields (will be replaced with real data when backend supports it)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- jsdom converts hex color values to rgb() format in inline styles; fixed test assertions to use rgb() format instead of hex

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All core page components ready for Plan 03 (Calendar view + integration testing)
- DeadlineTimelineView and DeadlineCard ready for real data integration
- 5 remaining todo stubs in DeadlineCalendarView.test.tsx for Plan 03

## Self-Check: PASSED

- All 6 key files verified present on disk
- Commits 9128add and 59b780b verified in git log
- Full deadlines test suite: 14 passed, 5 todo (calendar view for Plan 03)

---
*Phase: 08-deadlines-page*
*Completed: 2026-03-23*
