---
id: 260423-gir
slug: add-on-delete-cascade-to-all-course-prof
title: Add ON DELETE CASCADE to all Course/Profile/Module/Lesson child FKs
type: quick
date: 2026-04-23
status: complete
---

# Quick Task 260423-gir — Summary

## What shipped

1. **SQLAlchemy ORM hardening** — added `ondelete="CASCADE"` to 18 FKs
   across 15 model files. Every child FK whose parent is `courses`,
   `profiles`, `modules`, or `lessons` now declares CASCADE at the
   DB layer (matching the existing ORM-level
   `cascade="all, delete-orphan"` contract on the parent side).

2. **Alembic migration** `alembic/versions/009_on_delete_cascade_fks.py`
   — idempotent `DROP CONSTRAINT IF EXISTS` + re-add with
   `ON DELETE CASCADE` for all 18 FKs. Head of the Alembic chain
   advanced from `008_unit_outlines_uq` to `009_on_delete_cascade_fks`.
   `downgrade()` reverts to default `NO ACTION`.

3. **Paired Supabase SQL migration**
   `supabase/migrations/20260423000001_on_delete_cascade_fks.sql`
   — same idempotent effect wrapped in `DO $$ … END $$` so it's safe
   to replay from the Supabase SQL console.

## Files changed

- `src/models/course.py` (user_id → profiles)
- `src/models/digest.py` (user_id → profiles)
- `src/models/ai_feedback.py` (user_id → profiles; thread_id untouched)
- `src/models/whatif.py` (user_id → profiles)
- `src/models/notification.py` (user_id → profiles)
- `src/models/sync_history.py` (user_id → profiles)
- `src/models/push_record.py` (user_id → profiles)
- `src/models/grade.py` (course_id → courses)
- `src/models/module.py` (Module.course_id → courses; ModuleItem.module_id → modules)
- `src/models/skill.py` (Skill.course_id + SkillExecution.course_id → courses; skill_id untouched)
- `src/models/lesson.py` (Lesson.course_id → courses; Slide.lesson_id → lessons)
- `src/models/embedding.py` (course_id → courses)
- `src/models/deadline.py` (course_id → courses)
- `src/models/discussion.py` (course_id → courses)
- `src/models/unit_outline.py` (course_id → courses)
- `alembic/versions/009_on_delete_cascade_fks.py` (new, 18 FKs)
- `supabase/migrations/20260423000001_on_delete_cascade_fks.sql` (new)

## Verification

- `uv run ruff check src/models` → All checks passed
- `uv run mypy src/models` → Success: no issues found in 20 source files
- `uv run pytest tests/unit -q -x -m "not db" --deselect tests/unit/test_digest_service.py`
  → 431 passed, 35 deselected (DB/pgvector), 25 warnings (pre-existing)
- `uv run alembic heads` → `009_on_delete_cascade_fks (head)`
- `grep -c 'ondelete="CASCADE"' src/models/*.py` → 21 hits
  (18 new + 3 pre-existing: deadline_user_actions×2, study_recommendation_cache×1)

## Not included (out of scope)

- `skill_executions.skill_id` (parent = `skills`, not C/P/M/L)
- `ai_feedback.thread_id` (parent = `discussion_threads`, not C/P/M/L)
- `deadline_user_actions.unified_deadline_id` (parent = `unified_deadlines`,
  not C/P/M/L; already CASCADE regardless)

## Follow-up

- The manual purge block added in #115 (`_upsert_courses` stale
  `canvas_course_id=NULL` cleanup) can now be simplified if desired:
  the ORM cascade still works, and raw SQL paths are also safe.
  Leaving as-is for now — explicit purge is defensive and not redundant.
- Next deployment: run `alembic upgrade head` (Railway) and apply the
  Supabase SQL migration via `supabase db push` in production.
