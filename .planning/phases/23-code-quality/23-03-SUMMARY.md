---
phase: 23-code-quality
plan: 03
subsystem: api, infra
tags: [fastapi, sqlalchemy, resource-cleanup, health-check, connection-pool]

requires:
  - phase: 23-01
    provides: sync/modules.py split from sync/tasks.py

provides:
  - EdLessonsAdapter finally cleanup in _sync_ed_lessons
  - dispose_sync_engine() function for sync connection pool cleanup
  - dispose_engine() function for main DB connection pool cleanup
  - Lifespan shutdown disposing both engines
  - Health endpoint returning HTTP 503 when database disconnected

affects: [deployment, monitoring, load-balancing]

tech-stack:
  added: []
  patterns:
    - "JSONResponse with explicit status_code for health endpoints"
    - "Engine disposal in lifespan finally blocks for connection pool cleanup"

key-files:
  created:
    - tests/unit/test_health_endpoint.py
  modified:
    - src/sync/modules.py
    - src/sync/_shared.py
    - src/sync/engine.py
    - src/database.py
    - src/web/routes/health.py

key-decisions:
  - "Dispose sync engine before main engine (sync tasks stopped first, HTTP handlers shutting down)"
  - "Health endpoint uses JSONResponse (not dict return) for explicit status_code control"

patterns-established:
  - "Engine disposal pattern: global engine + dispose function resetting to None"
  - "Health 503: load balancers can detect degraded instances via status code"

requirements-completed: [QUAL-04]

duration: 2min
completed: 2026-04-01
---

# Phase 23 Plan 03: Resource Leak Fixes Summary

**EdLessonsAdapter finally cleanup, dual engine disposal on shutdown, and health endpoint 503 for degraded state**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T07:03:56Z
- **Completed:** 2026-04-01T07:06:05Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Fixed EdLessonsAdapter HTTP session leak by adding finally: await adapter.close()
- Added dispose_sync_engine() and dispose_engine() functions for proper connection pool cleanup on shutdown
- Health endpoint now returns HTTP 503 when database is disconnected (was always 200)
- TDD test proves both 200 (healthy) and 503 (degraded) paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix EdLessonsAdapter leak and add engine disposal** - `eb9ccb5` (fix)
2. **Task 2: Health endpoint returns 503 when degraded** - `229c62f` (test: RED), `a8ea9cb` (feat: GREEN)

## Files Created/Modified
- `src/sync/modules.py` - Added finally: await adapter.close() to _sync_ed_lessons
- `src/sync/_shared.py` - Added dispose_sync_engine() for sync engine cleanup
- `src/database.py` - Added dispose_engine() for main DB engine cleanup
- `src/sync/engine.py` - Updated lifespan finally to call both dispose functions
- `src/web/routes/health.py` - Changed return type to JSONResponse with 503 on degraded
- `tests/unit/test_health_endpoint.py` - Tests for 200 healthy and 503 degraded paths

## Decisions Made
- Dispose sync engine before main engine (sync tasks stopped first, then HTTP handlers)
- Health endpoint returns JSONResponse (not dict) for explicit status_code control

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Known Stubs

None.

## Next Phase Readiness
- QUAL-04 (resource cleanup and accurate health reporting) complete
- All three resource leaks fixed: EdLessonsAdapter session, sync engine pool, main engine pool
- Health endpoint ready for load balancer integration

## Self-Check: PASSED

All 7 files found, all 3 commits verified.

---
*Phase: 23-code-quality*
*Completed: 2026-04-01*
