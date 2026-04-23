---
id: 260423-gir
slug: add-on-delete-cascade-to-all-course-prof
title: Add ON DELETE CASCADE to all Course/Profile/Module/Lesson child FKs
type: quick
date: 2026-04-23
status: complete
---

# Quick Task 260423-gir — Summary

## Pivot after code review — migration reverted

Initial intent was to add DB-level ON DELETE CASCADE + Alembic migration
009 + paired Supabase migration. Code review caught a critical discovery
before merge: the Supabase initial schema
(`supabase/migrations/00000000000001_initial_schema.sql`) already declares
`ON DELETE CASCADE` on every FK this PR targeted. Verification:

```
grep -rn "REFERENCES" supabase/migrations/ | grep -v "ON DELETE CASCADE"
→ (zero results)
```

The migration was therefore at best no-op (13 entries) and at worst a
semantic regression (5 entries silently re-parented `user_id` FKs from
`auth.users(id)` → `profiles(id)`, severing the auth-delete cascade
path).

Both migration files removed in a follow-up commit. The ORM diff is
retained — it documents the CASCADE contract in the code developers
read, and aligns the SA metadata with what the DB actually does.

## Latent drift discovered (out of scope — follow-up)

Five `user_id` FKs carry an ORM-vs-DB parent-table drift:
- ORM declares: `ForeignKey("profiles.id")`
- Supabase reality: `REFERENCES auth.users(id) ON DELETE CASCADE`

Affected: courses, digests, notifications, push_records, whatif_scenarios.
`profiles.id == auth.users.id` by insert trigger, so the drift is
functionally invisible at runtime. But SA `create_all()` / alembic
autogenerate would emit FKs against `profiles.id`, not `auth.users(id)`,
which is misleading for test DBs and future contributors.

Separate follow-up: decide whether to (a) update ORM to reflect
`auth.users` reality, or (b) migrate Supabase FKs to `profiles` to match
ORM.

## Second follow-up (also out of scope)

PR #115 added `_CASCADE_LOAD_OPTIONS` in `src/sync/courses.py` as a
symptom fix for MissingGreenlet on async `session.delete()`. After this
PR's ORM diff lands, the fix is still necessary — DB cascade alone does
not prevent SQLAlchemy from trying to lazy-load children during ORM
delete processing. To actually remove the selectinload, cascade
relationships need `passive_deletes=True` so SA trusts the DB.

Suggested 1-PR follow-up: add `passive_deletes=True` to every
`cascade="all, delete-orphan"` relationship in `src/models/course.py` and
siblings, then remove `_CASCADE_LOAD_OPTIONS`.

## Files changed (final)

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

No Alembic migration. No Supabase SQL migration.

## Verification

- `uv run ruff check src/models` → All checks passed
- `uv run mypy src/models` → Success: no issues found in 20 source files
- `uv run pytest tests/unit -q -m "not db" --deselect tests/unit/test_digest_service.py`
  → 446 passed, 35 deselected (DB/pgvector), 25 warnings (pre-existing)
- `grep -c 'ondelete="CASCADE"' src/models/*.py` → 21 hits
  (18 new + 3 pre-existing: deadline_user_actions×2, study_recommendation_cache×1)
- `grep -rn "REFERENCES" supabase/migrations/ | grep -v "ON DELETE CASCADE"`
  → zero results (confirms DB already CASCADE everywhere)

## Not included (out of scope)

- `skill_executions.skill_id` (parent = `skills`, not C/P/M/L)
- `ai_feedback.thread_id` (parent = `discussion_threads`, not C/P/M/L)
- `deadline_user_actions.unified_deadline_id` (parent = `unified_deadlines`,
  not C/P/M/L; already CASCADE regardless)
