---
phase: 01-foundation-data-acquisition
plan: "03"
subsystem: adapters, parsers, services
tags: [httpx, pydantic, beautifulsoup4, lxml, structlog, canvas-api, ed-api, circuit-breaker, rate-limiter]

# Dependency graph
requires:
  - phase: 01-01
    provides: "ORM models, Settings config, exception hierarchy, FastAPI app, structlog logging"
provides:
  - "CanvasAdapter with rate limiting, circuit breaker, and Link header pagination"
  - "EdDiscussionAdapter with defensive Pydantic parsing (extra='ignore', per-item error handling)"
  - "EdLessonsAdapter with TRD SS9.4 verified field names (content not passage, number not lesson_number)"
  - "UnitOutlineParser with BeautifulSoup4+lxml, weight-sum validation 95-105%"
  - "Ed XML document parser (parse_ed_document) shared between Discussion and Lessons"
  - "Course linking service (extract_course_code, extract_semester, link_courses)"
  - "Abstract adapter interfaces (LMSAdapter, DiscussionAdapter, LessonAdapter)"
  - "Resilience utilities (CircuitBreaker, CanvasRateLimiter, RetryConfig, execute_with_retry)"
affects: [02-services-api]

# Tech tracking
tech-stack:
  added: []
  patterns: [circuit-breaker-per-platform, header-driven-rate-limiting, defensive-pydantic-parsing, per-item-error-handling, link-header-pagination, weight-sum-validation]

key-files:
  created:
    - src/adapters/__init__.py
    - src/adapters/base.py
    - src/adapters/resilience.py
    - src/adapters/canvas.py
    - src/adapters/ed_discussion.py
    - src/adapters/ed_lessons.py
    - src/parsers/__init__.py
    - src/parsers/ed_document.py
    - src/parsers/usyd_outline.py
    - src/services/__init__.py
    - src/services/course_linking.py
    - tests/integration/test_canvas.py
    - tests/integration/test_ed_discussion.py
    - tests/integration/test_ed_lessons.py
    - tests/integration/test_outline_parser.py
    - tests/integration/test_course_linking.py
  modified: []

key-decisions:
  - "Explicit params parameter in _request() instead of **kwargs passthrough for mypy --strict compatibility"
  - "Per-platform CircuitBreaker instances (Canvas and Ed each get their own) per TRD SS14.7"
  - "Ed Discussion and Ed Lessons adapters return empty lists/tuples on network failures (graceful degradation)"
  - "UnitOutlineParser falls back to positional cell extraction when CSS class selectors not found"
  - "Course linking uses (course_code, semester) composite key with regex extraction"
  - "test_field_map_constants uses per-test skipif (not module-level) so it runs without ED_API_TOKEN"

patterns-established:
  - "Adapter _request() pattern: circuit breaker check -> rate limiter wait -> HTTP call -> header update -> error classification"
  - "Pydantic response models with ConfigDict(extra='ignore', strict=False) for undocumented API fields"
  - "Per-item parse error handling: ValidationError caught per-item, logged, and skipped (never crash batch)"
  - "Integration tests with pytest.mark.skipif for token-gated API tests"
  - "parse_ed_document() shared XML parser for Ed Discussion content and Ed Lessons slides"
  - "ED_FIELD_MAP constants as explicit documentation of TRD SS9.4 corrections"

requirements-completed: [INFRA-03, INFRA-04, INFRA-05, INFRA-06]

# Metrics
duration: 11min
completed: 2026-03-16
---

# Phase 1 Plan 03: Platform Adapters Summary

**4 platform adapters (Canvas, Ed Discussion, Ed Lessons, Unit Outline) with circuit breaker, rate limiting, defensive Pydantic parsing, weight-sum validation, and cross-platform course linking -- 20 offline tests passing, 18 API tests skip gracefully without tokens**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-16T05:34:05Z
- **Completed:** 2026-03-16T05:45:26Z
- **Tasks:** 3/3
- **Files modified:** 16

## Accomplishments

- Complete data acquisition layer: 4 adapters + 1 parser + 1 shared XML parser + 1 course linking service
- Resilience layer: CircuitBreaker (CLOSED->OPEN after 5 failures, HALF_OPEN after 60s), CanvasRateLimiter (X-Rate-Limit-Remaining header), RetryConfig (exponential backoff 1s->2s->4s)
- All Ed API field names verified against TRD SS9.4: content (not passage), number (not lesson_number), user_id (not creator_id)
- UnitOutlineParser successfully fetches and parses real USYD Unit Outline HTML (weight-sum validation passes)
- 20 offline tests pass (11 course linking, 8 outline parser, 1 field map constants), 18 API tests skip gracefully
- Full verification chain passes: mypy --strict (0 errors), ruff check (0 warnings), pytest (20 green)

## Task Commits

Each task was committed atomically:

1. **Task 1: Resilience utilities, abstract interfaces, and Ed XML parser** - `921030c` (feat)
2. **Task 2: Concrete adapters, Unit Outline parser, and course linking** - `de5617a` (feat)
3. **Task 3: Integration tests with full verification** - `1e32fd9` (test)

## Files Created/Modified

