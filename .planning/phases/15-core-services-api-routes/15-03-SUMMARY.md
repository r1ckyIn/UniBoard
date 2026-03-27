---
phase: 15-core-services-api-routes
plan: 03
subsystem: testing
tags: [pytest, integration-tests, contract-alignment, httpx, asyncio, pydantic]

# Dependency graph
requires:
  - phase: 15-01
    provides: Contract-aligned Pydantic schemas and routes for GPA/Course domains
  - phase: 15-02
    provides: Contract-aligned schemas and routes for Deadline/Materials/Intelligence/Search
provides:
  - 22 integration tests validating all Phase 15 endpoints match OpenAPI contract shapes
  - Seed data factory functions for all entity types (courses, grades, deadlines, discussions, modules, outlines)
  - Regression guards against legacy field name reappearance
  - JWT-based test auth infrastructure (no Supabase dependency for tests)
affects: [16-sync-engine, frontend-api-switch, future-endpoint-changes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JWT test auth: generate Supabase-compatible JWT directly in test fixtures"
    - "Naive datetime for TIMESTAMP WITHOUT TIME ZONE columns in asyncpg"
    - "Seed factory pattern: composable async functions returning ORM objects"

key-files:
  created:
    - tests/fixtures/__init__.py
    - tests/fixtures/seed_phase15.py
    - tests/integration/conftest.py
    - tests/integration/test_contract_alignment.py
    - tests/integration/test_courses_routes.py
    - tests/integration/test_deadline_routes.py
  modified:
    - src/web/routes/courses.py
    - src/web/routes/deadlines.py

key-decisions:
  - "JWT generation for tests instead of register/login endpoints (Supabase auth has no register API in Python)"
  - "Naive datetimes in seed data and route handlers to match TIMESTAMP WITHOUT TIME ZONE columns in asyncpg"
  - "Seed factory functions composable: individual entity factories plus seed_full_phase15_data aggregator"

patterns-established:
  - "Test JWT pattern: use PyJWT to generate tokens with dev secret for integration tests"
  - "Seed factory pattern: async factory functions that flush ORM objects and return them"
  - "Contract test pattern: check expected keys as subset of actual keys, check legacy fields NOT present"

requirements-completed: [GPA-01, GPA-02, GPA-03, GPA-04, GPA-05, DL-01, INTEL-01, INTEL-05, FILE-01, FILE-02]

# Metrics
duration: 9min
completed: 2026-03-27
---

# Phase 15 Plan 03: Contract Alignment Integration Tests Summary

**22 integration tests validating all Phase 15 endpoints (GPA, courses, deadlines, materials, discussions, search) match OpenAPI contract field names with seed data and regression guards**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-27T03:40:08Z
- **Completed:** 2026-03-27T03:49:12Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Created comprehensive seed data factories covering all Phase 15 entity types (7 factory functions)
- 22 integration tests covering all 11 endpoint contracts with field-level validation
- Regression guards ensure legacy field names (course_code in GPA, content_summary in discussions, rank in search) never reappear
- Fixed timezone bugs in courses.py and deadlines.py routes that caused asyncpg errors with tz-aware datetimes on naive columns

## Task Commits

Each task was committed atomically:

1. **Task 1: Create integration test seed data fixtures** - `7b5e9e9` (feat)
2. **Task 2a: Add contract alignment tests (RED)** - `960cd3a` (test)
3. **Task 2b: Fix bugs and pass all tests (GREEN)** - `3b1cc7a` (feat)

## Files Created/Modified
- `tests/fixtures/__init__.py` - Package init for test fixtures
- `tests/fixtures/seed_phase15.py` - 7 factory functions: seed_test_course, seed_test_grades, seed_test_deadlines, seed_test_discussions, seed_test_modules, seed_test_outline, seed_full_phase15_data
- `tests/integration/conftest.py` - phase15_seed_data fixture with JWT auth
- `tests/integration/test_contract_alignment.py` - 12 tests: GPA report/predict/path, courses list/detail/grades, deadlines, upcoming, materials, discussions, search, regression guard
- `tests/integration/test_courses_routes.py` - 6 tests: list, detail assessment_weights, grades graded_at, deadlines status, outline learning_outcomes, 404
- `tests/integration/test_deadline_routes.py` - 4 tests: status/days_remaining, upcoming within 7 days, past exclusion, valid status values
- `src/web/routes/courses.py` - Fixed datetime.now(UTC) to datetime.utcnow() for naive timestamp comparison
- `src/web/routes/deadlines.py` - Fixed datetime.now(UTC) to datetime.utcnow() for naive timestamp comparison

## Decisions Made
- Used PyJWT to generate Supabase-compatible JWTs directly in tests, avoiding dependency on auth register/login endpoints that no longer exist in the Python API (Supabase Auth handles registration)
- Used naive datetimes in seed factories and route handlers because PostgreSQL columns use TIMESTAMP WITHOUT TIME ZONE and asyncpg rejects tz-aware datetime comparison
- Seed factory functions are composable: can be used individually or via seed_full_phase15_data for complete setup

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Auth endpoint does not exist -- switched to JWT generation**
- **Found during:** Task 2 (integration tests)
- **Issue:** conftest tried to call /api/v1/auth/register and /api/v1/auth/login, but these endpoints don't exist (Supabase Auth handles auth, Python API only has /auth/me)
- **Fix:** Rewrote conftest to create Profile directly in DB and generate JWT using PyJWT with dev secret
- **Files modified:** tests/integration/conftest.py
- **Verification:** All 22 tests pass with JWT auth
- **Committed in:** 3b1cc7a

**2. [Rule 1 - Bug] Timezone mismatch: tz-aware datetime vs TIMESTAMP WITHOUT TIME ZONE**
- **Found during:** Task 2 (integration tests)
- **Issue:** seed_phase15.py used datetime.now(UTC) (tz-aware), courses.py and deadlines.py also used datetime.now(UTC), but DB columns are TIMESTAMP WITHOUT TIME ZONE -- asyncpg raises DataError
- **Fix:** Changed seed data to naive datetimes, changed route handlers to datetime.utcnow()
- **Files modified:** tests/fixtures/seed_phase15.py, src/web/routes/courses.py, src/web/routes/deadlines.py
- **Verification:** All 22 integration tests pass, 149 existing unit tests still pass
- **Committed in:** 3b1cc7a

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
- Pre-existing broken unit tests (test_digest_service.py, test_gpa_service.py, test_intelligence_service.py, test_notification_service.py, test_risk_alert_service.py) all import non-existent `User` from `src.models.user` -- NOT caused by this plan's changes

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 15 endpoints verified against OpenAPI contract -- frontend can switch from mock to real API with zero changes
- Seed data factories available for future integration tests in subsequent phases
- JWT test auth pattern established for all future integration tests

## Self-Check: PASSED

All 6 created files verified present. All 3 task commits verified in git log.

---
*Phase: 15-core-services-api-routes*
*Completed: 2026-03-27*
