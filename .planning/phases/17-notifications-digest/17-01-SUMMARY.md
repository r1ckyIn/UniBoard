---
phase: 17-notifications-digest
plan: 01
subsystem: sync
tags: [apscheduler, risk-alert, token-health, notifications, grade-sync]

# Dependency graph
requires:
  - phase: 16-sync-engine
    provides: "APScheduler engine with grade/deadline/module/outline sync tasks"
  - phase: 15-core-services
    provides: "RiskAlertService, NotificationService, GPAService"
provides:
  - "Fixed risk_alert.py variable name bug (profile.ai_calls_today)"
  - "Post-grade-sync GPA risk alert hook in sync_all_grades"
  - "check_token_health task for expired Canvas/Ed token warnings"
  - "check_token_health registered in APScheduler engine (30-min interval)"
affects: [17-02-tests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Post-sync hook pattern: fire-and-forget service call after successful sync with failure isolation"
    - "Per-user session isolation for notification tasks"

key-files:
  created: []
  modified:
    - src/services/risk_alert.py
    - src/sync/tasks.py
    - src/sync/engine.py

key-decisions:
  - "Risk alert hook only fires on sync_status=='success' to avoid false alerts on failed syncs"
  - "Token health check reuses reminder_check_interval_min (30 min) since it is lightweight"
  - "Lazy imports inside post-sync hook and check_token_health to avoid circular imports"

patterns-established:
  - "Post-sync hook: service call wrapped in try/except inside for-loop, after retry block, before _record_sync_history"
  - "Token health notifications use action_url='/settings#tokens' for deep-link to Settings page"

requirements-completed: [DL-02, DL-03, PLAT-04]

# Metrics
duration: 3min
completed: 2026-03-27
---

# Phase 17 Plan 01: Risk Alert Bug Fix, Post-Sync GPA Hook, and Token Health Task

**Fixed risk_alert.py variable bug, wired GPA risk alerts into post-grade-sync flow, and added proactive token expiry notification task with engine registration**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-27T10:13:17Z
- **Completed:** 2026-03-27T10:16:37Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fixed `user.ai_calls_today` bug in risk_alert.py (variable `user` was undefined; corrected to `profile`)
- Wired GPA risk alerts into post-grade-sync flow -- RiskAlertService.check_risk_for_user fires after successful grade sync with full failure isolation
- Implemented check_token_health task that queries expired Canvas/Ed tokens and creates in-app warning notifications with Settings deep-link
- Registered check_token_health in APScheduler engine with 30-min interval matching deadline reminders

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix risk_alert.py bug and wire GPA risk into post-grade-sync** - `0ac05b1` (fix)
2. **Task 2: Implement check_token_health task and register in sync engine** - `14d621d` (feat)

## Files Created/Modified
- `src/services/risk_alert.py` - Fixed profile.ai_calls_today bug (line 95)
- `src/sync/tasks.py` - Post-grade-sync risk alert hook + check_token_health() function
- `src/sync/engine.py` - check_token_health import + APScheduler job registration + logger kwarg

## Decisions Made
- Risk alert hook only fires when sync_status == "success" to avoid triggering on failed/degraded syncs
- Token health check reuses reminder_check_interval_min (30 min) since token expiry is not time-critical
- Used lazy imports (from src.services.risk_alert import RiskAlertService) inside the sync hook to avoid circular import issues
- Named session variable `risk_session` in the hook to avoid shadowing outer `session` variable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All production code changes complete for DL-02, DL-03, PLAT-04
- Ready for Plan 02 (tests) to validate risk alert hook, token health task, and engine registration

## Self-Check: PASSED

All files found, all commits verified.

---
*Phase: 17-notifications-digest*
*Completed: 2026-03-27*