- `src/adapters/__init__.py` - Re-exports for adapter interfaces and resilience utilities
- `src/adapters/base.py` - Abstract LMSAdapter, DiscussionAdapter, LessonAdapter interfaces
- `src/adapters/resilience.py` - CircuitBreaker, CanvasRateLimiter, RetryConfig, execute_with_retry
- `src/adapters/canvas.py` - CanvasAdapter with rate limiting, circuit breaker, Link header pagination
- `src/adapters/ed_discussion.py` - EdDiscussionAdapter with Pydantic parsing and per-item error handling
- `src/adapters/ed_lessons.py` - EdLessonsAdapter with TRD SS9.4 field mappings and ED_FIELD_MAP constants
- `src/parsers/__init__.py` - Re-export parse_ed_document
- `src/parsers/ed_document.py` - Ed XML document parser for Discussion and Lessons content
- `src/parsers/usyd_outline.py` - UnitOutlineParser with BeautifulSoup4+lxml and weight-sum validation
- `src/services/__init__.py` - Services package init
- `src/services/course_linking.py` - extract_course_code, extract_semester, link_courses, LinkedCourse
- `tests/integration/test_canvas.py` - 8 Canvas API integration tests (skip without token)
- `tests/integration/test_ed_discussion.py` - 6 Ed Discussion API integration tests (skip without token)
- `tests/integration/test_ed_lessons.py` - 5 Ed Lessons tests including field name validation
- `tests/integration/test_outline_parser.py` - 8 Unit Outline parser tests with HTML fixture + real URL
- `tests/integration/test_course_linking.py` - 11 offline course linking tests

## Decisions Made

- **Explicit params instead of kwargs**: Changed `_request(**kwargs)` to `_request(params=...)` for mypy --strict compatibility. httpx.AsyncClient.request() has complex overloaded signatures that reject `**dict[str, object]`.
- **Per-platform circuit breakers**: Canvas and Ed each get their own CircuitBreaker instance, so Canvas downtime doesn't block Ed requests and vice versa.
- **Graceful degradation pattern**: Ed adapters return empty lists/tuples on network failures rather than raising exceptions. Callers get empty data, not crashes.
- **CSS class fallback**: UnitOutlineParser tries CSS class selectors first (`.assessment-type`, `.assessment-weight`), falls back to positional cell indexing if classes are absent.
- **Per-test skipif for field map test**: `test_field_map_constants` doesn't need ED_API_TOKEN, so it uses per-test `@needs_token` decorator instead of module-level `pytestmark`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed mypy --strict error with min() return type**
- **Found during:** Task 1 (Resilience utilities)
- **Issue:** `min(float, float)` returns `Any` in mypy --strict due to overloaded builtins
- **Fix:** Wrapped in `float()` cast: `float(min(base_delay * 2**attempt, max_delay))`
- **Files modified:** `src/adapters/resilience.py`
- **Verification:** mypy --strict passes
- **Committed in:** `921030c` (Task 1 commit)

**2. [Rule 3 - Blocking] Changed **kwargs to explicit params for httpx compatibility**
- **Found during:** Task 2 (Concrete adapters)
- **Issue:** `self._client.request(method, path, **kwargs)` with `kwargs: dict[str, object]` fails mypy --strict because httpx has complex overloaded parameter types
- **Fix:** Changed all `_request(**kwargs)` signatures to `_request(params: dict[str, Any] | None = None)` with explicit `params=params` passing
- **Files modified:** `src/adapters/canvas.py`, `src/adapters/ed_discussion.py`, `src/adapters/ed_lessons.py`
- **Verification:** mypy --strict passes on all adapter files
- **Committed in:** `de5617a` (Task 2 commit)

**3. [Rule 3 - Blocking] Fixed pytest-asyncio event loop scope conflict**
- **Found during:** Task 3 (Integration tests)
- **Issue:** `pytest.mark.asyncio` in `pytestmark` creates function-scoped event loop, conflicting with `asyncio_default_test_loop_scope=session` in pyproject.toml
- **Fix:** Removed `pytest.mark.asyncio` from `pytestmark` lists (asyncio_mode=auto handles it). Used `pytest.mark.skipif` directly.
- **Files modified:** All 5 integration test files
- **Verification:** All tests collect and run correctly (20 pass, 18 skip)
- **Committed in:** `1e32fd9` (Task 3 commit)

**4. [Rule 1 - Bug] Fixed ruff SIM105 in resilience.py**
- **Found during:** Task 3 (ruff check)
- **Issue:** `try: ... except ValueError: pass` flagged by ruff SIM105
- **Fix:** Replaced with `contextlib.suppress(ValueError)`
- **Files modified:** `src/adapters/resilience.py`
- **Verification:** ruff check passes
- **Committed in:** `1e32fd9` (Task 3 commit)

---

**Total deviations:** 4 auto-fixed (2 bug fixes, 2 blocking issues)
**Impact on plan:** All fixes necessary for type safety and test infrastructure. No scope creep.

## Issues Encountered

- **Pre-existing test_models.py event loop issue**: When running ALL tests together, `test_models.py` (from Plan 01-01) fails with event loop scope mismatch. This is a pre-existing issue unrelated to Plan 01-03 changes. The test_models tests pass when run in isolation. Logged as out-of-scope per deviation rules.

## User Setup Required

None - adapters use environment tokens from `.env` file. Add `CANVAS_API_TOKEN` and `ED_API_TOKEN` to `.env` to enable API integration tests.

## Next Phase Readiness

- All 4 adapter implementations ready for service layer consumption (Phase 2)
- Course linking service ready for onboarding flow
- Resilience utilities (circuit breaker, rate limiter) ready for sync engine
- parse_ed_document() ready for discussion intelligence service
- Abstract interfaces enable future platform adapters (if needed)

---
*Phase: 01-foundation-data-acquisition*
*Completed: 2026-03-16*
