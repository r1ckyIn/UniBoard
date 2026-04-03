---
phase: 24-build-health
plan: 02
subsystem: testing
tags: [pytest, postgresql, supabase-auth, auto-skip, markers]

requires:
  - phase: 13-supabase-foundation
    provides: "Supabase Auth migration (get_current_user_id replaces get_current_user)"
provides:
  - "Zero-failure pytest suite (316 passed, 115 skipped)"
  - "pytest.mark.db auto-skip infrastructure for DB-dependent tests"
  - "Clean integration test collection (no stale imports)"
affects: [24-build-health, testing, ci-cd]

tech-stack:
  added: []
  patterns: ["pytest.mark.db marker for DB-dependent tests", "conftest auto-skip via socket probe"]

key-files:
  created: []
  modified:
    - tests/conftest.py
    - tests/unit/test_gpa_service.py
    - tests/unit/test_notification_service.py
    - tests/unit/test_risk_alert_service.py
    - tests/unit/test_intelligence_service.py
    - tests/unit/test_digest_service.py
    - tests/integration/test_ai_routes.py
    - tests/integration/test_search.py
    - tests/integration/test_migrations.py
    - pyproject.toml

key-decisions:
  - "Delete test_auth.py: tests custom JWT creation replaced by Supabase Auth (managed service, no need to test)"
  - "Keep test_search.py: update Profile fixture (remove email/hashed_password), add db marker"
  - "Auto-skip via socket probe + fixture guard: dual approach covers both marker-based and fixture-based tests"

patterns-established:
  - "pytest.mark.db: decorator for any test requiring PostgreSQL, auto-skipped when DB unavailable"
  - "conftest _pg_is_reachable(): socket probe at localhost:5432 with 1s timeout"
  - "test_engine fixture guard: pytest.skip() when DB unreachable, cascades to all dependent fixtures"

requirements-completed: [CRIT-02]

duration: 7min
completed: 2026-04-01
---

# Phase 24 Plan 02: Python Test Fixes Summary

**Zero-failure pytest suite via stale import fixes, Supabase Auth alignment, and DB-dependent test auto-skip infrastructure**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-01T10:38:12Z
- **Completed:** 2026-04-01T10:46:01Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Fixed 3 integration test import errors from Supabase Auth migration (get_current_user -> get_current_user_id, deleted stale test_auth.py, removed hash_password import)
- Added pytest.mark.db auto-skip infrastructure: 26 unit tests + 63 integration tests + 3 migration tests now auto-skip when PostgreSQL is unavailable
- pytest reports 316 passed, 115 skipped, 0 failures, 0 errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix 3 integration test import errors** - `3b69161` (fix)
2. **Task 2: Fix 26 DB-dependent unit tests with auto-skip** - `62513eb` (fix)

## Files Created/Modified
- `tests/integration/test_ai_routes.py` - Updated get_current_user to get_current_user_id with UUID override
- `tests/integration/test_auth.py` - Deleted (tested custom JWT replaced by Supabase Auth)
- `tests/integration/test_search.py` - Removed hash_password import, updated Profile fixture, added db marker
- `tests/integration/test_migrations.py` - Added pytestmark = pytest.mark.db
- `tests/conftest.py` - Added _pg_is_reachable(), pytest_collection_modifyitems auto-skip, test_engine skip guard
- `tests/unit/test_gpa_service.py` - Added @pytest.mark.db to 11 DB-dependent tests
- `tests/unit/test_notification_service.py` - Added pytestmark = pytest.mark.db
- `tests/unit/test_risk_alert_service.py` - Added pytestmark = pytest.mark.db
- `tests/unit/test_intelligence_service.py` - Added pytestmark = pytest.mark.db
- `tests/unit/test_digest_service.py` - Added @pytest.mark.db to 2 DB-dependent tests
- `pyproject.toml` - Registered 'db' marker in pytest ini_options

## Decisions Made
- Deleted test_auth.py entirely: it tested create_access_token and hash_password which are Supabase Auth managed service features. No value in rewriting since Supabase Auth is not unit-testable.
- Kept test_search.py: search functionality (tsvector) is still valid, only needed fixture update (Profile model has no email/hashed_password fields post-migration).
- Dual auto-skip approach: conftest hook for @pytest.mark.db marker + test_engine fixture guard. The fixture guard catches all integration tests that depend on test_engine/session/test_client fixtures without requiring individual markers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Integration tests also fail without PostgreSQL**
- **Found during:** Task 2 verification
- **Issue:** Plan focused on 26 unit tests, but 63 integration tests + 3 migration tests also fail with DB connection errors when no PostgreSQL is running
- **Fix:** Added pytest.skip() guard in test_engine fixture (cascades to all dependent integration tests) and pytestmark = pytest.mark.db to test_migrations.py
- **Files modified:** tests/conftest.py, tests/integration/test_migrations.py
- **Verification:** pytest reports 0 errors after fix
- **Committed in:** 62513eb (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix -- without it, 63 integration tests still errored. No scope creep; same auto-skip pattern extended.

## Issues Encountered
None beyond the deviation above.

## Known Stubs
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- pytest passes with zero errors, ready for CI/CD pipeline (Phase 26)
- DB-dependent tests will run in CI when PostgreSQL service is available
- Frontend fixes (tsc + ESLint) ready for Plan 24-03

## Self-Check: PASSED

All files verified present, all commits verified in git log, deleted file confirmed removed.

---
*Phase: 24-build-health*
*Completed: 2026-04-01*
