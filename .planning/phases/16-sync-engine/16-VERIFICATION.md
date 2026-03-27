---
phase: 16-sync-engine
verified: 2026-03-27T18:00:00Z
status: passed
score: 10/10 must-haves verified
must_haves:
  truths:
    # Plan 01
    - "Deadline sync populates ed_lessons_data and ed_discussion_texts from Ed adapters instead of passing empty lists"
    - "Unit Outline sync task exists and runs on semester-initial CronTrigger (March + August)"
    - "sync_history table records every sync run with domain, status, records_updated, and timestamps"
    - "GET /sync/history returns sync history entries for the current user"
    - "Manual sync trigger with scope=outline calls sync_all_outlines for the user"
    # Plan 02
    - "Unit tests verify Ed source wiring in deadline sync with mocked adapters"
    - "Unit tests verify outline sync task with mocked UnitOutlineParser"
    - "Unit tests verify sync_history recording after grade/deadline/module sync"
    - "Integration tests use Profile + JWT (not obsolete User model + password)"
    - "Integration tests verify GET /sync/history returns sync entries"
  artifacts:
    - path: "src/models/sync_history.py"
      provides: "SyncHistory ORM model"
      contains: "class SyncHistory"
    - path: "supabase/migrations/00000000000003_sync_history.sql"
      provides: "sync_history table DDL"
      contains: "CREATE TABLE sync_history"
    - path: "src/sync/tasks.py"
      provides: "sync_all_outlines function + Ed source wiring in sync_all_deadlines"
      exports: ["sync_all_outlines"]
    - path: "src/sync/engine.py"
      provides: "Outline sync CronTrigger job registration"
      contains: "sync_all_outlines"
    - path: "tests/unit/test_sync_tasks.py"
      provides: "Unit tests for all sync task logic"
      min_lines: 100
    - path: "tests/integration/test_sync_engine.py"
      provides: "Integration tests with Profile + JWT auth"
      contains: "Profile"
  key_links:
    - from: "src/sync/tasks.py"
      to: "src/adapters/ed_lessons.py"
      via: "EdLessonsAdapter.get_lessons() in sync_all_deadlines"
    - from: "src/sync/tasks.py"
      to: "src/adapters/ed_discussion.py"
      via: "EdDiscussionAdapter.get_threads() in sync_all_deadlines"
    - from: "src/sync/tasks.py"
      to: "src/parsers/usyd_outline.py"
      via: "UnitOutlineParser.fetch_and_parse() in sync_all_outlines"
    - from: "src/sync/tasks.py"
      to: "src/models/sync_history.py"
      via: "session.add(SyncHistory(...)) in _record_sync_history"
    - from: "tests/unit/test_sync_tasks.py"
      to: "src/sync/tasks.py"
      via: "import and mock-based testing"
    - from: "tests/integration/test_sync_engine.py"
      to: "src/web/routes/sync.py"
      via: "HTTP endpoint testing via test_client"
gaps: []  # gap resolved: sync trigger now dispatches tasks via asyncio.create_task (commit 99c0a43)
---

# Phase 16: Sync Engine Verification Report

