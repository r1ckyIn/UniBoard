-- Initial schema migration for UniBoard
-- Creates all application tables derived from SQLAlchemy models
-- Uses auth.users(id) as the user identity source (Supabase Auth)

-- =============================================================================
-- Extensions
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================================================
-- Helper functions
-- =============================================================================

-- Auto-update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create profiles row when a new user registers via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', ''),
    now(),
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- profiles (maps to User model, linked to auth.users)
-- =============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100) NOT NULL DEFAULT '',
  university_id VARCHAR(50),
  gpa_target FLOAT,
  gpa_scale VARCHAR(10) NOT NULL DEFAULT 'wam',
  canvas_api_token_encrypted TEXT,
  ed_api_token_encrypted TEXT,
  canvas_token_status VARCHAR(20) NOT NULL DEFAULT 'not_configured',
  ed_token_status VARCHAR(20) NOT NULL DEFAULT 'not_configured',
  canvas_sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ed_sync_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  canvas_last_synced_at TIMESTAMPTZ,
  ed_last_synced_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_manual_sync_at TIMESTAMPTZ,
  ai_calls_today INTEGER NOT NULL DEFAULT 0,
  ai_calls_reset_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Trigger: auto-create profile on new auth.users registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- courses
-- =============================================================================

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_course_id VARCHAR(50),
  ed_course_id VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) NOT NULL,
  semester VARCHAR(20) NOT NULL,
  credit_points INTEGER NOT NULL DEFAULT 6,
  grading_weights JSONB,
  unit_outline_url VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_courses_user_semester ON courses (user_id, semester);
CREATE INDEX ix_courses_canvas_id ON courses (user_id, canvas_course_id);

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- grades
-- =============================================================================

CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  assessment_name VARCHAR(255) NOT NULL,
  score FLOAT,
  max_score FLOAT NOT NULL,
  weight FLOAT NOT NULL,
  group_name VARCHAR(255) NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ,
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_grades_course ON grades (course_id, graded_at);
CREATE UNIQUE INDEX uq_grades_course_assessment ON grades (course_id, assessment_name);

CREATE TRIGGER grades_updated_at
  BEFORE UPDATE ON grades
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- unified_deadlines
-- =============================================================================

CREATE TABLE unified_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  source VARCHAR(30) NOT NULL,
  source_id VARCHAR(100) NOT NULL,
  weight FLOAT,
  description TEXT,
  dedup_key VARCHAR(64) NOT NULL,
  is_confirmed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_deadlines_course_due ON unified_deadlines (course_id, due_date);
CREATE UNIQUE INDEX ix_deadlines_dedup ON unified_deadlines (dedup_key);

CREATE TRIGGER unified_deadlines_updated_at
  BEFORE UPDATE ON unified_deadlines
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- discussion_threads (with tsvector full-text search)
-- =============================================================================

CREATE TABLE discussion_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  ed_thread_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  content TEXT,
  is_endorsed BOOLEAN NOT NULL DEFAULT false,
  is_staff_post BOOLEAN NOT NULL DEFAULT false,
  gpa_relevance_score FLOAT NOT NULL DEFAULT 0.0,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_threads_course_created ON discussion_threads (course_id, created_at);
CREATE UNIQUE INDEX ix_threads_ed_id ON discussion_threads (course_id, ed_thread_id);
CREATE INDEX ix_threads_gpa_score ON discussion_threads (course_id, gpa_relevance_score);
CREATE INDEX ix_threads_search ON discussion_threads USING GIN (search_vector);

CREATE TRIGGER discussion_threads_updated_at
  BEFORE UPDATE ON discussion_threads
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- modules
-- =============================================================================

CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  canvas_module_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  position INTEGER NOT NULL,
  ai_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_modules_course_canvas UNIQUE (course_id, canvas_module_id)
);

CREATE TRIGGER modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- module_items (with tsvector full-text search)
-- =============================================================================

CREATE TABLE module_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  content_id VARCHAR(50),
  url VARCHAR(500),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, ''))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_module_items_search ON module_items USING GIN (search_vector);

CREATE TRIGGER module_items_updated_at
  BEFORE UPDATE ON module_items
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- lessons (with tsvector full-text search)
-- =============================================================================

CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  ed_lesson_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  number INTEGER,
  kind VARCHAR(50) NOT NULL DEFAULT '',
  state VARCHAR(50) NOT NULL DEFAULT '',
  slide_count INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ,
  text_content TEXT,
  search_vector TSVECTOR GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(text_content, '')), 'B')
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_lessons_course_ed UNIQUE (course_id, ed_lesson_id)
);

CREATE INDEX ix_lessons_search ON lessons USING GIN (search_vector);

CREATE TRIGGER lessons_updated_at
  BEFORE UPDATE ON lessons
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- slides
-- =============================================================================

CREATE TABLE slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content TEXT,
  type VARCHAR(50) NOT NULL DEFAULT '',
  index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER slides_updated_at
  BEFORE UPDATE ON slides
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- unit_outlines
-- =============================================================================

CREATE TABLE unit_outlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  outline_url VARCHAR(500) NOT NULL,
  assessments JSONB,
  learning_outcomes JSONB,
  raw_html TEXT,
  fetched_at TIMESTAMPTZ,
  semester VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER unit_outlines_updated_at
  BEFORE UPDATE ON unit_outlines
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- digests (direct user_id)
-- =============================================================================

CREATE TABLE digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_date TIMESTAMPTZ NOT NULL,
  content_json JSONB NOT NULL,
  ai_summary TEXT,
  is_sent_email BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_digests_user_date UNIQUE (user_id, digest_date)
);

CREATE TRIGGER digests_updated_at
  BEFORE UPDATE ON digests
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- notifications (direct user_id)
-- =============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_url VARCHAR(500),
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_notifications_user_unread ON notifications (user_id, is_read);

CREATE TRIGGER notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- push_records (direct user_id)
-- =============================================================================

CREATE TABLE push_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_hash VARCHAR(64) NOT NULL,
  source_type VARCHAR(30) NOT NULL,
  source_id VARCHAR(100) NOT NULL,
  pushed_at TIMESTAMPTZ NOT NULL,
  channel VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ix_push_records_user_hash ON push_records (user_id, content_hash);

CREATE TRIGGER push_records_updated_at
  BEFORE UPDATE ON push_records
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- whatif_scenarios (direct user_id)
-- =============================================================================

CREATE TABLE whatif_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  scores_json JSONB NOT NULL,
  result_wam FLOAT NOT NULL,
  result_gpa FLOAT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER whatif_scenarios_updated_at
  BEFORE UPDATE ON whatif_scenarios
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- =============================================================================
-- content_embeddings (direct course_id FK, uses pgvector)
-- =============================================================================

CREATE TABLE content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(30) NOT NULL,
  source_id VARCHAR(50) NOT NULL,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  embedding vector(1024) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_embeddings_course ON content_embeddings (course_id);

CREATE TRIGGER content_embeddings_updated_at
  BEFORE UPDATE ON content_embeddings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
