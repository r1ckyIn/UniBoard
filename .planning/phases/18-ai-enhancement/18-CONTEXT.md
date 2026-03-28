# Phase 18: AI Enhancement - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire up Claude API for AI-powered thread evaluation and digest scoring. Implement quality gate with F1 monitoring and auto-fallback. Add post-sync batch evaluation trigger. Enhance digest with i18n AI summaries and urgency scoring UI.

**Out of scope:** AI Q&A (Phase 19), MCP Agent tools, new AI capabilities beyond thread eval + digest scoring.

</domain>

<decisions>
## Implementation Decisions

### Quality Gate Design
- **D-01:** Ground truth source = user feedback (👍/👎 buttons on AI-scored items)
- **D-02:** Minimum 50 feedback entries before F1 calculation starts. Before 50 entries, AI runs but no gate judgment.
- **D-03:** F1 < 75% triggers global fallback to rule engine (endorsed + staff_answered). Stays in fallback until next prompt optimization + manual re-evaluation.
- **D-04:** Feedback buttons appear in BOTH Course Detail (Ed Posts list) AND Digest page — maximize collection rate.
- **D-05:** Need DB table for feedback: `ai_feedback(id, user_id, thread_id, feedback_type[thumbs_up|thumbs_down], created_at)` and `ai_quality_metrics(id, total_feedback, f1_score, precision, recall, calculated_at, is_fallback_active)`.

### AI Evaluation Pipeline
- **D-06:** Trigger = post-sync automatic batch evaluation. After Ed Discussion sync completes, queue background task to evaluate new unscored threads.
- **D-07:** Batch limit = 20 threads per sync cycle. Remaining unscored threads wait for next sync cycle.
- **D-08:** Integration point: SyncEngine's Ed Discussion sync completion hook triggers `evaluate_new_threads_ai()` for all synced courses.
- **D-09:** Daily AI call counter (`ai_calls_today`) already exists on Profile model. Add daily reset logic (check `ai_calls_reset_date`, reset if stale).

### Digest AI Tuning
- **D-10:** Summary language = i18n bilingual (Chinese/English). Generate based on user's language preference setting. Requires two prompt templates.
- **D-11:** Summary style = precise 20-30 word action-oriented study guidance. No generic encouragement. Example: "Focus on COMP3221 Quiz 3 (due 18h) — review lecture 8 sliding window."
- **D-12:** Urgency display = BOTH color labels AND sort-by-score. Red (5-critical) / Orange (4-urgent) / Blue (3-normal) / Gray (1-2-low). Highest urgency items sorted first.

### Claude's Discretion
- Testing strategy: Claude chooses best approach based on existing pytest mock patterns (likely patch AsyncAnthropic.messages.create with fixture JSON responses)
- Exact F1 calculation formula (standard binary classification F1)
- AI call counter daily reset implementation details
- Prompt template wording and optimization
- Error handling for API failures (retry policy, graceful degradation)

</decisions>

<specifics>
## Specific Ideas

- User previously established: "Deadline AI summary should be precise 20-30 word study guidance, not generic encouragement" — this applies to all AI-generated text
- Digest urgency colors should use existing design system tokens (Tailwind classes already in use)
- Quality gate fallback should be transparent to user — no error message, just seamlessly switches to rule-based results

</specifics>

<canonical_refs>
## Canonical References

### AI Architecture & Prompts
- `docs/UniBoard_TRD_v2.md` §6 — AI / prompt engineering specifications, quality gate F1 threshold
- `docs/UniBoard_TRD_v2.md` §12 — REST API specifications (intelligence endpoints)
- `docs/UniBoard_BRD_v2.md` — INTEL-02 (AI high-value info), INTEL-04 (AI digest scoring)

### Existing AI Code (80% implemented)
- `src/services/ai_engine.py` — AIEngine class: evaluate_thread(), score_urgency(), Claude API integration
- `src/services/intelligence.py` — EdIntelligenceService: evaluate_new_threads_ai(), get_ai_high_value_posts()
- `src/services/digest.py` — DigestService: _enhance_with_ai(), generate_digest()
- `src/prompts/thread_eval.py` — Thread evaluation system prompt
- `src/prompts/digest.py` — Urgency scoring + summary system prompts
- `src/schemas/intelligence.py` — ThreadEvaluation, AIHighValuePostResponse schemas
- `src/web/routes/intelligence.py` — GET /intelligence/ai endpoint with fallback logic

### Sync Integration
- `src/services/sync_engine.py` — SyncEngine with APScheduler, Ed Discussion sync job (hook point for D-06)

### Frontend Design
- `docs/frontend_brief.md` — Design system tokens, component patterns
- `frontend/src/features/courses/` — Course detail components (feedback button location)
- `frontend/src/features/digest/` — Digest page components (urgency display location)

### Data Model
- `src/models/discussion.py` — DiscussionThread with gpa_relevance_score column
- `src/models/user.py` — Profile with ai_calls_today, ai_calls_reset_date

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AIEngine** (`src/services/ai_engine.py`): Full Claude API wrapper with evaluate_thread() and score_urgency() — ready to use
- **EdIntelligenceService** (`src/services/intelligence.py`): evaluate_new_threads_ai() with daily limit enforcement — needs sync hook, not rewrite
- **DigestService** (`src/services/digest.py`): _enhance_with_ai() with parallel execution — needs i18n prompt swap
- **Existing prompts** (`src/prompts/`): thread_eval.py and digest.py — need i18n variants and style tuning

### Established Patterns
- **Service injection**: FastAPI Depends() → service constructor with session + config
- **AI fallback**: Routes already implement `if ai_engine is None: fallback_to_rule_based()` pattern
- **Daily limit**: Profile.ai_calls_today with increment/check pattern in intelligence service
- **Cursor pagination**: Base64-encoded cursor pattern in intelligence routes

### Integration Points
- **SyncEngine → AIEngine**: After Ed Discussion sync, trigger batch evaluate_new_threads_ai()
- **Frontend feedback → Backend**: New POST endpoint for 👍/👎 feedback
- **F1 calculator → Quality gate**: Periodic F1 calculation triggers fallback flag
- **Digest route → i18n prompts**: Language preference from user settings drives prompt selection

</code_context>

<deferred>
## Deferred Ideas

- AI Q&A (ask questions about course content) — Phase 19
- MCP Agent tools — Phase 19
- Per-course F1 gate (instead of global) — future optimization when feedback volume is sufficient
- AI prompt A/B testing framework — M4 backlog
- Embedding-based semantic search for threads — M4 backlog

</deferred>

---

*Phase: 18-ai-enhancement*
*Context gathered: 2026-03-28*