**Phase Goal:** Automated background data synchronization keeps all data fresh
**Verified:** 2026-03-27T18:00:00Z
**Status:** passed
**Re-verification:** Gap fixed inline (commit 99c0a43) — manual trigger now dispatches sync tasks

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Deadline sync populates ed_lessons_data and ed_discussion_texts from Ed adapters | VERIFIED | `src/sync/tasks.py` lines 264-330: EdLessonsAdapter.get_lessons() and EdDiscussionAdapter.get_threads() called within sync_all_deadlines, results passed to aggregate_and_dedup |
| 2 | Unit Outline sync task exists and runs on semester-initial CronTrigger | VERIFIED | `src/sync/tasks.py` line 734: sync_all_outlines() with UnitOutlineParser.fetch_and_parse(); `src/sync/engine.py` lines 74-86: CronTrigger(month="3,8", day=1, timezone="Australia/Sydney") |
| 3 | sync_history table records every sync run with domain, status, records_updated, timestamps | VERIFIED | `src/models/sync_history.py`: SyncHistory ORM model with all fields; `supabase/migrations/00000000000003_sync_history.sql`: DDL with RLS; `src/sync/tasks.py` line 707: _record_sync_history helper called after sync_all_grades, sync_all_deadlines, sync_all_modules |
| 4 | GET /sync/history returns sync history entries for the current user | VERIFIED | `src/web/routes/sync.py` lines 73-108: GET /history endpoint with domain filtering, ordering, and limit |
| 5 | Manual sync trigger with scope=outline calls sync_all_outlines | VERIFIED | POST /sync/trigger dispatches sync_all_outlines via asyncio.create_task when scope=outline; dispatches all 4 sync functions for scope=all (commit 99c0a43) |
| 6 | Unit tests verify Ed source wiring in deadline sync with mocked adapters | VERIFIED | `tests/unit/test_sync_tasks.py`: TestSyncAllDeadlinesEdWiring class with 3 tests covering Ed Lessons data flow, Ed Discussion text flow, Ed token expiry handling |
| 7 | Unit tests verify outline sync task with mocked UnitOutlineParser | VERIFIED | `tests/unit/test_sync_tasks.py`: TestSyncAllOutlines class with 2 tests covering parser invocation and retry behavior |
| 8 | Unit tests verify sync_history recording after grade/deadline/module sync | VERIFIED | `tests/unit/test_sync_tasks.py`: TestRecordSyncHistory class with 2 tests covering direct _record_sync_history and sync_all_grades integration |
| 9 | Integration tests use Profile + JWT (not obsolete User model) | VERIFIED | `tests/integration/test_sync_engine.py`: _create_test_jwt helper, _create_test_profile_and_jwt helper, Profile model used throughout |
| 10 | Integration tests verify GET /sync/history returns sync entries | VERIFIED | `tests/integration/test_sync_engine.py`: test_sync_history_endpoint and test_sync_history_filter_by_domain |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/models/sync_history.py` | SyncHistory ORM model | VERIFIED | 31 lines, class SyncHistory with all required fields, FK to profiles, compound indexes |
| `supabase/migrations/00000000000003_sync_history.sql` | sync_history table DDL | VERIFIED | 29 lines, CREATE TABLE + indexes + RLS policy + trigger |
| `src/sync/tasks.py` | Ed source wiring + sync_all_outlines + _record_sync_history | VERIFIED | 814 lines, all three functions implemented with retry logic and error handling |
| `src/sync/engine.py` | Outline CronTrigger job registration | VERIFIED | 140 lines, sync_all_outlines registered with CronTrigger(month="3,8", day=1, AEST) |
| `src/schemas/sync.py` | SyncHistoryEntry + SyncHistoryResponse | VERIFIED | 45 lines, both Pydantic models present |
| `src/web/routes/sync.py` | GET /sync/history endpoint | VERIFIED | 154 lines, endpoint with domain filtering |
| `src/models/__init__.py` | SyncHistory export | VERIFIED | SyncHistory imported and in __all__ |
| `src/config.py` | sync_outline_cron_months/day settings | VERIFIED | sync_outline_cron_months="3,8", sync_outline_cron_day=1 |
| `tests/unit/test_sync_tasks.py` | Unit tests for sync task logic | VERIFIED | 465 lines, 7 tests covering Ed wiring, outline sync, sync_history |
| `tests/integration/test_sync_engine.py` | Integration tests with Profile+JWT | VERIFIED | 216 lines, 6 tests with Profile+JWT auth pattern |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/sync/tasks.py | src/adapters/ed_lessons.py | EdLessonsAdapter.get_lessons() in sync_all_deadlines | WIRED | Lines 266-274: lazy import + get_lessons() call with course.ed_course_id |
| src/sync/tasks.py | src/adapters/ed_discussion.py | EdDiscussionAdapter.get_threads() in sync_all_deadlines | WIRED | Lines 299-306: lazy import + get_threads() call with course.ed_course_id |
| src/sync/tasks.py | src/parsers/usyd_outline.py | UnitOutlineParser.fetch_and_parse() in sync_all_outlines | WIRED | Lines 736-754: UnitOutlineParser instantiated and fetch_and_parse() called per course |
| src/sync/tasks.py | src/models/sync_history.py | session.add(SyncHistory(...)) in _record_sync_history | WIRED | Lines 717-731: lazy import + SyncHistory instance created and added to session |
| src/sync/engine.py | src/sync/tasks.py | sync_all_outlines imported and registered as CronTrigger job | WIRED | Lines 45-46: import; lines 74-86: scheduler.add_job() with CronTrigger |
| tests/unit/test_sync_tasks.py | src/sync/tasks.py | from src.sync.tasks import ... | WIRED | Line 12: imports sync_all_deadlines, sync_all_grades, sync_all_outlines, _record_sync_history |
| tests/integration/test_sync_engine.py | src/web/routes/sync.py | HTTP endpoint testing | WIRED | Tests hit /api/v1/sync/status, /api/v1/sync/trigger, /api/v1/sync/history |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INFRA-02 | 16-01, 16-02 | Background sync engine: grades every 15 min, deadlines hourly, modules daily, Unit Outline per semester | SATISFIED | Grade sync: IntervalTrigger(15min) in engine.py; Deadline sync: IntervalTrigger(hourly) with Ed source wiring; Module sync: CronTrigger(daily); Outline sync: CronTrigger(semester-initial March+Aug). Sync history tracks all operations. Manual trigger dispatches correct sync functions per scope. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No TODO/FIXME/HACK/placeholder comments found in any modified file |

### Human Verification Required

### 1. APScheduler CronTrigger Timing

**Test:** Start the application and observe scheduler logs for job registration
**Expected:** Logs show sync_grades at 15min interval, sync_deadlines at 60min interval, sync_modules daily, sync_outlines on month=3,8 day=1
**Why human:** APScheduler cron timing requires real clock observation; cannot verify trigger firing programmatically without running the scheduler

### 2. End-to-End Sync with Live Adapters

**Test:** Configure real Canvas/Ed tokens, trigger sync, verify data appears in database
**Expected:** Grades, deadlines (including Ed sources), and modules populate in database tables; sync_history entries are created
**Why human:** Requires live API credentials and database inspection; adapter behavior depends on external services

### Gaps Summary

No gaps remaining. The original gap (manual trigger not dispatching sync tasks) was fixed inline in commit `99c0a43` — trigger_sync() now uses asyncio.create_task() to dispatch the correct sync function based on scope parameter.

---

_Verified: 2026-03-27T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
