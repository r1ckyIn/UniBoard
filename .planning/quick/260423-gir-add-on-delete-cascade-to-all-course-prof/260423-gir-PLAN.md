---
id: 260423-gir
slug: add-on-delete-cascade-to-all-course-prof
title: Add ON DELETE CASCADE to all Course/Profile/Module/Lesson child FKs
type: quick
date: 2026-04-23
status: planned
commit_plan: atomic
---

# Quick Task 260423-gir — Harden FK cascade at DB layer

## Goal
Add Postgres-level `ON DELETE CASCADE` to every child FK whose parent is
`courses`, `profiles`, `modules`, or `lessons`. Update both the SQLAlchemy
ORM models (so `metadata.create_all` and fresh envs reflect the contract)
and ship paired Alembic + Supabase migrations so existing databases are
migrated in place.

## Why
ORM-level `cascade="all, delete-orphan"` already exists on most parent
relationships (`Profile.courses`, `Course.modules`, `Course.lessons`, etc.)
but it **only fires when the ORM loads the collection first**. Raw
`DELETE FROM courses WHERE …` or a SAVEPOINT rollback that skips flush
leaves orphan children and trips FK constraint errors downstream.

Recent fixes (#113–#115) added a manual purge in `_upsert_courses` for
stale `canvas_course_id=NULL` Course rows — that purge relies on ORM-level
cascade. Hardening the DB layer closes the gap for every other path
(maintenance scripts, Supabase SQL console, future migrations) and makes
the purge logic tolerant of bulk deletes.

## Scope (18 FKs, 15 model files, 1 Alembic migration, 1 Supabase migration)

| Parent | Child table | Column | Nullable | Model |
|--------|-------------|--------|----------|-------|
| profiles | courses | user_id | no | course.py |
| profiles | digests | user_id | no | digest.py |
| profiles | ai_feedback | user_id | no | ai_feedback.py |
| profiles | whatif_scenarios | user_id | no | whatif.py |
| profiles | notifications | user_id | no | notification.py |
| profiles | sync_history | user_id | no | sync_history.py |
| profiles | push_records | user_id | no | push_record.py |
| courses | grades | course_id | no | grade.py |
| courses | modules | course_id | no | module.py |
| courses | skills | course_id | yes | skill.py |
| courses | skill_executions | course_id | yes | skill.py |
| courses | lessons | course_id | no | lesson.py |
| courses | content_embeddings | course_id | no | embedding.py |
| courses | unified_deadlines | course_id | no | deadline.py |
| courses | discussion_threads | course_id | no | discussion.py |
| courses | unit_outlines | course_id | no | unit_outline.py |
| modules | module_items | module_id | no | module.py |
| lessons | slides | lesson_id | no | lesson.py |

Already CASCADE (left alone): `deadline_user_actions.user_id`,
`deadline_user_actions.unified_deadline_id`, `study_recommendation_cache.user_id`.

Out of scope: `skill_executions.skill_id` (parent=`skills`),
`ai_feedback.thread_id` (parent=`discussion_threads`).

## Approach (final, ORM-only after code-review pivot)

### Part A — ORM models (shipped)
In each file listed above, change
```python
ForeignKey("courses.id")
```
to
```python
ForeignKey("courses.id", ondelete="CASCADE")
```
(likewise for `profiles.id`, `modules.id`, `lessons.id`). Keep existing
nullability and relationship `cascade="all, delete-orphan"` — the ORM
cascade is still correct; SA metadata is being re-aligned with DB reality.

### Part B — Alembic migration `009_on_delete_cascade_fks` (REVERTED)
Originally: idempotent `ALTER TABLE … DROP CONSTRAINT IF EXISTS … ADD
CONSTRAINT … ON DELETE CASCADE` for all 18 FKs. **Removed before merge.**

Reason: code review + `grep -rn "REFERENCES" supabase/migrations/ | grep
-v "ON DELETE CASCADE"` → zero hits. Supabase prod already CASCADEs every
FK in scope. The migration was therefore no-op for 13 entries and a
silent regression for 5 (would have re-parented `user_id` FKs from
`auth.users(id)` → `profiles(id)`, severing the auth-delete cascade
path).

### Part C — Paired Supabase migration (REVERTED)
Same reason as Part B. Both files dropped; no DB-layer change ships in
this PR.

## Files Touched
- `src/models/course.py`
- `src/models/digest.py`
- `src/models/ai_feedback.py`
- `src/models/whatif.py`
- `src/models/notification.py`
- `src/models/sync_history.py`
- `src/models/push_record.py`
- `src/models/grade.py`
- `src/models/module.py`
- `src/models/skill.py`
- `src/models/lesson.py`
- `src/models/embedding.py`
- `src/models/deadline.py`
- `src/models/discussion.py`
- `src/models/unit_outline.py`
- `alembic/versions/009_on_delete_cascade_fks.py` (new)
- `supabase/migrations/20260423000001_on_delete_cascade_fks.sql` (new)

## Tasks (final)
1. ✅ Update all 15 model files — add `ondelete="CASCADE"` to the 18 FKs.
2. ❌ Alembic migration — reverted after code review (DB already CASCADE).
3. ❌ Supabase SQL migration — reverted for same reason.

## must_haves (final)
- All 18 FKs listed in the scope table declare
  `ondelete="CASCADE"` in their SQLAlchemy `ForeignKey(…)` call.
- No DB migration ships (Supabase already CASCADEs every FK in scope).
- Pre-existing CASCADE FKs (deadline_user_actions, study_recommendation_cache)
  are not touched.
- `ruff`, `mypy`, and `pytest` all pass.

## verify
- `uv run ruff check src/models` → All checks passed
- `uv run mypy src/models` → Success
- `uv run pytest tests/unit -q -m "not db" --deselect tests/unit/test_digest_service.py`
  → 446 passed
- `grep -c 'ondelete="CASCADE"' src/models/*.py` → 21 hits
  (18 new + 3 pre-existing)
- `grep -rn "REFERENCES" supabase/migrations/ | grep -v "ON DELETE CASCADE"`
  → zero results (justifies migration revert)

## done when
All verify commands pass and every in-scope ORM FK declares CASCADE.
No Alembic or Supabase migration file ships in this PR.
