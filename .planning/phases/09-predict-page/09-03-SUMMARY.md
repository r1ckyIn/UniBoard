---
phase: 09-predict-page
plan: 03
subsystem: ui
tags: [predict, wam-overview, target-slider, required-scores, semester-progress, portal, deep-link, orchestrator]

requires:
  - phase: 09-predict-page
    provides: "WAM engine (computeWAM, computeRequired), faculty weights, i18n predict namespace"
  - phase: 09-predict-page
    provides: "PredictCard, PredictTitleRow, PredictAssessmentTable, PredictGradeSummary components"
  - phase: 02-openapi-hooks
    provides: "GpaReport, AssessmentWeight types, useGpaReport, useCourseDetail hooks"
provides:
  - "WamOverviewCard: live WAM display with grade band badge and GPA conversion"
  - "TargetWamCard: range slider with fill gradient and gap badge"
  - "RequiredScoresCard: per-course required scores with feasibility icons"
  - "SemesterProgressCard: per-course progress bars with weighted overall"
  - "PredictPage orchestrator: page-level state, global WAM computation, portal injection"
  - "Next.js route at /[locale]/(dashboard)/predict with Suspense wrapper"
affects: [09-predict-page]

tech-stack:
  added: []
  patterns:
    - "useQueries for parallel N-course detail fetching"
    - "Faculty scheme localStorage persistence with validation"
    - "Deep-link auto-expand via URL search params"
    - "Portal-slot injection for right panel cards (4 cards)"

key-files:
  created:
    - frontend/components/predict/WamOverviewCard.tsx
    - frontend/components/predict/TargetWamCard.tsx
    - frontend/components/predict/RequiredScoresCard.tsx
    - frontend/components/predict/SemesterProgressCard.tsx
    - frontend/components/predict/PredictPage.tsx
    - frontend/app/[locale]/(dashboard)/predict/page.tsx
  modified:
    - frontend/__tests__/predict/PredictPage.test.tsx
    - frontend/components/dashboard/SkeletonCard.tsx

key-decisions:
  - "useQueries over individual hooks: parallel course detail fetching for N courses without hook-in-loop violation"
  - "useCourseDetail over useCourseGrades: need full AssessmentWeight[] (graded + ungraded) not just Grade[]"
  - "Generic SkeletonCard variant added for predict page loading state"

patterns-established:
  - "useQueries batch pattern: courseOptions.detail mapped over courses array for parallel fetch"
  - "Faculty scheme persistence: localStorage key uniboard-faculty-scheme with FacultyScheme validation"
  - "Deep-link auto-expand: searchParams.get('course') + setTimeout scroll after 400ms transition"

requirements-completed: [UI-04]

duration: 10min
completed: 2026-03-24
---

# Phase 09 Plan 03: Predict Page Assembly Summary

**Complete Predict page with 4 right panel cards (WAM overview, target slider, required scores, progress), PredictPage orchestrator with global WAM computation, and /predict route with deep-link support**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-24T03:56:24Z
- **Completed:** 2026-03-24T04:06:27Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- 4 right panel cards (WamOverviewCard, TargetWamCard, RequiredScoresCard, SemesterProgressCard) with RoughCard hand-drawn borders matching prototype styling
- PredictPage orchestrator wiring all components with page-level state (predictions, faculty scheme, target WAM, expanded cards)
- Global WAM/Required computation via computeWAM/computeRequired from Plan 01 engine
- useQueries for parallel course detail fetching — assessment_weights for all 5 courses
- Deep-link auto-expand (?course=COMP2017 expands and scrolls to matching card)
- Faculty scheme persistence to localStorage with validation
- 9 component tests replacing Wave 0 stubs, all passing

## Task Commits

Each task was committed atomically:

1. **Task 1: Right panel cards (WamOverview, TargetWam, RequiredScores, SemesterProgress)** - `678ed32` (feat)
2. **Task 2: PredictPage orchestrator + route page + PredictPage tests** - `e86a3e4` (feat)

## Files Created/Modified
- `frontend/components/predict/WamOverviewCard.tsx` - WAM number, grade band badge, GPA conversion, basis text
- `frontend/components/predict/TargetWamCard.tsx` - Range slider with fill gradient, gap badge with on-track/to-go state
- `frontend/components/predict/RequiredScoresCard.tsx` - Per-course required scores with CheckCircle/AlertTriangle/XCircle/Lock icons
- `frontend/components/predict/SemesterProgressCard.tsx` - Per-course RoughProgressBar with weighted overall percentage
- `frontend/components/predict/PredictPage.tsx` - Page orchestrator with state management, WAM computation, portal injection, deep-link
- `frontend/app/[locale]/(dashboard)/predict/page.tsx` - Next.js route with Suspense wrapper for useSearchParams
- `frontend/__tests__/predict/PredictPage.test.tsx` - 9 tests (title, cards, expand, input, deep-link, faculty, skeleton, portal WAM, portal slider)
- `frontend/components/dashboard/SkeletonCard.tsx` - Added generic variant for predict page loading

## Decisions Made
- Used `useQueries` from TanStack Query v5 to fetch course details for all N courses in parallel, avoiding the hooks-in-loop anti-pattern
- Used `useCourseDetail` instead of `useCourseGrades` (plan specified `useCourseGrades`) because the predict page needs full `AssessmentWeight[]` including ungraded assessments, not just graded `Grade[]` objects
- Added `generic` variant to SkeletonCard (plan referenced it but it didn't exist)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added generic SkeletonCard variant**
- **Found during:** Task 2 (PredictPage orchestrator)
- **Issue:** Plan references `SkeletonCard variant="generic"` but no generic variant existed in SkeletonCard
- **Fix:** Added GenericSkeleton component and registered it in VARIANT_MAP
- **Files modified:** frontend/components/dashboard/SkeletonCard.tsx
- **Verification:** TypeScript compilation passes, loading state renders correctly
- **Committed in:** e86a3e4 (Task 2 commit)

**2. [Rule 1 - Bug] Used useCourseDetail instead of useCourseGrades**
- **Found during:** Task 2 (PredictPage orchestrator)
- **Issue:** Plan specified `useCourseGrades` hook but that returns `Grade[]` (graded-only items). PredictPage needs `AssessmentWeight[]` (all items including ungraded) for score prediction inputs and WAM computation
- **Fix:** Used `useCourseDetail` which returns `CourseDetail` with `assessment_weights: AssessmentWeight[]`
- **Files modified:** frontend/components/predict/PredictPage.tsx
- **Verification:** All 5 course cards render with correct graded/ungraded assessments
- **Committed in:** e86a3e4 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correct functionality. No scope creep.

## Issues Encountered
- Vitest 4.x `findAllByTestId` needed for async `useQueries` resolution (cards not available synchronously)
- Multiple `score-input-3` test IDs across 5 expanded cards required `within()` scoping in tests

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Complete Predict page ready at /predict route with all interactive features
- Phase 09 (predict-page) fully complete — all 3 plans executed
- Ready for /pr-cycle

## Self-Check: PASSED

All 7 files verified present. Both commit hashes (678ed32, e86a3e4) confirmed in git log.

---
*Phase: 09-predict-page*
*Completed: 2026-03-24*
