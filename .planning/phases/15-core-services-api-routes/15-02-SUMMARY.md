---
phase: 15-core-services-api-routes
plan: 02
subsystem: api
tags: [fastapi, pydantic, deadline, materials, intelligence, search, cursor-pagination]

# Dependency graph
requires:
  - phase: 13-supabase-migration
    provides: ORM models (UnifiedDeadline, DiscussionThread, Module, Lesson)
  - phase: 14-adapters-resilience
    provides: Platform adapter layer with circuit breakers
provides:
  - Contract-aligned Pydantic schemas for Deadline, Material, Discussion, Search
  - GET /deadlines/upcoming endpoint (7-day window)
  - Flat Material[] response shape for materials endpoint
  - Flat SearchResult[] response shape for search endpoint
  - Cursor-paginated Discussion[] with filter modes (high_value/endorsed/staff/all)
affects: [15-03, 16-sync-engine, frontend-api-switch]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Adapter pattern: route-level legacy-to-contract conversion via helper functions"
    - "Cursor pagination: base64-encoded created_at timestamps"
    - "Filter modes via match/case in service layer"

key-files:
  created:
    - tests/unit/test_contract_schemas.py
  modified:
    - src/schemas/deadline.py
    - src/schemas/materials.py
    - src/schemas/intelligence.py
    - src/web/routes/deadlines.py
    - src/web/routes/materials.py
    - src/web/routes/intelligence.py
    - src/services/intelligence.py

key-decisions:
  - "Route-level adapter pattern: legacy service returns are converted to contract shape in route handlers, keeping service layer unchanged"
  - "Status/days_remaining computed at route level from due_date, not stored in DB"
  - "Discussion author comes directly from ORM model (DiscussionThread.author field exists)"
  - "Relevance score derived from is_endorsed/is_staff_post when stored score is 0.0"

patterns-established:
  - "_to_contract_* helper functions for legacy-to-contract conversion at route level"
  - "base64(created_at) cursor pagination pattern for list endpoints"
  - "match/case filter_mode dispatch in service methods"

requirements-completed: [DL-01, INTEL-01, INTEL-05, FILE-01, FILE-02]

# Metrics
duration: 7min
completed: 2026-03-27
---

# Phase 15 Plan 02: Deadline/Materials/Intelligence/Search Contract Alignment Summary

**Contract-aligned schemas and routes for Deadline (with status/days_remaining), Material (flat array), Discussion (with author/relevance/cursor pagination), and Search (flat array with relevance)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-27T03:28:57Z
- **Completed:** 2026-03-27T03:35:57Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Contract-aligned Pydantic schemas for all four domains (Deadline, Material, Discussion, Search) matching types.gen.d.ts exactly
- New GET /deadlines/upcoming endpoint filtering to 7-day window, placed before /{deadline_id} to avoid path capture
- Materials endpoint now returns flat Material[] instead of nested {course_id, course_name, folders: [...]} object
- Search endpoint returns flat SearchResult[] with relevance field instead of wrapped {query, total_hits, results}
- Discussion endpoint supports 4 filter modes (high_value/endorsed/staff/all) with cursor-based pagination
- Legacy schemas preserved for backward compatibility with existing service tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Create contract-aligned schemas** - `3a07a96` (feat + test)
2. **Task 2: Fix deadline routes and add /upcoming** - `3d7be87` (feat)
3. **Task 3: Fix materials, intelligence, search routes** - `4d53885` (feat)

## Files Created/Modified
- `src/schemas/deadline.py` - Added ContractDeadlineResponse with status, days_remaining
- `src/schemas/materials.py` - Added MaterialResponse, MaterialItemResponse, ContractSearchResultResponse
- `src/schemas/intelligence.py` - Added DiscussionResponse with author, gpa_relevance_score, relevance_category, summary
- `src/web/routes/deadlines.py` - Contract response type, /upcoming endpoint, _to_contract_deadline helper
- `src/web/routes/materials.py` - Flat Material[] and SearchResult[] responses via adapter functions
- `src/web/routes/intelligence.py` - Filter + cursor pagination, DiscussionResponse output
- `src/services/intelligence.py` - get_discussions() method with filter_mode and cursor support
- `tests/unit/test_contract_schemas.py` - 12 tests covering all new schema shapes

## Decisions Made
- Route-level adapter pattern: legacy service returns converted to contract shape in route handlers, keeping service layer unchanged and backward-compatible
- Status and days_remaining computed at route level from due_date (not stored in DB) since these are derived values
- Discussion author field comes directly from DiscussionThread ORM model (author column exists, was missing from old HighValuePostResponse schema)
- GPA relevance score derived from is_endorsed (0.5) / is_staff_post (0.3) / default (0.0) when stored AI score is 0.0

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing test import errors in test_intelligence_service.py, test_gpa_service.py, test_digest_service.py (importing non-existent `User` from `src.models.user` which only has `Profile`) - these are NOT caused by this plan's changes and were present before execution

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All non-GPA contract mismatches resolved; frontend can switch prefixUrl to Python API for deadlines, materials, intelligence, and search with zero changes
- Plan 03 (GPA domain) is the remaining contract alignment work
- 130 unit tests pass across all non-broken test files

## Self-Check: PASSED

All 8 created/modified files verified present. All 3 task commits verified in git log.

---
*Phase: 15-core-services-api-routes*
*Completed: 2026-03-27*
