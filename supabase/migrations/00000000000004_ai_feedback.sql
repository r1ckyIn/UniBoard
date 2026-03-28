-- AI feedback collection and quality metrics for quality gate monitoring
-- Supports F1 calculation from user thumbs_up/thumbs_down feedback on AI-scored threads

CREATE TABLE ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES discussion_threads(id) ON DELETE CASCADE,
    feedback_type VARCHAR(20) NOT NULL CHECK (feedback_type IN ('thumbs_up', 'thumbs_down')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_feedback_user_thread UNIQUE (user_id, thread_id)
);

CREATE TABLE ai_quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_feedback INTEGER NOT NULL DEFAULT 0,
    f1_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    precision DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    recall DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    calculated_at TIMESTAMP NOT NULL,
    is_fallback_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_feedback_thread ON ai_feedback(thread_id);
CREATE INDEX ix_feedback_user ON ai_feedback(user_id);
CREATE INDEX ix_metrics_calculated ON ai_quality_metrics(calculated_at DESC);

ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY feedback_user_own ON ai_feedback FOR ALL USING (user_id = auth.uid());

-- Updated_at trigger for ai_feedback
CREATE TRIGGER ai_feedback_updated_at
    BEFORE UPDATE ON ai_feedback
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Updated_at trigger for ai_quality_metrics
CREATE TRIGGER ai_quality_metrics_updated_at
    BEFORE UPDATE ON ai_quality_metrics
    FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
