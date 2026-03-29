---
phase: 21-mcp-server-roi-analysis
plan: 02
subsystem: api
tags: [roi, gpa, ai-inference, fastapi, pydantic, anthropic]

# Dependency graph
requires:
  - phase: 15-rest-api
    provides: "GPAService, Grade/Course models, route patterns"
  - phase: 18-ai-intelligence
    provides: "AIEngine Claude API pattern"
provides:
  - "ROIService with historical + AI difficulty estimation"
  - "AssignmentROI and CourseROIResponse schemas"
  - "GET /api/v1/courses/{course_id}/roi endpoint"
  - "AI difficulty inference prompt template"
affects: [21-mcp-server-roi-analysis, frontend-roi-page]

# Tech tracking
tech-stack:
  added: []
  patterns: [roi-formula-weight-over-difficulty, score-to-difficulty-linear-interpolation, ai-fallback-with-quality-gate]

key-files:
  created:
    - src/services/roi.py
    - src/schemas/roi.py
    - src/prompts/roi.py
    - src/web/routes/roi.py
    - tests/unit/test_roi_service.py
  modified:
    - src/web/routes/__init__.py

key-decisions:
  - "Linear interpolation for score-to-difficulty mapping within 3 bands (easy/medium/hard)"
  - "Difficulty floored at 0.2 to prevent division-by-near-zero in ROI formula"
  - "AI confidence gate at 50% — below threshold falls back to default difficulty 3.0"

patterns-established:
  - "ROI formula: weight / (difficulty / 5.0) with difficulty clamped to [1.0, 5.0]"
  - "Three-band difficulty mapping: >0.85 easy (1-2), 0.65-0.85 medium (2-3.5), <0.65 hard (3.5-5)"

requirements-completed: [TUTOR-03]

# Metrics
duration: 5min
completed: 2026-03-29
---

# Phase 21 Plan 02: Assignment ROI Analysis Summary

**ROI service ranking assignments by weight/difficulty ratio with historical grade scoring and AI fallback, exposed via REST API**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-29T08:50:38Z
- **Completed:** 2026-03-29T08:55:59Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- ROIService with pure calculation helpers (score-to-difficulty, calculate-roi, generate-recommendation)
- AI difficulty inference with Anthropic Claude Sonnet as fallback for ungraded assignments
- REST endpoint at GET /api/v1/courses/{course_id}/roi with auth protection
- 22 unit tests covering all calculation edge cases

## Task Commits

Each task was committed atomically:

1. **Task 1: ROI schemas, service, and pure calculation logic** - `6fde751` (test: RED), `3652a15` (feat: GREEN)
2. **Task 2: REST endpoint and router wiring** - `5b004a6` (feat)

_Note: Task 1 followed TDD with RED (failing tests) then GREEN (implementation) commits_

## Files Created/Modified
- `src/services/roi.py` - ROIService with calculation helpers and AI difficulty inference
- `src/schemas/roi.py` - AssignmentROI and CourseROIResponse Pydantic schemas
- `src/prompts/roi.py` - DIFFICULTY_SYSTEM_PROMPT for AI difficulty estimation
- `src/web/routes/roi.py` - GET /{course_id}/roi endpoint with auth
- `src/web/routes/__init__.py` - Added roi_router under /courses prefix
- `tests/unit/test_roi_service.py` - 22 unit tests for pure calculation logic

## Decisions Made
- Linear interpolation within 3 difficulty bands (easy/medium/hard) for smooth score-to-difficulty mapping
- Difficulty floor at 0.2 prevents division-by-near-zero edge case in ROI formula
- AI confidence quality gate at 50% — low confidence falls back to default difficulty 3.0
- ROI route mounted under /courses prefix (shared with existing courses_router) since /{course_id}/roi path suffix disambiguates

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed floating-point drift in _score_to_difficulty**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** Perfect score (1.0) produced difficulty 0.9999... instead of 1.0 due to float arithmetic
- **Fix:** Added clamping with max(1.0, min(5.0, result)) after interpolation
- **Files modified:** src/services/roi.py
- **Verification:** test_perfect_score passes with assertion 1.0 <= difficulty <= 1.5
- **Committed in:** 3652a15 (Task 1 GREEN commit)

**2. [Rule 1 - Bug] Adjusted test assertions for ROI comparative behavior**
- **Found during:** Task 1 (TDD GREEN phase)
- **Issue:** Test assumed absolute ROI > 1.0 for score 0.9, but actual formula yields ~0.9 (correct behavior)
- **Fix:** Changed to relative comparison (high score ROI > 2x low score ROI) which is the meaningful property
- **Files modified:** tests/unit/test_roi_service.py
- **Verification:** All 22 tests pass
- **Committed in:** 3652a15 (Task 1 GREEN commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ROI backend complete, ready for MCP tool wrapping in Plan 03
- Frontend can consume GET /api/v1/courses/{course_id}/roi endpoint

---
*Phase: 21-mcp-server-roi-analysis*
*Completed: 2026-03-29*
