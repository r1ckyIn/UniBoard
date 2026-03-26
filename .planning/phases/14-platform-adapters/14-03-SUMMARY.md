---
phase: 14-platform-adapters
plan: 03
subsystem: testing
tags: [pytest, httpx-mock, beautifulsoup4, pydantic, xml-parser, html-parser, tdd]

# Dependency graph
requires:
  - phase: 14-platform-adapters/01
    provides: "Hardened Ed Lessons adapter with 401/403 handling, Pydantic models, CircuitBreaker"
provides:
  - "14 unit tests for EdLessonsAdapter (get_lessons, get_lesson, TRD SS9.4 fields, retry, circuit breaker)"
  - "11 unit tests for parse_ed_document (all XML element types, fallback, empty input)"
  - "18 unit tests for UnitOutlineParser (CSS selectors, positional fallback, weight validation, snapshot)"
  - "HTML snapshot fixture for COMP2017 2026 S1 deterministic parser testing"
affects: [14-platform-adapters]

# Tech tracking
tech-stack:
  added: []
  patterns: [httpx-MockTransport-adapter-testing, html-snapshot-fixture-testing]

key-files:
  created:
    - tests/unit/test_ed_lessons_adapter.py
    - tests/unit/test_ed_document_parser.py
    - tests/unit/test_unit_outline_parser.py
    - tests/fixtures/usyd_comp2017_2026s1.html
  modified: []

key-decisions:
  - "Circuit breaker OPEN test targets _request directly since get_lessons catches UpstreamUnavailableError"
  - "UnitOutlineParser tests use _extract_learning_outcomes and _extract_description public HTML APIs rather than soup internals"

patterns-established:
  - "MockTransport adapter pattern: _make_adapter helper with CircuitBreaker + RetryConfig for Ed Lessons testing"
  - "HTML snapshot fixture pattern: real-structure HTML files in tests/fixtures/ for deterministic parser testing"

requirements-completed: [INFRA-05, INFRA-06]

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 14 Plan 03: Ed Lessons + UnitOutlineParser Unit Tests Summary

**43 unit tests covering Ed Lessons adapter (TRD SS9.4 fields, retry, circuit breaker), Ed XML parser (all element types), and UnitOutlineParser (CSS/positional fallback, weight validation, HTML snapshot)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T10:15:52Z
- **Completed:** 2026-03-26T10:19:37Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- 14 EdLessonsAdapter unit tests with MockTransport covering get_lessons, get_lesson, TRD SS9.4 field name verification, Pydantic extra=ignore, 401/403 TokenInvalidError, 429 retry, circuit breaker OPEN, network error graceful fallback
- 11 parse_ed_document tests covering all XML element types (paragraph, heading, bold, italic, code-block, list, image, callout), nested inline, empty input, malformed XML fallback, mixed content
- 18 UnitOutlineParser tests covering CSS class selectors, positional fallback, weight validation (valid/low/high/close), parse_weight, empty HTML, no assessment table, malformed rows, snapshot parsing, learning outcomes (id + heading fallback), description (id + heading fallback), ai_policy, raw_html storage
- HTML snapshot fixture (COMP2017 2026 S1) with 4 assessments, learning outcomes, and description for deterministic testing

## Task Commits

Each task was committed atomically:

1. **Task 1: Ed Lessons adapter + Ed Document parser unit tests** - `d7226a8` (test)
2. **Task 2: UnitOutlineParser unit tests with HTML snapshot fixture** - `a5f33c9` (test)

## Files Created/Modified
- `tests/unit/test_ed_lessons_adapter.py` - 14 tests for EdLessonsAdapter with MockTransport
- `tests/unit/test_ed_document_parser.py` - 11 tests for parse_ed_document XML parser
- `tests/unit/test_unit_outline_parser.py` - 18 tests for UnitOutlineParser with snapshot + fixtures
- `tests/fixtures/usyd_comp2017_2026s1.html` - Realistic USYD Unit Outline HTML snapshot (COMP2017)

## Decisions Made
- Circuit breaker OPEN test targets `_request` directly because `get_lessons` catches `UpstreamUnavailableError` and returns `([], [])` -- testing the public method wouldn't verify the exception is raised
- UnitOutlineParser tests use `_extract_learning_outcomes(html)` and `_extract_description(html)` public APIs rather than the `_soup` internal variants for cleaner test isolation
- `last_failure_time = time.monotonic()` for circuit breaker test to prevent recovery timeout elapsed during test execution

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed circuit breaker OPEN test timing**
- **Found during:** Task 1 (test_circuit_breaker_open_raises)
- **Issue:** Setting `last_failure_time = 0.0` caused recovery timeout to elapse immediately, transitioning to HALF_OPEN instead of staying OPEN
- **Fix:** Used `time.monotonic()` for realistic recent failure time; targeted `_request` directly instead of `get_lessons`
- **Files modified:** tests/unit/test_ed_lessons_adapter.py
- **Verification:** Test passes, UpstreamUnavailableError raised correctly
- **Committed in:** d7226a8

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor test logic fix for correct circuit breaker OPEN state simulation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three test files pass (43 total tests) in < 1 second
- CI-safe: no real HTTP calls, all MockTransport or direct parser calls
- Phase 14 plan 03 testing complete; ready for PR cycle

---
*Phase: 14-platform-adapters*
*Completed: 2026-03-26*
