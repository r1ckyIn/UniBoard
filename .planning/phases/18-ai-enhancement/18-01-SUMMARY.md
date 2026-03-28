---
phase: 18-ai-enhancement
plan: 01
subsystem: sync, ai
tags: [apscheduler, ed-discussion, ai-evaluation, batch-limit, daily-reset, sync-engine]

# Dependency graph
requires:
  - phase: 17-notifications-digest
    provides: "Sync engine, notification infrastructure, Profile model with ai_calls_today"
  - phase: 14-platform-adapters
    provides: "EdDiscussionAdapter with get_threads()"
provides:
  - "Ed Discussion thread sync task (sync_ed_discussions) populating discussion_threads table"
  - "Post-sync AI evaluation hook (_evaluate_synced_threads)"
  - "Batch limit of 20 threads per sync cycle (D-07)"
  - "Daily AI call counter reset logic (_maybe_reset_daily_counter, D-09)"
  - "Intelligence route reads pre-computed scores only (no inline AI)"
affects: [18-02-PLAN, 18-03-PLAN, 19-mcp-agent]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Post-sync hook pattern: sync task triggers AI evaluation after data persistence"
    - "Batch limit constant (_BATCH_LIMIT=20) separate from daily limit"
    - "Daily counter reset on stale ai_calls_reset_date"
    - "Pre-computed score read pattern: routes query stored scores, not inline AI"

key-files:
  created:
    - tests/unit/test_sync_ed_discussions.py
  modified:
    - src/sync/tasks.py
    - src/sync/engine.py
    - src/services/intelligence.py
    - src/web/routes/intelligence.py
    - tests/unit/test_intelligence_ai.py

key-decisions:
  - "UPSERT uses index_elements=['course_id', 'ed_thread_id'] instead of constraint name for PostgreSQL compatibility"
  - "Staff detection from user.course_role in ('admin', 'staff') on thread data"
  - "Route fallback only when no AI key AND no results (pre-computed scores returned even if 0.0)"

patterns-established:
  - "Post-sync AI hook: sync_ed_discussions -> _evaluate_synced_threads -> EdIntelligenceService.evaluate_new_threads_ai"
  - "Batch limit pattern: min(calls_remaining, _BATCH_LIMIT) in evaluate_new_threads_ai"
  - "Daily counter reset: _maybe_reset_daily_counter checks ai_calls_reset_date.date() < today"

requirements-completed: [INTEL-02]

# Metrics
duration: 6min
completed: 2026-03-28
---

# Phase 18 Plan 01: Ed Discussion Sync -> AI Evaluation Pipeline Summary

**Ed Discussion thread sync task with post-sync AI batch evaluation, 20-thread batch limit, daily counter reset, and intelligence route refactored to read pre-computed scores**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-28T02:34:26Z
- **Completed:** 2026-03-28T02:41:17Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Ed Discussion threads now sync into discussion_threads table on 60-min interval via APScheduler
- Post-sync hook triggers AI batch evaluation for all synced user/course combinations
- Batch limit of 20 threads per sync cycle enforced (D-07), daily counter resets at midnight (D-09)
- Intelligence route no longer calls AI inline -- reads pre-computed scores only

## Task Commits

Each task was committed atomically:

1. **Task 1: Ed Discussion thread sync task + post-sync AI hook** - `26bee10` (feat)
2. **Task 2: Batch limit + daily counter reset + intelligence route fix** - `d7a634c` (feat)

_Note: TDD tasks had RED (failing tests) -> GREEN (implementation) -> verification cycle_

## Files Created/Modified
- `tests/unit/test_sync_ed_discussions.py` - 7 tests covering sync, upsert, skip-no-token, AI hook, history, error handling
- `tests/unit/test_intelligence_ai.py` - 4 new tests for batch limit, daily reset, no-reset-today, batch-vs-daily
- `src/sync/tasks.py` - Added sync_ed_discussions() and _evaluate_synced_threads()
- `src/sync/engine.py` - Registered sync_ed_discussions in APScheduler (interval + initial)
- `src/services/intelligence.py` - Added _BATCH_LIMIT=20, _maybe_reset_daily_counter(), applied min(remaining, batch)
- `src/web/routes/intelligence.py` - Removed _build_ai_engine, inline evaluate_new_threads_ai, AIEngine import

## Decisions Made
- Used index_elements instead of named constraint for UPSERT on_conflict_do_update (more portable)
- Staff detection uses user.course_role field from Ed API response (admin/staff roles)
- Route fallback logic: read pre-computed scores first, fall back to rule-based only when no API key AND empty results

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- discussion_threads table now populated by sync, ready for quality gate (18-02) to calculate F1
- Pre-computed scores available for frontend to display AI-enhanced results
- Feedback collection endpoints (18-02) can build on stored thread data

---
*Phase: 18-ai-enhancement*
*Completed: 2026-03-28*
