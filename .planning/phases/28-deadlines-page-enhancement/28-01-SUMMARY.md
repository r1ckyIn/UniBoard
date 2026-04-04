---
phase: 28-deadlines-page-enhancement
plan: 01
subsystem: api, database
tags: [fastapi, sqlalchemy, supabase, rls, deadline, pin, delete]

# Dependency graph
requires:
  - phase: 15-core-services-api-routes
    provides: DeadlineService, UnifiedDeadline model, deadline REST endpoints
  - phase: 13-supabase-foundation
    provides: Supabase schema, RLS policy patterns, profiles table
provides:
  - deadline_user_actions table with RLS policies
  - DeadlineUserAction ORM model
  - DeadlineService user action methods (get/create/delete)
  - POST /deadlines/{id}/actions and DELETE /deadlines/{id}/actions/{action} endpoints
  - is_pinned/is_deleted fields on GET /deadlines response
affects: [28-02, 28-03, frontend-deadlines-page]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Separate user action table for sync-safe persistence (D-07)"
    - "Action map pattern translating frontend verbs to DB values"
    - "pg_insert on_conflict_do_nothing for idempotent upsert"

key-files:
  created:
    - supabase/migrations/00000000000006_deadline_user_actions.sql
    - src/models/deadline_user_action.py
  modified:
    - src/models/__init__.py
    - src/schemas/deadline.py
    - src/services/deadline.py
    - src/web/routes/deadlines.py

key-decisions:
  - "ForeignKey references profiles.id in ORM (matching app-level pattern) while SQL migration references auth.users(id) directly"
  - "on_conflict_do_nothing for upsert instead of raising error on duplicate pin/delete"
  - "Action map at route level translates pin->pinned, delete->deleted for cleaner frontend API"

patterns-established:
  - "User action persistence separate from sync-managed tables (D-07 pattern)"
  - "Action verb mapping at route handler level for frontend-friendly API"

requirements-completed: [DL-UX-05]

# Metrics
duration: 4min
completed: 2026-04-04
---

# Phase 28 Plan 01: Deadline User Actions Backend Summary

**Deadline pin/delete persistence layer with Supabase migration, RLS policies, service methods, and two REST endpoints**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-04T11:30:54Z
- **Completed:** 2026-04-04T11:34:31Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created deadline_user_actions table with UUID PK, user_id/deadline_id FKs, action_type CHECK constraint, and UNIQUE constraint
- Enabled RLS with 3 policies (SELECT, INSERT, DELETE) for per-user data isolation
- Added 3 service methods (get_user_actions, create_user_action, delete_user_action) with ownership verification
- Extended GET /deadlines to return is_pinned/is_deleted boolean fields per deadline
- Added POST /{deadline_id}/actions and DELETE /{deadline_id}/actions/{action} endpoints

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration + ORM model + schemas** - `61c32bb` (feat)
2. **Task 2: Service methods + API route endpoints** - `f96ebbf` (feat)

## Files Created/Modified
- `supabase/migrations/00000000000006_deadline_user_actions.sql` - Table creation, indexes, RLS policies
- `src/models/deadline_user_action.py` - DeadlineUserAction ORM model with UUIDMixin
- `src/models/__init__.py` - Model registration for metadata population
- `src/schemas/deadline.py` - DeadlineActionCreate, DeadlineActionResponse, is_pinned/is_deleted on ContractDeadlineResponse
- `src/services/deadline.py` - Three new methods on DeadlineService for user action CRUD
- `src/web/routes/deadlines.py` - Updated list endpoint + two new action endpoints

## Decisions Made
- ForeignKey in ORM references `profiles.id` (app-level table) while SQL migration references `auth.users(id)` directly -- consistent with existing patterns where profiles.id == auth.users(id)
- Used `on_conflict_do_nothing` for idempotent upsert -- re-pinning an already-pinned deadline is safe, no error needed
- Action map at route level translates friendly frontend verbs (pin/delete) to DB-stored values (pinned/deleted)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend API ready for frontend mutation hooks (Plan 02: frontend hooks + mock API updates)
- Plan 03 depends on these endpoints for deadline card redesign with pin/delete UI

## Self-Check: PASSED

All 6 files verified present. Both task commits (61c32bb, f96ebbf) verified in git log. SUMMARY.md created.

---
*Phase: 28-deadlines-page-enhancement*
*Completed: 2026-04-04*
