---
phase: 09-predict-page
plan: 01
subsystem: ui
tags: [wam, gpa, prediction, faculty-weights, pure-functions, i18n]

requires:
  - phase: 02-openapi-hooks
    provides: "GpaReport, GpaCourseSummary, AssessmentWeight types"
provides:
  - "WAM calculation engine (computeCurrent, computeProjected, computeWAM, computeRequired)"
  - "Faculty weight schemes (standard, engineering, science_honours)"
  - "WAM-to-GPA 4.0 conversion and feasibility classification"
  - "Predict i18n namespace (en + zh)"
  - "Wave 0 test stubs for PredictCard and PredictPage components"
affects: [09-predict-page]

tech-stack:
  added: []
  patterns:
    - "Pure function computation engine separate from React components"
    - "Faculty-specific level weight mapping via function record"
    - "0-1 weight scale normalization for all WAM calculations"

key-files:
  created:
    - frontend/lib/predict/faculty-weights.ts
    - frontend/lib/predict/wam-engine.ts
    - frontend/lib/predict/wam-to-gpa.ts
    - frontend/__tests__/predict/faculty-weights.test.ts
    - frontend/__tests__/predict/wam-engine.test.ts
    - frontend/__tests__/predict/PredictCard.test.tsx
    - frontend/__tests__/predict/PredictPage.test.tsx
  modified:
    - frontend/messages/en.json
    - frontend/messages/zh.json

key-decisions:
  - "Pure function engine pattern: WAM computation extracted as testable pure functions without React dependency"
  - "0-1 weight scale: all calculations use fixture 0-1 weights, not prototype 0-100 scale"
  - "Step-function GPA mapping: wamToGpa uses discrete thresholds matching prototype, not linear interpolation"

patterns-established:
  - "CourseComputeData interface: unified data shape for WAM engine input"
  - "FACULTY_WEIGHTS record: function-per-scheme for extensible faculty support"
  - "getLevelFromCode: regex-based course level parsing from USYD course codes"

requirements-completed: [UI-04]

duration: 4min
completed: 2026-03-24
---

# Phase 09 Plan 01: WAM Engine + i18n Summary

**Pure WAM calculation engine with 3 USYD faculty schemes, reverse-calculation, GPA conversion, and predict i18n namespace in both locales**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-24T03:41:00Z
- **Completed:** 2026-03-24T03:45:26Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- WAM engine pure functions (computeCurrent, computeProjected, computeWAM, computeRequired) correctly implement USYD WAM formula for Standard, Engineering, and Science Honours faculty schemes
- Reverse calculation algorithm matches prototype behavior, assuming other courses maintain current average on remaining work
- i18n predict namespace with 40+ keys added to both en.json and zh.json with full parity
- Wave 0 test stubs created for PredictCard (6 todos) and PredictPage (7 todos) components

## Task Commits

Each task was committed atomically:

1. **Task 1: WAM calculation engine + faculty weights + WAM-to-GPA conversion** - `4dd3fc2` (feat)
2. **Task 2: i18n predict namespace + Wave 0 component test stubs** - `5befbfb` (feat)

## Files Created/Modified
- `frontend/lib/predict/faculty-weights.ts` - Faculty scheme type and FACULTY_WEIGHTS map with getLevelFromCode utility
- `frontend/lib/predict/wam-engine.ts` - Pure functions: computeCurrent, computeProjected, computeWAM, computeRequired
- `frontend/lib/predict/wam-to-gpa.ts` - WAM-to-GPA 4.0 step conversion and feasibility classification
- `frontend/__tests__/predict/faculty-weights.test.ts` - Tests for all 3 schemes and getLevelFromCode
- `frontend/__tests__/predict/wam-engine.test.ts` - Tests for computeCurrent, computeProjected, computeWAM, computeRequired, wamToGpa, getFeasibility
- `frontend/__tests__/predict/PredictCard.test.tsx` - Wave 0 test stubs (6 it.todo)
- `frontend/__tests__/predict/PredictPage.test.tsx` - Wave 0 test stubs (7 it.todo)
- `frontend/messages/en.json` - Added predict namespace
- `frontend/messages/zh.json` - Added predict namespace (Chinese translations)

## Decisions Made
- Used pure function engine pattern: all WAM computation is separate from React, making it trivially testable and reusable
- All calculations use 0-1 weight scale (matching fixture data), not 0-100 scale (as in prototype JS). Conversion happens at the boundary via normalization
- Step-function GPA mapping (85+=4.0, 75+=3.5, etc.) matching prototype, not linear interpolation
- CourseComputeData includes `level` field (parsed from course code) rather than relying on `level_weight` from API, enabling faculty scheme switching

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Vitest 4.x uses positional filter arguments instead of `--testPathPattern` flag. Adjusted test commands accordingly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- WAM engine foundation complete for Plans 02 and 03 to build UI components on top
- Wave 0 test stubs ready for implementation in Plan 02 (PredictCard) and Plan 03 (PredictPage)
- i18n keys ready for all predict page components

---
*Phase: 09-predict-page*
*Completed: 2026-03-24*
