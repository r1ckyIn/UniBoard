---
phase: 16-sync-engine
plan: 01
subsystem: infra
tags: [sync, apscheduler, sqlalchemy, fastapi, ed-api, unit-outline]

requires:
  - phase: 15-core-services-api-routes
    provides: "Sync engine skeleton, adapter stubs, route stubs"
provides:
  - "sync_history audit table and ORM model"
  - "Ed source wiring in deadline sync (EdLessonsAdapter + EdDiscussionAdapter)"
  - "sync_all_outlines task with UnitOutlineParser"
  - "GET /sync/history endpoint for audit trail"
  - "Outline CronTrigger registration in sync engine"
affects: [16-02-tests, frontend-sync-status]

tech-stack:
  added: []
  patterns: ["_record_sync_history helper for audit trail", "semester-initial CronTrigger pattern"]

key-files:
  created:
    - src/models/sync_history.py
    - supabase/migrations/00000000000003_sync_history.sql
  modified:
    - src/models/__init__.py
    - src/schemas/sync.py
    - src/sync/tasks.py
    - src/sync/engine.py
    - src/config.py
    - src/web/routes/sync.py

key-decisions:
  - "Outline sync uses semester-initial CronTrigger (March 1 + August 1, AEST) rather than daily"
  - "Sync history records per-user per-domain, outline sync skips history (runs per-course not per-user)"
  - "Ed adapter errors set token_status=expired and continue, don't abort entire sync"

patterns-established:
  - "_record_sync_history: audit every sync domain completion with status/count/timestamps"
  - "Lazy adapter imports inside sync task functions to avoid circular imports"

requirements-completed: [INFRA-02]

duration: 12min
completed: 2026-03-27
---

# Phase 16 Plan 01: Sync Engine Wiring Summary

**Wired Ed Lessons + Ed Discussion into deadline sync, added Unit Outline sync task with semester-initial CronTrigger, created sync_history audit table, and added GET /sync/history endpoint**

## Performance

- **Duration:** ~12 min
- **Completed:** 2026-03-27
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- sync_history table with migration, ORM model, Pydantic schemas, and RLS policy
- Ed Lessons and Ed Discussion data now flows into deadline sync (replacing empty lists)
- sync_all_outlines task fetches and upserts Unit Outline data per-course
- _record_sync_history helper tracks every sync operation for audit trail
- Outline CronTrigger registered in engine for March 1 + August 1 (AEST)
- GET /sync/history endpoint returns user's sync audit entries with domain filtering

## Task Commits

1. **Task 1: sync_history + Ed wiring + outline sync** - `ae61b4f` (feat)
2. **Task 2: GET /sync/history endpoint** - `db1966f` (feat)

## Files Created/Modified
- `src/models/sync_history.py` - SyncHistory ORM model
- `supabase/migrations/00000000000003_sync_history.sql` - DDL with RLS
- `src/models/__init__.py` - Added SyncHistory export
- `src/schemas/sync.py` - SyncHistoryEntry + SyncHistoryResponse schemas
- `src/sync/tasks.py` - Ed source wiring, sync_all_outlines, _record_sync_history
- `src/sync/engine.py` - Outline CronTrigger job registration
- `src/config.py` - sync_outline_cron_months/day settings
- `src/web/routes/sync.py` - GET /sync/history endpoint

## Decisions Made
- Outline sync uses semester-initial CronTrigger (March + August) per TRD spec
- Ed adapter errors set token_status=expired and continue sync for remaining courses
- sync_history records per-user per-domain; outline sync (per-course) skips audit history

## Deviations from Plan
None - plan executed as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All sync engine functionality implemented, ready for Plan 02 (tests)
- Integration tests need Profile + JWT pattern (not obsolete User model)

---
*Phase: 16-sync-engine*
*Completed: 2026-03-27*
