---
phase: 18-ai-enhancement
plan: 02
subsystem: ai, api
tags: [quality-gate, f1-score, feedback, i18n, digest, urgency-scoring]

# Dependency graph
requires:
  - phase: 18-ai-enhancement-01
    provides: "Ed Discussion sync + AI evaluation pipeline with pre-computed scores"
  - phase: 17-notifications-digest
    provides: "DigestService with rule-based aggregation and AI enhancement"
provides:
  - "AIFeedback + AIQualityMetrics ORM models and migration"
  - "POST /threads/{thread_id}/feedback endpoint with UPSERT"
  - "QualityGateService: F1 calculation from 50+ entries, auto-fallback at F1 < 0.75"
  - "i18n digest prompts (EN + ZH) with action-oriented 20-30 word guidance"
  - "Digest items sorted by urgency_score descending (D-12)"
affects: [18-03-PLAN, 19-mcp-agent]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "UPSERT with on_conflict_do_update for idempotent feedback submission"
    - "F1 classification: TP/FP/FN/TN from feedback_type + gpa_relevance_score threshold"
    - "Quality gate snapshot pattern: insert new AIQualityMetrics row per evaluation"
    - "Language-conditional prompt selection via self._language parameter"

key-files:
  created:
    - src/models/ai_feedback.py
    - src/schemas/feedback.py
    - src/services/quality_gate.py
    - src/web/routes/feedback.py
    - supabase/migrations/00000000000004_ai_feedback.sql
    - tests/unit/test_quality_gate.py
  modified:
    - src/web/routes/__init__.py
    - src/prompts/digest.py
    - src/services/digest.py
    - src/web/routes/digest.py
    - src/sync/tasks.py
    - tests/unit/test_digest_service.py

key-decisions:
  - "check_and_update_fallback queries count before calling calculate_f1 to avoid redundant DB queries"
  - "Quality gate uses snapshot pattern (insert new row per evaluation) for audit trail"
  - "Digest route uses Query param 'lang' with regex validation rather than Accept-Language header"

patterns-established:
  - "Feedback UPSERT: pg_insert with on_conflict_do_update on unique constraint"
  - "Quality gate F1 threshold: FEEDBACK_THRESHOLD=50, F1_THRESHOLD=0.75, HIGH_VALUE_SCORE_THRESHOLD=0.4"
  - "i18n prompt selection: PROMPT_ZH if language=='zh' else PROMPT (English default)"

requirements-completed: [INTEL-02, INTEL-04]

# Metrics
duration: 6min
completed: 2026-03-28
---

# Phase 18 Plan 02: Feedback Collection, Quality Gate F1 Monitoring, and i18n Digest Tuning Summary

**Feedback endpoint with UPSERT, quality gate F1 auto-fallback at 75%, and bilingual action-oriented digest prompts with urgency sorting**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-28T02:44:27Z
- **Completed:** 2026-03-28T02:51:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Feedback endpoint accepts thumbs_up/down with UPSERT (users can change votes), triggers quality gate when 50+ entries
- Quality gate service calculates F1 from TP/FP/FN classification, auto-activates fallback to rule engine when F1 < 75%
- Digest prompts replaced with action-oriented 20-30 word guidance in both English and Chinese
- Digest items sorted by urgency_score descending (highest urgency first, D-12)

## Task Commits

Each task was committed atomically:

1. **Task 1: Feedback models + migration + endpoint + quality gate service** - `7155c21` (feat)
2. **Task 2: Digest i18n prompts + action-oriented style tuning** - `408df67` (feat)

_Note: TDD tasks had RED (failing tests) -> GREEN (implementation) -> verification cycle_

## Files Created/Modified
- `src/models/ai_feedback.py` - AIFeedback and AIQualityMetrics ORM models
- `src/schemas/feedback.py` - FeedbackRequest/Response Pydantic schemas
- `src/services/quality_gate.py` - QualityGateService with F1 calculation and fallback logic
- `src/web/routes/feedback.py` - POST /threads/{thread_id}/feedback with UPSERT
- `src/web/routes/__init__.py` - Registered feedback_router
- `supabase/migrations/00000000000004_ai_feedback.sql` - ai_feedback + ai_quality_metrics tables with RLS
- `tests/unit/test_quality_gate.py` - 7 tests for F1 calculation, threshold, fallback, zero-denominator
- `src/prompts/digest.py` - Replaced English prompt, added Chinese DIGEST_SUMMARY_SYSTEM_PROMPT_ZH
- `src/services/digest.py` - Added language param, i18n prompt selection, urgency sorting
- `src/web/routes/digest.py` - Added lang query parameter (en|zh)
- `src/sync/tasks.py` - Pass language="en" default to DigestService
- `tests/unit/test_digest_service.py` - 3 new tests for zh prompt, en prompt, urgency sorting

## Decisions Made
- Quality gate uses count-first approach: check_and_update_fallback queries total count before calling calculate_f1, avoiding redundant DB queries when data is insufficient
- Quality gate snapshot pattern: each evaluation inserts a new AIQualityMetrics row rather than updating a single row, providing audit trail
- Digest route uses `lang` query parameter with regex validation `^(en|zh)$` rather than Accept-Language header for simplicity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Quality gate F1 monitoring ready for production; will automatically fall back to rule engine when AI accuracy drops
- i18n digest prompts ready for frontend language switching
- Feedback data will accumulate as users interact with AI-scored threads
- Ready for 18-03 (MCP Agent integration)

---
*Phase: 18-ai-enhancement*
*Completed: 2026-03-28*
