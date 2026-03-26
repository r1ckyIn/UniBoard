---
phase: 14-platform-adapters
plan: 01
subsystem: api
tags: [canvas, ed-discussion, ed-lessons, circuit-breaker, rate-limiter, retry, resilience, httpx]

# Dependency graph
requires:
  - phase: 13-supabase-auth-bridge
    provides: "Adapter base classes, resilience module, error hierarchy"
provides:
  - "Canvas get_assignment_groups method for weight fallback"
  - "Ed Discussion 401/403 -> TokenInvalidError (re-auth flow)"
  - "Ed Lessons 401/403 -> TokenInvalidError (re-auth flow)"
  - "Request timing logs on both Ed adapters"
  - "Comprehensive resilience module unit tests (17 tests)"
affects: [14-02, 14-03, sync-engine, gpa-service]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "401/403 -> TokenInvalidError pattern across all adapters"
    - "time.monotonic() request timing with structlog debug"

key-files:
  created:
    - tests/unit/test_resilience.py
  modified:
    - src/adapters/canvas.py
    - src/adapters/ed_discussion.py
    - src/adapters/ed_lessons.py

key-decisions:
  - "401/403 check placed BEFORE retry check to ensure immediate propagation"
  - "TokenInvalidError propagates through existing except blocks (not caught by UpstreamUnavailableError handlers)"

patterns-established:
  - "Adapter _request 401/403 guard: check before retryable statuses, record_failure + raise TokenInvalidError"
  - "Request timing: time.monotonic() wrap with logger.debug(duration_ms=round(duration*1000))"

requirements-completed: [INFRA-03, INFRA-04, INFRA-05, INFRA-06]

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 14 Plan 01: Adapter Hardening Summary

**Canvas assignment groups method + Ed adapter 401/403 TokenInvalidError handling + 17 resilience unit tests**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T10:09:20Z
- **Completed:** 2026-03-26T10:12:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `get_assignment_groups` to CanvasAdapter for weight fallback when Unit Outline parsing fails
- Ed Discussion and Ed Lessons adapters now raise `TokenInvalidError` on 401/403 instead of silently returning empty results
- Both Ed adapters now log request timing with `duration_ms` for observability
- Created 17 unit tests covering CircuitBreaker state machine, CanvasRateLimiter, RetryConfig, and execute_with_retry

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden adapters** - `120b629` (feat)
2. **Task 2: Resilience module unit tests** - `e507347` (test)

## Files Created/Modified
- `src/adapters/canvas.py` - Added get_assignment_groups method using _paginate
- `src/adapters/ed_discussion.py` - Added 401/403 TokenInvalidError, import time, request timing logs
- `src/adapters/ed_lessons.py` - Added 401/403 TokenInvalidError, import time, request timing logs
- `tests/unit/test_resilience.py` - 17 unit tests for resilience module (CircuitBreaker, RateLimiter, RetryConfig, execute_with_retry)

## Decisions Made
- 401/403 check placed BEFORE retry check in Ed adapters to ensure TokenInvalidError propagates immediately without retries
- TokenInvalidError is a sibling of UpstreamUnavailableError in the exception hierarchy, so existing except blocks in get_threads/get_lessons correctly let it propagate

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All adapters now have consistent 401/403 handling pattern
- Resilience module has comprehensive test coverage
- Ready for Plan 02 (Canvas adapter integration tests) and Plan 03 (sync engine hardening)

## Self-Check: PASSED

- All 4 created/modified files exist
- Both task commits (120b629, e507347) found in git log
- All acceptance criteria verified (get_assignment_groups, TokenInvalidError, timing logs, 17 test functions)

---
*Phase: 14-platform-adapters*
*Completed: 2026-03-26*
