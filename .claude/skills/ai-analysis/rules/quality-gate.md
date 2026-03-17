# Quality Gate Rules

Rules for AI quality monitoring, F1 threshold enforcement, and rule-engine fallback.

## Rule 1: F1 Monitoring
Track Precision, Recall, and F1 for thread evaluation against ground truth (endorsed + staff-answered posts). Log via structlog. This is a monitoring concern, not enforced in real-time — evaluated periodically.

## Rule 2: Auto-Fallback Threshold
If F1 < 75%, disable AI thread evaluation and fall back to rule engine (`is_endorsed + is_staff_answered`). The fallback is the Phase 2 `EdIntelligenceService.get_high_value_posts()` — always available, no AI dependency.

## Rule 3: Silent AI Failure
All AI service calls wrapped in try/except. On failure: log error with structlog, return rule-based result. User never sees an error from AI failure — the experience degrades gracefully to rule-based filtering.

## Rule 4: Quality Logging
Use structlog for all quality metrics. Log: `ai_quality_check`, `f1_score`, `precision`, `recall`, `sample_size`. This enables monitoring dashboards without runtime overhead.
Source: `src/services/intelligence.py`
