-- Migration: 20260423000001_on_delete_cascade_fks
--
-- Purpose: add ON DELETE CASCADE to every child FK whose parent is
-- courses, profiles, modules, or lessons. Mirrors Alembic migration
-- 009_on_delete_cascade_fks.py so Supabase console / psql replays match
-- what the Python app declares in src/models/.
--
-- Why: ORM-level cascade="all, delete-orphan" only fires when the
-- collection is loaded. Raw DELETEs bypass it; historically this has
-- surfaced as stale child rows (e.g. the canvas_course_id=NULL Course
-- purge in #115). Hardening the DB layer closes that gap.
--
-- Idempotency: each FK is dropped with IF EXISTS before being re-added.
-- Safe to re-run.

DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT * FROM (VALUES
      -- Parent: profiles
      ('courses',             'user_id',    'profiles'),
      ('digests',             'user_id',    'profiles'),
      ('ai_feedback',         'user_id',    'profiles'),
      ('whatif_scenarios',    'user_id',    'profiles'),
      ('notifications',       'user_id',    'profiles'),
      ('sync_history',        'user_id',    'profiles'),
      ('push_records',        'user_id',    'profiles'),
      -- Parent: courses
      ('grades',              'course_id',  'courses'),
      ('modules',             'course_id',  'courses'),
      ('skills',              'course_id',  'courses'),
      ('skill_executions',    'course_id',  'courses'),
      ('lessons',             'course_id',  'courses'),
      ('content_embeddings',  'course_id',  'courses'),
      ('unified_deadlines',   'course_id',  'courses'),
      ('discussion_threads',  'course_id',  'courses'),
      ('unit_outlines',       'course_id',  'courses'),
      -- Parent: modules
      ('module_items',        'module_id',  'modules'),
      -- Parent: lessons
      ('slides',              'lesson_id',  'lessons')
    ) AS t(child_table, column_name, parent_table)
  LOOP
    EXECUTE format(
      'ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I',
      fk.child_table,
      fk.child_table || '_' || fk.column_name || '_fkey'
    );
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I '
      'FOREIGN KEY (%I) REFERENCES %I(id) ON DELETE CASCADE',
      fk.child_table,
      fk.child_table || '_' || fk.column_name || '_fkey',
      fk.column_name,
      fk.parent_table
    );
  END LOOP;
END$$;
