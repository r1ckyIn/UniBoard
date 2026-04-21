-- Migration: 20260420000001_phase38_perf_test_seed
-- Phase 38 Plan 04: seed fixture data for perf-test@uniboard.uk
--
-- Purpose: deterministic downstream rows for the Playwright pixel-diff
-- suite (frontend/tests/e2e/perf/first-paint.spec.ts). Keys off an
-- email lookup — the auth.users row itself MUST be created via the
-- Supabase Dashboard or CLI before applying this migration (we cannot
-- seed auth.users from a migration without the service-role key).
--
-- Idempotency: every INSERT uses ON CONFLICT ... DO NOTHING/UPDATE, so
-- this migration is safe to apply more than once. Re-running produces
-- no diff on downstream rows.
--
-- Frozen clock: the Playwright clock helper freezes time to
--   2026-04-01T08:00:00+10:00  ==  2026-03-31T22:00:00Z
-- Fixture deadlines are anchored so days_remaining rendering is stable:
--   Assignment 1     → 2026-04-08T10:00:00+10:00  (~7 d out)
--   Mid-term Exam    → 2026-04-15T14:00:00+10:00  (~14 d out)
--   Lab Report 2     → 2026-04-22T23:59:00+10:00  (~21 d out)
--
-- Schema reality (verified against 00000000000001_initial_schema.sql +
-- 00000000000005_language_and_translations.sql):
--   profiles        — has `language_preference VARCHAR(5) NOT NULL DEFAULT 'en'`
--                     (no column named `display_language` etc.)
--   courses         — id/user_id/canvas_course_id/code/name/semester/credit_points
--                     (no `level`, no `title`)
--   unified_deadlines — id/course_id/title/due_date/source/source_id/weight/
--                      description/dedup_key/is_confirmed (no `type`, no `status`)
--
-- Omitted intentionally (per plan D-B4 silent-degrade fixture baseline):
--   Canvas/Ed tokens    — RSC prefetch sees empty grades/ROI, which is
--                         exactly the "clean baseline" state we want
--                         stamped into the screenshots.
--   discussion_threads  — Digest/Predict fall back to their static copy.
--   study_recommendation_cache — Phase 34 AI hero uses its stage-3 fallback.
--   digests             — digest page renders its `data: null` placeholder.
--   sessions/weeks      — timetable page renders empty slots + 3 deadline dots.

BEGIN;

-- ---------------------------------------------------------------------------
-- Guard: warn (do not fail) if the fixture auth user has not been created.
-- Using RAISE NOTICE keeps the migration green even when applied in an order
-- where the Dashboard user-creation step has not happened yet. The Playwright
-- suite's beforeEach login will surface the missing user concretely.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'perf-test@uniboard.uk'
  ) THEN
    RAISE NOTICE
      'perf-test@uniboard.uk not found in auth.users. '
      'Create the user via Supabase Dashboard → Authentication → Users '
      'first, then re-run this migration.';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Profile row — the handle_new_user() trigger SHOULD have fired on user
-- creation, but we UPSERT defensively in case the user was created via an
-- API path that bypassed the trigger, or the display_name needs normalising
-- for the screenshot baseline.
-- ---------------------------------------------------------------------------
INSERT INTO public.profiles (id, display_name, language_preference, gpa_scale)
SELECT
  id,
  'Phase 38 Perf Test',
  'zh',
  'wam'
FROM auth.users
WHERE email = 'perf-test@uniboard.uk'
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  language_preference = EXCLUDED.language_preference,
  gpa_scale = EXCLUDED.gpa_scale;

-- ---------------------------------------------------------------------------
-- Courses — 3 fixed rows with hard-coded UUIDs so the screenshots are
-- reproducible across re-seeds. Codes/names are USYD-plausible COMP units
-- (informational only — no external lookup is performed).
-- ---------------------------------------------------------------------------
INSERT INTO public.courses (
  id,
  user_id,
  canvas_course_id,
  code,
  name,
  semester,
  credit_points
)
SELECT * FROM (VALUES
  (
    '38c00001-0000-4000-8000-000000000001'::uuid,
    (SELECT id FROM auth.users WHERE email = 'perf-test@uniboard.uk'),
    'canvas-perf-001',
    'COMP5338',
    'Advanced Data Models',
    '2026S1',
    6
  ),
  (
    '38c00002-0000-4000-8000-000000000002'::uuid,
    (SELECT id FROM auth.users WHERE email = 'perf-test@uniboard.uk'),
    'canvas-perf-002',
    'COMP5347',
    'Web Application Development',
    '2026S1',
    6
  ),
  (
    '38c00003-0000-4000-8000-000000000003'::uuid,
    (SELECT id FROM auth.users WHERE email = 'perf-test@uniboard.uk'),
    'canvas-perf-003',
    'COMP5318',
    'Machine Learning and Data Mining',
    '2026S1',
    6
  )
) AS v(id, user_id, canvas_course_id, code, name, semester, credit_points)
WHERE v.user_id IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  semester = EXCLUDED.semester,
  credit_points = EXCLUDED.credit_points;

-- ---------------------------------------------------------------------------
-- Unified deadlines — 3 fixed rows anchored to the frozen clock so
-- days_remaining renders 7 / 14 / 21 deterministically. Uses the real
-- `unified_deadlines` table (NOT a legacy `deadlines` name). Column set
-- matches initial_schema: title / due_date / source / source_id / weight
-- / description / dedup_key / is_confirmed.
--
-- source = 'canvas' so UI treats them like Canvas assignments (real
-- category enum accepted by the schema). dedup_key uses a phase-38-scoped
-- prefix so it cannot collide with a real sync-generated key.
-- ---------------------------------------------------------------------------
INSERT INTO public.unified_deadlines (
  id,
  course_id,
  title,
  due_date,
  source,
  source_id,
  weight,
  description,
  dedup_key,
  is_confirmed
)
VALUES
  (
    '38d00001-0000-4000-8000-000000000001'::uuid,
    '38c00001-0000-4000-8000-000000000001'::uuid,
    'Assignment 1',
    '2026-04-08T10:00:00+10:00'::timestamptz,
    'canvas',
    'perf-canvas-a1',
    0.20,
    'Phase 38 fixture assignment (7d from frozen clock).',
    'phase38-fixture-a1',
    true
  ),
  (
    '38d00002-0000-4000-8000-000000000002'::uuid,
    '38c00002-0000-4000-8000-000000000002'::uuid,
    'Mid-term Exam',
    '2026-04-15T14:00:00+10:00'::timestamptz,
    'canvas',
    'perf-canvas-mt',
    0.30,
    'Phase 38 fixture exam (14d from frozen clock).',
    'phase38-fixture-mt',
    true
  ),
  (
    '38d00003-0000-4000-8000-000000000003'::uuid,
    '38c00003-0000-4000-8000-000000000003'::uuid,
    'Lab Report 2',
    '2026-04-22T23:59:00+10:00'::timestamptz,
    'canvas',
    'perf-canvas-lab2',
    0.15,
    'Phase 38 fixture lab (21d from frozen clock).',
    'phase38-fixture-lab2',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  due_date = EXCLUDED.due_date,
  weight = EXCLUDED.weight,
  description = EXCLUDED.description;

COMMIT;

-- End Phase 38 P04 fixture seed. Next migration number: 20260420000002.
