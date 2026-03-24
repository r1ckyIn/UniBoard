---
phase: 09-predict-page
plan: 02
subsystem: ui
tags: [predict, expandable-card, assessment-table, grade-summary, css-transition]

requires:
  - phase: 09-predict-page
    provides: "WAM engine (computeCurrent, computeProjected), faculty weights, i18n predict namespace"
  - phase: 02-openapi-hooks
    provides: "GpaCourseSummary, AssessmentWeight types"
provides:
  - "PredictTitleRow component with heading, badges, faculty selector"
  - "PredictAssessmentTable 3-column table with score inputs"
  - "PredictGradeSummary current/projected/note row"
  - "PredictCard expandable shell with CSS border + left stripe"
affects: [09-predict-page]

tech-stack:
  added: []
  patterns:
    - "Expandable card with CSS max-height transition (400ms cubic-bezier) matching DeadlineCard pattern"
    - "3-column assessment table without Due Date column (vs 4-column in Phase 7)"
    - "Score input clamping via parseInt + Math.max/min for 0-100 range"

key-files:
  created:
    - frontend/components/predict/PredictTitleRow.tsx
    - frontend/components/predict/PredictAssessmentTable.tsx
    - frontend/components/predict/PredictGradeSummary.tsx
    - frontend/components/predict/PredictCard.tsx
  modified:
    - frontend/__tests__/predict/PredictCard.test.tsx

key-decisions:
  - "3-column assessment table: dropped Due Date column from Phase 7 pattern to focus on Assessment/Weight/Score"
  - "Multi-expand support: multiple cards can be open simultaneously (not accordion like prototype)"
  - "Mark color thresholds: 75+ uses courseColor, 65+ amber, 50+ grey, below uses orange-red"

patterns-established:
  - "PredictCard props pattern: course + assessments + predictions + onPredictionChange + expand state"
  - "Score input stopPropagation: input clicks don't trigger card collapse"
  - "Grade badge fallback: show projected grade band when available, fall back to current"

requirements-completed: [UI-04]

duration: 4min
completed: 2026-03-24
---

# Phase 09 Plan 02: Predict Card Components Summary

**Expandable PredictCard with 3-column assessment table, dashed-underline score inputs, grade summary row, and title row with faculty selector**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-24T03:48:29Z
- **Completed:** 2026-03-24T03:53:26Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- PredictTitleRow with Target icon, heading, semester badge, cp badge, and faculty scheme selector
- PredictAssessmentTable with 3-column layout (Assessment/Weight/Score), progress bars, graded badges, and dashed-underline numeric inputs
- PredictGradeSummary with current/projected/note sections separated by vertical dividers
- PredictCard expandable shell with CSS border, left color stripe, multi-expand support, and max-height transition
- 8 component tests replacing Wave 0 stubs (renders collapsed, expands, shows inputs, clamps 0-100, graded badges, projected calculation, input click isolation)

## Task Commits

Each task was committed atomically:

1. **Task 1: PredictTitleRow + PredictAssessmentTable + PredictGradeSummary** - `d516533` (feat)
2. **Task 2: PredictCard expandable shell + update PredictCard tests** - `5bb052f` (feat)

## Files Created/Modified
- `frontend/components/predict/PredictTitleRow.tsx` - Title row with heading, badges, faculty selector
- `frontend/components/predict/PredictAssessmentTable.tsx` - 3-column assessment table with score inputs
- `frontend/components/predict/PredictGradeSummary.tsx` - Grade summary row with current/projected/note
- `frontend/components/predict/PredictCard.tsx` - Expandable course prediction card shell
- `frontend/__tests__/predict/PredictCard.test.tsx` - 8 component tests (replaced 6 it.todo stubs)

## Decisions Made
- Dropped Due Date column from assessment table to create focused 3-column layout (Assessment 50%, Weight 20%, Score 30%)
- Used multi-expand behavior instead of accordion (prototype uses accordion but plan specifies multi-expand)
- Applied mark color thresholds matching prototype: >= 75 course color, >= 65 amber, >= 50 grey, < 50 orange-red
- Input click stopPropagation prevents card collapse when interacting with score inputs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Vitest 4.x does not support `-x` flag (use `--bail 1` instead). Adjusted test commands accordingly.
- Pre-existing TypeScript error in unrelated CourseCard.test.tsx (missing `beforeEach` import) - out of scope.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 4 card components ready for Plan 03 to compose into PredictPage
- PredictPage.test.tsx Wave 0 stubs (7 todos) ready for implementation
- Title row, card list, and assessment interaction surface complete

## Self-Check: PASSED

All 5 files verified present. Both commit hashes (d516533, 5bb052f) confirmed in git log.

---
*Phase: 09-predict-page*
*Completed: 2026-03-24*
