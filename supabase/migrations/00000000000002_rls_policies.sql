-- RLS (Row Level Security) policies for per-user data isolation
-- =============================================================================
--
-- Every table gets RLS enabled with SELECT/INSERT/UPDATE/DELETE policies.
-- All policies use `TO authenticated` to restrict access to logged-in users.
--
-- The `(select auth.uid())` subquery pattern is used instead of bare `auth.uid()`
-- for query planner optimization (evaluated once per statement, not per row).
--
-- NOTE: The Python backend connects via the postgres/service_role connection
-- which bypasses RLS entirely. These policies primarily protect against:
--   1. Direct Supabase client access from the frontend (auth operations)
--   2. Defense-in-depth for any future direct DB access patterns
--   3. Supabase Studio data browsing respects RLS for non-service-role users
--
-- =============================================================================

-- =============================================================================
-- profiles (PK = auth.users id, so policy uses `id` not `user_id`)
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE TO authenticated
  USING ((select auth.uid()) = id);

-- =============================================================================
-- courses (direct user_id)
-- =============================================================================

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own courses"
  ON courses FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own courses"
  ON courses FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own courses"
  ON courses FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own courses"
  ON courses FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- =============================================================================
-- grades (via course_id -> courses.user_id)
-- =============================================================================

ALTER TABLE grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own grades"
  ON grades FOR SELECT TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert own grades"
  ON grades FOR INSERT TO authenticated
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update own grades"
  ON grades FOR UPDATE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete own grades"
  ON grades FOR DELETE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

-- =============================================================================
-- unified_deadlines (via course_id -> courses.user_id)
-- =============================================================================

ALTER TABLE unified_deadlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deadlines"
  ON unified_deadlines FOR SELECT TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert own deadlines"
  ON unified_deadlines FOR INSERT TO authenticated
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update own deadlines"
  ON unified_deadlines FOR UPDATE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete own deadlines"
  ON unified_deadlines FOR DELETE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

-- =============================================================================
-- discussion_threads (via course_id -> courses.user_id)
-- =============================================================================

ALTER TABLE discussion_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own discussion threads"
  ON discussion_threads FOR SELECT TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert own discussion threads"
  ON discussion_threads FOR INSERT TO authenticated
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update own discussion threads"
  ON discussion_threads FOR UPDATE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete own discussion threads"
  ON discussion_threads FOR DELETE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

-- =============================================================================
-- modules (via course_id -> courses.user_id)
-- =============================================================================

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own modules"
  ON modules FOR SELECT TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert own modules"
  ON modules FOR INSERT TO authenticated
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update own modules"
  ON modules FOR UPDATE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete own modules"
  ON modules FOR DELETE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

-- =============================================================================
-- module_items (via module_id -> modules -> courses.user_id)
-- =============================================================================

ALTER TABLE module_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own module items"
  ON module_items FOR SELECT TO authenticated
  USING (module_id IN (
    SELECT m.id FROM modules m
    JOIN courses c ON m.course_id = c.id
    WHERE c.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can insert own module items"
  ON module_items FOR INSERT TO authenticated
  WITH CHECK (module_id IN (
    SELECT m.id FROM modules m
    JOIN courses c ON m.course_id = c.id
    WHERE c.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can update own module items"
  ON module_items FOR UPDATE TO authenticated
  USING (module_id IN (
    SELECT m.id FROM modules m
    JOIN courses c ON m.course_id = c.id
    WHERE c.user_id = (select auth.uid())
  ))
  WITH CHECK (module_id IN (
    SELECT m.id FROM modules m
    JOIN courses c ON m.course_id = c.id
    WHERE c.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can delete own module items"
  ON module_items FOR DELETE TO authenticated
  USING (module_id IN (
    SELECT m.id FROM modules m
    JOIN courses c ON m.course_id = c.id
    WHERE c.user_id = (select auth.uid())
  ));

-- =============================================================================
-- lessons (via course_id -> courses.user_id)
-- =============================================================================

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lessons"
  ON lessons FOR SELECT TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert own lessons"
  ON lessons FOR INSERT TO authenticated
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update own lessons"
  ON lessons FOR UPDATE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete own lessons"
  ON lessons FOR DELETE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

-- =============================================================================
-- slides (via lesson_id -> lessons -> courses.user_id)
-- =============================================================================

ALTER TABLE slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own slides"
  ON slides FOR SELECT TO authenticated
  USING (lesson_id IN (
    SELECT l.id FROM lessons l
    JOIN courses c ON l.course_id = c.id
    WHERE c.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can insert own slides"
  ON slides FOR INSERT TO authenticated
  WITH CHECK (lesson_id IN (
    SELECT l.id FROM lessons l
    JOIN courses c ON l.course_id = c.id
    WHERE c.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can update own slides"
  ON slides FOR UPDATE TO authenticated
  USING (lesson_id IN (
    SELECT l.id FROM lessons l
    JOIN courses c ON l.course_id = c.id
    WHERE c.user_id = (select auth.uid())
  ))
  WITH CHECK (lesson_id IN (
    SELECT l.id FROM lessons l
    JOIN courses c ON l.course_id = c.id
    WHERE c.user_id = (select auth.uid())
  ));

CREATE POLICY "Users can delete own slides"
  ON slides FOR DELETE TO authenticated
  USING (lesson_id IN (
    SELECT l.id FROM lessons l
    JOIN courses c ON l.course_id = c.id
    WHERE c.user_id = (select auth.uid())
  ));

-- =============================================================================
-- unit_outlines (via course_id -> courses.user_id)
-- =============================================================================

ALTER TABLE unit_outlines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unit outlines"
  ON unit_outlines FOR SELECT TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert own unit outlines"
  ON unit_outlines FOR INSERT TO authenticated
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update own unit outlines"
  ON unit_outlines FOR UPDATE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete own unit outlines"
  ON unit_outlines FOR DELETE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

-- =============================================================================
-- digests (direct user_id)
-- =============================================================================

ALTER TABLE digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digests"
  ON digests FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own digests"
  ON digests FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own digests"
  ON digests FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own digests"
  ON digests FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- =============================================================================
-- notifications (direct user_id)
-- =============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- =============================================================================
-- push_records (direct user_id)
-- =============================================================================

ALTER TABLE push_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own push records"
  ON push_records FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own push records"
  ON push_records FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own push records"
  ON push_records FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own push records"
  ON push_records FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- =============================================================================
-- whatif_scenarios (direct user_id)
-- =============================================================================

ALTER TABLE whatif_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own whatif scenarios"
  ON whatif_scenarios FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own whatif scenarios"
  ON whatif_scenarios FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own whatif scenarios"
  ON whatif_scenarios FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own whatif scenarios"
  ON whatif_scenarios FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

-- =============================================================================
-- content_embeddings (via course_id -> courses.user_id)
-- =============================================================================

ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own embeddings"
  ON content_embeddings FOR SELECT TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert own embeddings"
  ON content_embeddings FOR INSERT TO authenticated
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can update own embeddings"
  ON content_embeddings FOR UPDATE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())))
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can delete own embeddings"
  ON content_embeddings FOR DELETE TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));
