-- Sync history audit table for tracking all sync operations
-- Records domain, status, records_updated, and timestamps per user per sync run

CREATE TABLE sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  domain VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  records_updated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_sync_history_user_domain ON sync_history (user_id, domain);
CREATE INDEX ix_sync_history_started_at ON sync_history (started_at);

ALTER TABLE sync_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync history"
  ON sync_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE TRIGGER sync_history_updated_at
  BEFORE UPDATE ON sync_history
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
