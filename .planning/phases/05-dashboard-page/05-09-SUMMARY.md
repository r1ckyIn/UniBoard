---
phase: 05-dashboard-page
plan: 09
subsystem: ui
tags: [rough.js, donut-chart, assessment-types, i18n, legend]

requires:
  - phase: 05-dashboard-page
    provides: AssessmentDonut component, DashboardPage wiring, OpenAPI schema
provides:
  - Type-based colored Rough.js donut with legend and pop-out highlight
  - group_name field on AssessmentWeight schema and fixtures
affects: [dashboard-page, course-detail]

tech-stack:
  added: []
  patterns: [TYPE_COLORS record for assessment type coloring, pop-out highlight via midpoint angle offset]

key-files:
  created: []
  modified:
    - frontend/components/dashboard/AssessmentDonut.tsx
    - frontend/components/dashboard/DashboardPage.tsx
    - frontend/openapi/openapi.yaml
    - frontend/lib/api/types.gen.d.ts
    - frontend/lib/fixtures/courses.ts
    - frontend/messages/en.json
    - frontend/messages/zh.json

key-decisions:
  - "TYPE_COLORS record mapping group_name to hex colors replaces course-color palette generation"
  - "Pop-out highlight uses 6px offset along midpoint angle instead of stroke-width change"
  - "courseColor prop removed from AssessmentDonut — colors fully determined by assessment type"
  - "Badge now uses neutral cream-2 background instead of courseColor tint"

patterns-established:
  - "TYPE_COLORS: centralized assessment type -> color mapping for consistent visual identity"
  - "Pop-out highlight pattern: offset segment center by N px along midAngle for selected state"

requirements-completed: [UI-01]

duration: 5min
completed: 2026-03-23
---

# Phase 05 Plan 09: Assessment Donut Type-Based Colors Summary

**Rewrote AssessmentDonut with type-based colors (quiz=blue, exam=brown, assignment=green), Rough.js cross-hatch legend, 6px pop-out highlight, and zero animation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-23T00:54:49Z
- **Completed:** 2026-03-23T00:59:52Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added `group_name` field to AssessmentWeight across OpenAPI schema, TypeScript types, and all fixture data
- Rewrote AssessmentDonut to derive segment colors from assessment type group (TYPE_COLORS record) instead of course color
- Added legend component in bottom-right corner with colored squares and i18n type labels
- Replaced stroke-width highlight with 6px pop-out along midpoint angle for selected segments
- Removed all rAF converge animation — donut renders immediately on mount

## Task Commits

Each task was committed atomically:

1. **Task 1: Add group_name to AssessmentWeight schema, fixtures, and type codegen** - `05aff00` (feat)
2. **Task 2: Rewrite AssessmentDonut with type-based colors, legend, pop-out highlight, no animation** - `3ca7a5a` (feat)

## Files Created/Modified
- `frontend/openapi/openapi.yaml` - Added group_name to AssessmentWeight required fields and properties
- `frontend/lib/api/types.gen.d.ts` - Added group_name: string to AssessmentWeight codegen type
- `frontend/lib/fixtures/courses.ts` - Added group_name to all 23 assessment_weight fixture entries
- `frontend/components/dashboard/AssessmentDonut.tsx` - Full rewrite: TYPE_COLORS, legend, pop-out, no animation
- `frontend/components/dashboard/DashboardPage.tsx` - Pass group_name, remove courseColor prop and import
- `frontend/messages/en.json` - Added donut.legend keys (Quiz, Exam, Assignment, Lab, Project, Report, Other)
- `frontend/messages/zh.json` - Added donut.legend keys in Chinese

## Decisions Made
- TYPE_COLORS record maps group_name directly to hex colors, replacing generateSegmentPalette function
- Pop-out highlight (6px offset along midAngle) replaces stroke-width thickening for more visible selection
- Removed courseColor prop entirely — badge now uses neutral cream-2 background
- desaturateColor function retained for upcoming segment visual distinction

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused getCourseColor import and donutColor variable**
- **Found during:** Task 2 (AssessmentDonut rewrite)
- **Issue:** After removing courseColor prop, the getCourseColor import and donutColor variable in DashboardPage became unused, would cause lint errors
- **Fix:** Removed both the import and variable declaration
- **Files modified:** frontend/components/dashboard/DashboardPage.tsx
- **Verification:** Build passes, no unused variable warnings
- **Committed in:** 3ca7a5a (Task 2 commit)

**2. [Rule 1 - Bug] Changed badge background to neutral cream-2**
- **Found during:** Task 2 (AssessmentDonut rewrite)
- **Issue:** Badge background was derived from courseColor which no longer exists as a prop
- **Fix:** Changed to use CSS variable `var(--color-cream-2)` with `text-text-2` class for neutral styling
- **Files modified:** frontend/components/dashboard/AssessmentDonut.tsx
- **Verification:** Build passes, badge renders with neutral background
- **Committed in:** 3ca7a5a (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs from prop removal)
**Impact on plan:** Both auto-fixes necessary to complete courseColor removal cleanly. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- AssessmentDonut now fully type-based colored with Rough.js hand-drawn style
- Ready for Plan 10 (remaining UAT gap closure tasks)

---
*Phase: 05-dashboard-page*
*Completed: 2026-03-23*
