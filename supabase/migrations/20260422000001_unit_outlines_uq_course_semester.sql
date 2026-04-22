-- Migration: 20260422000001_unit_outlines_uq_course_semester
--
-- Purpose: add missing uniqueness constraint on (course_id, semester) to
-- unit_outlines. Without it, src/sync/outlines.py::sync_all_outlines fails
-- silently on every run because its ON CONFLICT targets a constraint that
-- did not exist, raising InvalidColumnReference which gets swallowed by the
-- task's generic retry loop.
--
-- Impact: once applied, outline sync will start persisting rows and the
-- course detail page can surface parsed assessment structure and learning
-- outcomes (Phase 31-ish follow-up recovery).
--
-- Idempotency: guarded by DO block that checks pg_constraint before adding.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_unit_outlines_course_semester'
      AND conrelid = 'public.unit_outlines'::regclass
  ) THEN
    -- Before adding the constraint, deduplicate any existing rows that
    -- would violate it. Keep the most recent (by fetched_at, then id).
    DELETE FROM unit_outlines a
    USING unit_outlines b
    WHERE a.course_id = b.course_id
      AND a.semester = b.semester
      AND (
        COALESCE(a.fetched_at, 'epoch'::timestamptz) < COALESCE(b.fetched_at, 'epoch'::timestamptz)
        OR (
          COALESCE(a.fetched_at, 'epoch'::timestamptz) = COALESCE(b.fetched_at, 'epoch'::timestamptz)
          AND a.id < b.id
        )
      );

    ALTER TABLE unit_outlines
      ADD CONSTRAINT uq_unit_outlines_course_semester
      UNIQUE (course_id, semester);
  END IF;
END$$;
