---
phase: 23-code-quality
plan: 01
subsystem: api
tags: [python, refactoring, sync-engine, module-splitting]

requires:
  - phase: 16-sync-engine
    provides: Original sync/tasks.py monolithic module with all sync functions
provides:
  - 7 domain-specific sync modules (grades, deadlines, modules, outlines, discussions, scheduled, _shared)
  - Backward-compatible __init__.py re-exports for all public sync functions
affects: [23-code-quality, sync-engine, deployment]

tech-stack:
  added: []
  patterns:
    - "Shared infrastructure module (_shared.py) with session factory and history recording"
    - "Domain-specific sync modules with lazy adapter imports preserved"
    - "Package-level __init__.py re-exports for backward compatibility"

key-files:
  created:
    - src/sync/_shared.py
    - src/sync/grades.py
    - src/sync/deadlines.py
    - src/sync/modules.py
    - src/sync/outlines.py
    - src/sync/discussions.py
    - src/sync/scheduled.py
  modified:
    - src/sync/__init__.py
    - src/sync/engine.py
    - src/web/routes/sync.py
    - tests/unit/test_sync_tasks.py
    - tests/unit/test_sync_ed_discussions.py
    - tests/unit/test_deadline_reminders.py
    - tests/unit/test_token_health.py
    - tests/integration/test_sync_engine.py

key-decisions:
  - "One-directional dependency: _shared.py has zero imports from sibling domain modules"
  - "Lazy adapter imports preserved inside function bodies to match original pattern"
  - "Package-level re-exports in __init__.py for backward-compatible engine.py imports"

patterns-established:
  - "Shared infrastructure pattern: _shared.py provides session factory and common utilities"
  - "Domain module pattern: each sync domain in its own file with only its required imports"

requirements-completed: [QUAL-01]

duration: 7min
completed: 2026-04-01
---

# Phase 23 Plan 01: Sync Tasks Module Split Summary

**Split 1147-line sync/tasks.py god module into 7 domain modules (max 294 lines), all 20 unit tests passing**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-01T06:43:04Z
- **Completed:** 2026-04-01T06:50:00Z
- **Tasks:** 2
- **Files modified:** 16 (7 created, 1 deleted, 8 modified)

## Accomplishments
- Split 1147-line monolithic tasks.py into 7 focused domain modules, none exceeding 300 lines
- Updated all consumer imports (engine.py, sync route, 5 test files) to use new module paths
- Zero references to `src.sync.tasks` remain in the codebase
- All 20 sync-related unit tests pass with zero failures

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract domain modules from tasks.py and wire __init__.py re-exports** - `475e7c1` (refactor)
2. **Task 2: Update all consumer imports and test patch targets** - `2b144b5` (refactor)

## Files Created/Modified

### Created
- `src/sync/_shared.py` (63 lines) - Session factory, sync history recording, shared constants
- `src/sync/grades.py` (204 lines) - Grade sync: _sync_user_grades, sync_all_grades
- `src/sync/deadlines.py` (190 lines) - Deadline sync: sync_all_deadlines (Canvas + Ed aggregation)
- `src/sync/modules.py` (294 lines) - Module sync: sync_all_modules, _sync_canvas_modules, _sync_ed_lessons, _translate_user_courses
- `src/sync/outlines.py` (124 lines) - Unit Outline sync: sync_all_outlines
- `src/sync/discussions.py` (200 lines) - Ed Discussion sync: sync_ed_discussions, _evaluate_synced_threads
- `src/sync/scheduled.py` (175 lines) - Scheduled tasks: check_deadline_reminders, generate_daily_digests, check_token_health

### Deleted
- `src/sync/tasks.py` (1147 lines) - Original god module

### Modified
- `src/sync/__init__.py` - Re-exports all 8 public functions for backward compatibility
- `src/sync/engine.py` - Import from `src.sync` package instead of `src.sync.tasks`
- `src/web/routes/sync.py` - Import from `src.sync` package instead of `src.sync.tasks`
- `tests/unit/test_sync_tasks.py` - Patch targets updated to domain-specific modules
- `tests/unit/test_sync_ed_discussions.py` - Patch targets updated to `src.sync.discussions`
- `tests/unit/test_deadline_reminders.py` - Patch targets updated to `src.sync.scheduled`
- `tests/unit/test_token_health.py` - Patch targets updated to `src.sync.scheduled`
- `tests/integration/test_sync_engine.py` - Import _sync_user_grades from `src.sync.grades`

## Decisions Made
- One-directional dependency flow: `_shared.py` -> domain modules (no reverse imports)
- Lazy adapter imports preserved inside function bodies to avoid circular import issues
- Package-level `__init__.py` re-exports all public functions for backward-compatible imports from `src.sync`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all modules extracted cleanly along the pre-identified domain boundaries.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sync module split complete, ready for Plan 02 (DRY consolidation) and Plan 03 (dead code removal)
- No blockers or concerns

---
*Phase: 23-code-quality*
*Completed: 2026-04-01*
