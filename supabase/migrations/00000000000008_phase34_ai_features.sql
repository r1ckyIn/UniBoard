-- Phase 34: AI Features Live -- schema additions
--
-- Adds:
--   1. profiles.remaining_credit_points (D-C1) -- INTEGER NULL
--   2. courses.last_qa_access_at (D-B1 hot-set tracker) -- TIMESTAMPTZ NULL
--   3. courses.embedded_at (D-B1 freshness) -- TIMESTAMPTZ NULL
--   4. courses.content_hash (D-B2, deviation-with-rationale per Course not Module) -- VARCHAR(64) NULL
--   5. study_recommendation_cache table (D-A2) + RLS policies
--
-- DEVIATION FROM CONTEXT.md D-B2:
-- D-B2 specifies Module.content_hash, but the embedding pipeline operates
-- per-course (QAService.embed_course_materials(course_id)), so the hash
-- granularity must match. Course.content_hash chosen -- confirmed with user.

-- =============================================================================
-- Section 1 -- profiles.remaining_credit_points (D-C1)
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN remaining_credit_points INTEGER;

COMMENT ON COLUMN public.profiles.remaining_credit_points IS
  'User remaining credit points to graduation. Canonical user input (USYD typical Bachelor=144cp; planner does NOT auto-infer). Used by GPAService.calculate_multi_course_path. NULL = user has not configured yet; UI prompts on first Path Planner visit. Per phase 34 D-C1.';

-- No index: this column is read in single-row Profile lookups only, never filtered on.

-- =============================================================================
-- Section 2 -- courses hot-set + content-hash columns (D-B1, D-B2)
-- =============================================================================

ALTER TABLE public.courses
  ADD COLUMN last_qa_access_at TIMESTAMPTZ;

COMMENT ON COLUMN public.courses.last_qa_access_at IS
  'Timestamp of most recent QA query for this course. Bumped by /courses/{id}/qa and /qa/stream routes BEFORE invoking the LLM. Embedding worker uses WHERE last_qa_access_at >= now() - 7 days predicate to scope hot-set. NULL = course never queried. Per phase 34 D-B1.';

ALTER TABLE public.courses
  ADD COLUMN embedded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.courses.embedded_at IS
  'Timestamp of most recent successful embedding pass for this course. Set by embedding worker after QAService.embed_course_materials completes. NULL = never embedded. Per phase 34 D-B1.';

ALTER TABLE public.courses
  ADD COLUMN content_hash VARCHAR(64);

COMMENT ON COLUMN public.courses.content_hash IS
  'sha256 hex of concatenated module_items.text_content + lessons.text_content for this course. Worker re-embeds when computed hash differs from this column. NULL = never hashed. Per phase 34 D-B2 (deviation: stored on Course not Module -- embedding granularity is per-course).';

-- Partial index for the embedding worker hot-set predicate.
-- WHERE clause matches the worker scan: last_qa_access_at >= now() - 7d.
CREATE INDEX ix_courses_last_qa_access
  ON public.courses (last_qa_access_at)
  WHERE last_qa_access_at IS NOT NULL;

-- =============================================================================
-- Section 3 -- study_recommendation_cache table (D-A2)
-- =============================================================================

CREATE TABLE public.study_recommendation_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generated_for_date DATE NOT NULL,
  main_suggestion TEXT NOT NULL DEFAULT '',
  top_3 JSONB NOT NULL DEFAULT '[]'::jsonb,
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_study_rec_user_date UNIQUE (user_id, generated_for_date)
);

COMMENT ON TABLE public.study_recommendation_cache IS
  'Daily-cached AI study recommendations per user. Daily APScheduler job (7am Australia/Sydney) UPSERTs one row per user per day. Frontend reads cached row -- no realtime LLM call. Per phase 34 D-A2.';

CREATE INDEX ix_study_rec_user_date
  ON public.study_recommendation_cache (user_id, generated_for_date DESC);

-- updated_at auto-bump trigger (existing helper from initial schema)
CREATE TRIGGER study_recommendation_cache_updated_at
  BEFORE UPDATE ON public.study_recommendation_cache
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- Section 4 -- RLS policies (mirror whatif_scenarios direct user_id ownership)
-- =============================================================================

ALTER TABLE public.study_recommendation_cache ENABLE ROW LEVEL SECURITY;

-- Users read their own recommendations
CREATE POLICY "Users can view own study recommendations"
  ON public.study_recommendation_cache FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- Service role (APScheduler daily job) writes
CREATE POLICY "Service role can insert study recommendations"
  ON public.study_recommendation_cache FOR INSERT TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update study recommendations"
  ON public.study_recommendation_cache FOR UPDATE TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Service role can delete study recommendations"
  ON public.study_recommendation_cache FOR DELETE TO service_role
  USING (true);

-- =============================================================================
-- Section 5 -- closing marker
-- =============================================================================

-- End Phase 34 schema additions. Next migration number: 00000000000009.
