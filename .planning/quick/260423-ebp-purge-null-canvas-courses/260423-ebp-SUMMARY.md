---
id: 260423-ebp
slug: purge-null-canvas-courses
status: complete
branch: fix/purge-stale-null-canvas-courses
code_commit: ffc7f2d
date: 2026-04-23
merged: false
parallel_work: ed-lessons-sync-degraded (debug session investigating related area)
ship_deferred: true
---

# Quick Task 260423-ebp — SUMMARY

## What shipped
`_upsert_courses` (src/sync/courses.py) now ends with a purge block that
deletes every `Course` row for the current `user_id` whose
`canvas_course_id IS NULL`. ORM-level `session.delete()` drives the delete
so Course's `cascade="all, delete-orphan"` tears down attached grades,
modules, lessons, deadlines, unit_outlines, and discussion threads in the
same transaction.

## Why
PR #113 added the Ed-only skip at the head of `_upsert_courses`, so new
syncs never produce `canvas_course_id=NULL` rows. But historical zombies
written before that guard still linger in Supabase and leak into
`/courses` + the sidebar course picker. Purging inside the same sync that
already has the user session is free and idempotent.

## Files changed
| File | Change |
|------|--------|
| `src/sync/courses.py` | Added purge block before `session.flush()`; extended docstring. |
| `tests/unit/test_upsert_courses_merge.py` | Generalised fake session's `_match_rows` to a column-name → value dict so `.is_(None)` clauses resolve; added `test_purges_stale_null_canvas_rows` and `test_purges_zombie_even_when_no_linked_courses`. |

## Verify output
| Command | Result |
|---------|--------|
| `uv run ruff check src/sync/courses.py tests/unit/test_upsert_courses_merge.py` | All checks passed |
| `uv run mypy src/sync/courses.py` | Success: no issues found in 1 source file |
| `uv run pytest tests/unit/test_upsert_courses_merge.py -q` | 7 passed in 0.68s |
| `uv run pytest tests/unit/test_sync_courses*.py tests/unit/test_sync_ed_link.py -q` | 13 passed in 0.29s |

## must_haves — coverage
- [x] `canvas_course_id IS NULL` rows for current `user_id` deleted via ORM delete (cascade fires).
- [x] Each purge emits `course_upsert_purge_stale` log with `user_id`, `course_id`, `code`, `semester`.
- [x] Existing merge/dedupe tests still pass (5 original tests in file green).
- [x] New tests cover: mixed zombie + current-user Canvas-linked + other-user zombie; empty-linked edge case.

## Ship deferral — IMPORTANT
**This commit is NOT merged to main yet.** A parallel debug session
(`ed-lessons-sync-degraded`) is investigating "MCP ed_list_lessons(31567)
returns 26 lessons but DB lessons table stays empty after PR #113".

Because the purge in this commit **cascade-deletes lessons** attached to
any Course whose `canvas_course_id IS NULL`, merging this before the debug
session finishes risks polluting the crime scene: a user triggers sync,
zombies disappear, and `lessons` drops along with them — the debug session
would see the DB state shift under their feet.

**Plan:**
1. Stay on `fix/purge-stale-null-canvas-courses`; do NOT run `/gsd-ship`.
2. Wait for debug session to save evidence (Railway logs, DB snapshot of
   zombie rows + attached lessons).
3. Debug resolves →
   - If Ed lessons failure is unrelated to NULL courses → ship this as-is.
   - If they're coupled → fold this purge into the debug fix PR.

## Follow-ups (outside this quick task)
- None for this task. The broader "Ed lessons not landing in DB" is
  tracked by the parallel `ed-lessons-sync-degraded` debug session.

## Notes
- Test fake session's `_match_rows` got more general (column-name based
  filter dict). Existing 5 tests unaffected; extensibility for future
  purge/filter patterns improved.
- Purge query uses `.is_(None)` rather than `== None` to keep ruff's E711
  happy and match SQLAlchemy idiom.
