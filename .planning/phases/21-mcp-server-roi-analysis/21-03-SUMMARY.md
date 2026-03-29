---
phase: 21-mcp-server-roi-analysis
plan: 03
subsystem: ui
tags: [tanstack-query, react, roughjs, i18n, roi]

requires:
  - phase: 21-mcp-server-roi-analysis/02
    provides: ROI backend endpoint (GET /api/v1/courses/{course_id}/roi)
provides:
  - TanStack Query hook (useRoi) for ROI data fetching
  - RoiCard component with priority-ranked assignments
  - PredictPage integration with ROI section in right panel
  - i18n strings for ROI section (en + zh)
affects: [predict-page, frontend-components]

tech-stack:
  added: []
  patterns: [useQueries multi-course fetch in right-panel card]

key-files:
  created:
    - frontend/hooks/use-roi.ts
    - frontend/components/predict/RoiCard.tsx
  modified:
    - frontend/components/predict/PredictPage.tsx
    - frontend/messages/en.json
    - frontend/messages/zh.json

key-decisions:
  - "RoiCard uses useQueries for parallel per-course ROI fetch (same pattern as courseDetailQueries in PredictPage)"
  - "Skips already-graded assignments in ranking (score != null) to show only actionable items"
  - "Max 6 items shown to keep card compact in right panel"

patterns-established:
  - "Right-panel data card with own useQueries fetch: card receives course IDs as props, fetches independently"

requirements-completed: [TUTOR-03]

duration: 4min
completed: 2026-03-29
---

# Phase 21 Plan 03: ROI Frontend Visualization Summary

**ROI ranking card in Predict page right panel with TanStack Query hook, priority indicators, and bilingual i18n**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T09:00:24Z
- **Completed:** 2026-03-29T09:04:50Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- TanStack Query hook (useRoi) with roiKeys factory and roiOptions for GET /api/v1/courses/{courseId}/roi
- RoiCard component ranking ungraded assignments by ROI score with visual priority (green/amber/gray)
- PredictPage integration placing RoiCard below SemesterProgressCard in right panel portal
- 8 i18n strings added for both English and Chinese

## Task Commits

Each task was committed atomically:

1. **Task 1: ROI hook and RoiCard component** - `2fa6b77` (feat)
2. **Task 2: PredictPage integration and i18n** - `936fa00` (feat)

## Files Created/Modified
- `frontend/hooks/use-roi.ts` - TanStack Query hook with AssignmentROI/CourseROIResponse types, roiKeys, roiOptions, useRoi
- `frontend/components/predict/RoiCard.tsx` - Right-panel card: useQueries multi-course fetch, ranked list with priority colors, AI badge, difficulty dots
- `frontend/components/predict/PredictPage.tsx` - Added RoiCard import and portal entry at delay=9
- `frontend/messages/en.json` - 8 ROI i18n strings (roi_title, roi_empty, roi_focus, roi_normal, roi_low, roi_weight, roi_difficulty, roi_ai_badge)
- `frontend/messages/zh.json` - 8 ROI i18n strings (Chinese translations)

## Decisions Made
- Used RoughCard (not RoughBox which doesn't exist) matching all other right-panel cards
- RoiCard fetches data independently via useQueries rather than receiving pre-fetched data as props, keeping PredictPage orchestrator lean
- Skips graded assignments (score != null) to only show actionable priorities
- Difficulty displayed as filled/empty dot characters for compact visual representation
- AI-estimated badge only shows when both has_ai_estimates is true AND individual assignment has ai_inference source

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] RoughBox does not exist, used RoughCard**
- **Found during:** Task 1 (RoiCard component)
- **Issue:** Plan referenced RoughBox component but project uses RoughCard
- **Fix:** Used RoughCard with disableHover padding pattern matching other right-panel cards
- **Files modified:** frontend/components/predict/RoiCard.tsx
- **Verification:** TypeScript compiles, matches existing pattern in WamOverviewCard/RequiredScoresCard/SemesterProgressCard

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Trivial naming correction. No scope change.

## Known Stubs

None. RoiCard fetches real data from the backend ROI endpoint; all UI elements are wired to actual data fields.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 21 (MCP Server ROI Analysis) is now complete with all 3 plans delivered
- Backend ROI service (plan 02) + frontend visualization (plan 03) fully wired
- Ready for /pr-cycle to merge the feature branch

## Self-Check: PASSED

All 6 files found, both commits verified, all key content checks passed.

---
*Phase: 21-mcp-server-roi-analysis*
*Completed: 2026-03-29*
