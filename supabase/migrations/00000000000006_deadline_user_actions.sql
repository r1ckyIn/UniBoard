-- Deadline user actions (pin/delete) persisted separately from sync-managed unified_deadlines
-- =============================================================================
--
-- User-initiated actions stored in a separate table so the sync engine never
-- overwrites user decisions (design decision D-07).
--
-- =============================================================================

CREATE TABLE deadline_user_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deadline_id UUID NOT NULL REFERENCES unified_deadlines(id) ON DELETE CASCADE,
  action_type VARCHAR(10) NOT NULL CHECK (action_type IN ('pinned', 'deleted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, deadline_id, action_type)
);

CREATE INDEX ix_deadline_user_actions_user ON deadline_user_actions (user_id);
CREATE INDEX ix_deadline_user_actions_user_deadline ON deadline_user_actions (user_id, deadline_id);

-- RLS policies (direct user_id pattern, matching digests/notifications)
ALTER TABLE deadline_user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own deadline actions"
  ON deadline_user_actions FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own deadline actions"
  ON deadline_user_actions FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own deadline actions"
  ON deadline_user_actions FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);
