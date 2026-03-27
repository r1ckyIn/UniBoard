---
phase: 17-notifications-digest
plan: 02
subsystem: testing
tags: [pytest, profile-migration, deadline-reminders, token-health, mock-session-factory]

# Dependency graph
requires:
  - phase: 17-notifications-digest
    provides: "Plan 01: risk alert fix, post-sync GPA hook, check_token_health task"
  - phase: 15-core-services
    provides: "NotificationService, DigestService, RiskAlertService, GPAService"
  - phase: 16-sync-engine
    provides: "sync tasks module with check_deadline_reminders and _get_sync_session_factory"
provides:
  - "6 test files migrated from User to Profile model (notification, digest, risk alert, GPA, intelligence, routes)"
  - "3 unit tests for check_deadline_reminders (DL-02 tiered reminders)"
  - "3 unit tests for check_token_health (PLAT-04 token expiry notifications)"
  - "Full unit test suite green (191 tests)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Patch lazy imports at source module (src.services.notification.NotificationService) not consumer module for mock injection"
    - "Mock session factory with _SessionCtx async context manager for sync task testing"

key-files:
  created:
    - tests/unit/test_deadline_reminders.py
    - tests/unit/test_token_health.py
  modified:
    - tests/unit/test_notification_service.py
    - tests/unit/test_digest_service.py
    - tests/unit/test_risk_alert_service.py
    - tests/unit/test_gpa_service.py
    - tests/unit/test_intelligence_service.py
    - tests/integration/test_notification_routes.py

key-decisions:
  - "Patch NotificationService at src.services.notification.NotificationService (source) not src.sync.tasks.NotificationService (lazy import target does not exist as module attribute)"
  - "Fixed test_gpa_service.py and test_intelligence_service.py as Rule 3 blocking fixes (prevented full unit test suite from passing)"

patterns-established:
  - "Profile test helper: Profile(id=uuid.uuid4(), display_name='...') for unit tests without auth.users FK"
  - "Supabase-compatible JWT via pyjwt.encode({'sub': user_id, 'role': 'authenticated'}, secret, 'HS256') for integration route tests"

requirements-completed: [DL-02, DL-03, INTEL-03, PLAT-04]

# Metrics
duration: 8min
completed: 2026-03-27
---

# Phase 17 Plan 02: Test Migration and New Test Coverage for Notification/Sync Tasks

**Migrated 6 test files from removed User model to Profile, added 6 new unit tests for deadline reminders (DL-02) and token health check (PLAT-04)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-27T10:19:16Z
- **Completed:** 2026-03-27T10:27:28Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Migrated 6 test files from User/hash_password to Profile model (notification service, digest service, risk alert service, GPA service, intelligence service, notification routes)
- Created 3 unit tests for check_deadline_reminders: 72h tier creates notification, no users returns early, no courses skipped gracefully
- Created 3 unit tests for check_token_health: Canvas expired creates notification, both expired creates 2 notifications, no expired skips
- Full unit test suite passes: 191 tests green

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate existing test files from User to Profile model** - `c42f7cc` (fix)
2. **Task 2: Add unit tests for deadline reminders and token health** - `59a34d5` (test)

## Files Created/Modified
- `tests/unit/test_deadline_reminders.py` - 3 tests for check_deadline_reminders DL-02 tier logic
- `tests/unit/test_token_health.py` - 3 tests for check_token_health PLAT-04 token expiry
- `tests/unit/test_notification_service.py` - User->Profile migration, _create_test_profile helper
- `tests/unit/test_digest_service.py` - User->Profile migration, _create_profile_with_data helper
- `tests/unit/test_risk_alert_service.py` - User->Profile migration, _create_profile_with_grades helper
- `tests/unit/test_gpa_service.py` - User->Profile migration (Rule 3 blocking fix)
- `tests/unit/test_intelligence_service.py` - User->Profile migration (Rule 3 blocking fix)
- `tests/integration/test_notification_routes.py` - User->Profile + JWT via pyjwt migration

## Decisions Made
- Patch NotificationService at source module (src.services.notification.NotificationService) because lazy imports inside sync tasks don't create module-level attributes
- Fixed test_gpa_service.py and test_intelligence_service.py beyond plan scope as Rule 3 blocking fixes to unblock full unit test suite

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed test_gpa_service.py User->Profile import**
- **Found during:** Task 2 (verification step)
- **Issue:** tests/unit/test_gpa_service.py imported removed User model, blocking `uv run pytest tests/unit/ -x -q`
- **Fix:** Applied same User->Profile migration pattern (Profile with uuid.uuid4() id, removed hash_password)
- **Files modified:** tests/unit/test_gpa_service.py
- **Verification:** Full unit test suite passes (191 tests)
- **Committed in:** 59a34d5 (Task 2 commit)

**2. [Rule 3 - Blocking] Fixed test_intelligence_service.py User->Profile import**
- **Found during:** Task 2 (verification step)
- **Issue:** tests/unit/test_intelligence_service.py imported removed User model and hash_password
- **Fix:** Applied same User->Profile migration pattern
- **Files modified:** tests/unit/test_intelligence_service.py
- **Verification:** Full unit test suite passes (191 tests)
- **Committed in:** 59a34d5 (Task 2 commit)

**3. [Rule 1 - Bug] Fixed NotificationService patch target for sync task tests**
- **Found during:** Task 2 (initial test run)
- **Issue:** `patch("src.sync.tasks.NotificationService")` fails because lazy import doesn't create module attribute
- **Fix:** Changed to `patch("src.services.notification.NotificationService")` to patch at source
- **Files modified:** tests/unit/test_deadline_reminders.py, tests/unit/test_token_health.py
- **Verification:** All 6 new tests pass
- **Committed in:** 59a34d5 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 bug)
**Impact on plan:** All fixes necessary for correctness and verification. No scope creep.

## Deferred Items

Pre-existing User->Profile migration needed in integration test files (out of scope for this plan):
- `tests/integration/test_models.py` - Uses User model extensively (cascade, unique email tests)
- `tests/integration/test_search.py` - Uses User + hash_password for search fixture
- `tests/integration/test_auth.py` - Uses create_access_token

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 17 test coverage complete for DL-02, DL-03, PLAT-04 requirements
- Full unit test suite green (191 tests)
- Integration test migration for remaining files deferred (not blocking any current feature)

## Self-Check: PASSED

All files found, all commits verified.

---
*Phase: 17-notifications-digest*
*Completed: 2026-03-27*
