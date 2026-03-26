---
phase: 14-platform-adapters
plan: 02
subsystem: testing
tags: [pytest, httpx, MockTransport, canvas, ed-discussion, unit-tests]

# Dependency graph
requires:
  - phase: 14-platform-adapters/01
    provides: Hardened Canvas and Ed Discussion adapters with resilience patterns
provides:
  - Canvas adapter unit test suite (16 tests) with MockTransport
  - Ed Discussion adapter unit test suite (17 tests) with MockTransport
  - CI-safe adapter test coverage (no real API tokens needed)
affects: [14-platform-adapters/03, future-adapter-changes]

# Tech tracking
tech-stack:
  added: []
  patterns: [MockTransport adapter testing, __new__ bypass for constructor injection]

key-files:
  created:
    - tests/unit/test_canvas_adapter.py
    - tests/unit/test_ed_discussion_adapter.py
  modified: []

key-decisions:
  - "Circuit breaker test for Ed Discussion uses _request directly since get_threads gracefully degrades"
  - "Added extra test for get_threads graceful degradation on circuit breaker open"

patterns-established:
  - "_make_adapter(handler) pattern: CanvasAdapter.__new__ + MockTransport injection for unit testing"
  - "_json_response helper for building httpx.Response with JSON body and standard headers"

requirements-completed: [INFRA-03, INFRA-04]

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 14 Plan 02: Adapter Unit Tests Summary

**33 unit tests for Canvas and Ed Discussion adapters using httpx MockTransport covering all public methods, pagination, error handling, retry, circuit breaker, and Pydantic defensive parsing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T10:15:26Z
- **Completed:** 2026-03-26T10:18:39Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Canvas adapter: 16 tests covering get_courses/grades/assignments/modules/tabs/external_tool/assignment_groups, validate_token, pagination via Link header, 401/403/429/5xx errors, circuit breaker, rate limiter header update
- Ed Discussion adapter: 17 tests covering get_threads/get_thread/search_threads, validate_token, extra fields ignored (Pydantic extra='ignore'), parse error graceful degradation, 401/403 TokenInvalidError, retry on 429/500, circuit breaker, network error graceful handling
- All tests CI-safe with MockTransport (no real API calls), total execution under 5 seconds

## Task Commits

Each task was committed atomically:

1. **Task 1: Canvas adapter unit tests with MockTransport** - `5d89340` (test)
2. **Task 2: Ed Discussion adapter unit tests with MockTransport** - `ed0e7fc` (test)

## Files Created/Modified
- `tests/unit/test_canvas_adapter.py` - 390 lines, 16 tests for Canvas adapter with MockTransport
- `tests/unit/test_ed_discussion_adapter.py` - 381 lines, 17 tests for Ed Discussion adapter with MockTransport

## Decisions Made
- Circuit breaker open test for Ed Discussion uses `_request` directly since `get_threads` catches `UpstreamUnavailableError` and returns `[]` gracefully; added separate test verifying the graceful degradation behavior
- Added an extra test (`test_circuit_breaker_open_get_threads_degrades`) beyond the plan spec to verify graceful degradation path

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adjusted circuit breaker open test for Ed Discussion**
- **Found during:** Task 2 (Ed Discussion adapter tests)
- **Issue:** Plan expected `get_threads` to raise `UpstreamUnavailableError` on circuit breaker open, but `get_threads` catches it and returns `[]` (graceful degradation by design)
- **Fix:** Test `_request` directly for `UpstreamUnavailableError`, added separate test for graceful degradation
- **Files modified:** tests/unit/test_ed_discussion_adapter.py
- **Verification:** All 17 tests pass
- **Committed in:** ed0e7fc (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for test correctness. Added 1 extra test for better coverage. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Canvas and Ed Discussion adapters now have comprehensive unit test coverage
- Ready for Plan 03 (Ed Lessons adapter tests or remaining adapter work)
- MockTransport pattern established and reusable for future adapter testing

---
*Phase: 14-platform-adapters*
*Completed: 2026-03-26*
