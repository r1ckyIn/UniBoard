---
phase: 11-timetable-page
plan: 02
subsystem: ui
tags: [react, timetable, grid, overlap, tailwind, next-intl]

requires:
  - phase: 11-timetable-page/plan-01
    provides: time-utils, overlap algorithm, types, course-colors
provides:
  - TimetableTitleRow with week slider, nav, mode toggle
  - TimetableGrid with dual-density 7-day time grid
  - TimetableEvent with overlap-aware course-colored blocks
  - TimetableDeadlineOverlay with dashed lines and hover tooltips
  - TimetableNowLine red current-time indicator
  - TimetableBreakMessage centered break week overlay
affects: [11-timetable-page/plan-03]

tech-stack:
  added: []
  patterns: [hexToRgb utility for dynamic rgba backgrounds, group/hover tooltip pattern, dual-density grid lines]

key-files:
  created:
    - frontend/components/timetable/TimetableTitleRow.tsx
    - frontend/components/timetable/TimetableGrid.tsx
    - frontend/components/timetable/TimetableEvent.tsx
    - frontend/components/timetable/TimetableDeadlineOverlay.tsx
    - frontend/components/timetable/TimetableNowLine.tsx
    - frontend/components/timetable/TimetableBreakMessage.tsx
  modified: []

key-decisions:
  - "Used hexToRgb helper for dynamic rgba(base, 0.13) event backgrounds instead of pre-computed soft colors"
  - "Used group/group-hover Tailwind pattern for deadline tooltip visibility toggle"
  - "TimetableEvent uses @/lib/i18n/navigation useRouter for locale-aware course navigation"

patterns-established:
  - "hexToRgb: convert hex to RGB string for inline rgba() with custom opacity"
  - "group-hover tooltip: Tailwind group parent + hidden group-hover:block child for hover tooltips"

requirements-completed: [UI-08]

duration: 5min
completed: 2026-03-25
---

# Phase 11 Plan 02: Timetable Grid Components Summary

**6 React components rendering a 7-day dual-density timetable grid with overlap-aware event blocks, deadline overlays, week slider, and break message**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-25T03:27:14Z
- **Completed:** 2026-03-25T03:32:30Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- TimetableTitleRow with week slider (1-14), prev/next navigation, All Weeks / Current Week mode toggle
- TimetableGrid with dual-density time axis (60px/hr normal, 28px/hr compressed), 7-day columns, scrollTo guard
- TimetableEvent with overlap-aware positioning via assignCols _col/_cc, course colors, conditional room display
- TimetableDeadlineOverlay with dashed lines, diamond dots, tag badges, and hover tooltips with urgency badges
- TimetableNowLine red current-time indicator with circle dot
- TimetableBreakMessage semi-transparent break week overlay

## Task Commits

Each task was committed atomically:

1. **Task 1: TimetableTitleRow, TimetableBreakMessage, and TimetableNowLine** - `75755a6` (feat)
2. **Task 2: TimetableEvent, TimetableDeadlineOverlay, and TimetableGrid** - `47af5e9` (feat)

## Files Created/Modified
- `frontend/components/timetable/TimetableTitleRow.tsx` - Title row with week slider, nav buttons, mode toggle
- `frontend/components/timetable/TimetableBreakMessage.tsx` - Centered break week overlay message
- `frontend/components/timetable/TimetableNowLine.tsx` - Red current-time indicator line with circle dot
- `frontend/components/timetable/TimetableEvent.tsx` - Individual event block with course color and overlap layout
- `frontend/components/timetable/TimetableDeadlineOverlay.tsx` - Deadline dashed lines with hover tooltips
- `frontend/components/timetable/TimetableGrid.tsx` - Main 7-day grid with dual-density time axis

## Decisions Made
- Used hexToRgb helper to compute dynamic rgba(base, 0.13) for event backgrounds, matching prototype per-course opacity
- Used Tailwind group/group-hover pattern for deadline tooltip visibility (cleaner than state-based approach)
- TimetableEvent navigates to /courses/{code} via i18n-aware useRouter for locale preservation
- Slider thumb styled with inline Tailwind pseudo-element selectors, matching TargetWamCard pattern from Phase 09

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 6 grid components ready for Plan 03 page assembly
- Components consume data props; Plan 03 will wire hooks and orchestrate the full page

## Self-Check: PASSED

All 6 component files verified present. Both task commits (75755a6, 47af5e9) confirmed in git log. TypeScript compiles with zero timetable-related errors.

---
*Phase: 11-timetable-page*
*Completed: 2026-03-25*
