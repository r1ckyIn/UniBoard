---
id: 260423-ebp
slug: purge-null-canvas-courses
title: Purge stale canvas_course_id=NULL Course rows at end of _upsert_courses
type: quick
date: 2026-04-23
status: planned
commit_plan: atomic
---

# Quick Task 260423-ebp — Purge stale `canvas_course_id=NULL` Course rows

## Goal
In `_upsert_courses` (src/sync/courses.py), after all upsert/merge logic but before
`session.flush()`, delete every `Course` row for the current `user_id` whose
`canvas_course_id IS NULL`.

## Why
PR #113 added the Ed-only skip at the head of `_upsert_courses` so new syncs never
create `canvas_course_id=NULL` rows. Historical rows written before that guard
still linger in Supabase and leak into the user's course list (wrong course
count on `/courses`, ghost enrolments in the sidebar picker). Purging them
inside the same sync that already visits the user gives us a free, idempotent
cleanup without a one-shot migration.

## Approach
Use ORM-level `session.delete()` (not bulk DELETE) so Course's
`cascade="all, delete-orphan"` relationships tear down associated
grades / modules / lessons / deadlines / unit_outlines / discussion_threads
cleanly — same cascade contract every other delete in this codebase relies
on.

```python
# After the for-linked loop, before `await session.flush()`:
stale = (
    await session.execute(
        select(Course).where(
            Course.user_id == user_id,
            Course.canvas_course_id.is_(None),
        )
    )
).scalars().all()
for course in stale:
    logger.info(
        "course_upsert_purge_stale",
        user_id=str(user_id),
        course_id=str(course.id),
        code=course.code,
        semester=course.semester,
    )
    await session.delete(course)

await session.flush()
```

## Files Touched
- `src/sync/courses.py` — add purge block + docstring note
- `tests/unit/test_upsert_courses_merge.py` — generalise fake session's
  `_match_rows` to handle `.is_(None)` clauses; add `test_purges_stale_null_canvas_rows`

## Tasks
1. Generalise `_match_rows` in `tests/unit/test_upsert_courses_merge.py` to
   build a column-name → value dict (handles any WHERE shape, including
   `.is_(None)`), so the new purge query can be matched by the fake session.
2. Add purge block at the end of `_upsert_courses`. Keep ORM-level delete to
   preserve cascade semantics. Log each purge at `info` level.
3. Extend docstring: note that the purge reconciles pre-#113 rows so callers
   know the function now has a cleanup side-effect.
4. Add unit test `test_purges_stale_null_canvas_rows` — seeds a zombie row,
   runs `_upsert_courses` with an unrelated LinkedCourse, asserts the zombie
   is gone and the Canvas-linked row remains.

## must_haves
- `canvas_course_id IS NULL` rows for the current `user_id` are deleted every
  sync tick via ORM delete (so cascade fires).
- Logs record purged rows (`course_upsert_purge_stale`) with enough context to
  reproduce / audit.
- Existing merge/dedupe tests still pass.
- New test covers: zombie row + untouched Canvas-linked row, in isolation.

## verify
- `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && uv run ruff check src/sync/courses.py tests/unit/test_upsert_courses_merge.py`
- `uv run mypy src/sync/courses.py`
- `uv run pytest tests/unit/test_upsert_courses_merge.py -q`

## done when
All three verify commands pass and the new test asserts the zombie row is
removed while the Canvas-linked row survives a sync cycle.
