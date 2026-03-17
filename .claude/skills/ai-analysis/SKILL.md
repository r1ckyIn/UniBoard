# AI Analysis Skills

Skills for LLM integration, thread evaluation, Q&A pipeline, digest scoring, and quality gates.

## Quick Reference

| Skill | File | When to Use |
|-------|------|-------------|
| Thread Evaluation | rules/thread-eval.md | Scoring Ed Discussion posts for GPA relevance |
| Q&A Pipeline | rules/qa-pipeline.md | Course material Q&A with citations |
| Digest Scoring | rules/digest-scoring.md | AI urgency scoring for daily digests |
| Quality Gate | rules/quality-gate.md | F1 monitoring and rule-engine fallback |

## Meta-Rules

### Rule 1: Model Selection Strategy
Sonnet for routine tasks (thread scoring, urgency scoring) — fast and cheap.
Opus for deep tasks (Q&A, unit review, GPA risk analysis) — high quality, citation accuracy.

### Rule 2: Prompt Storage
All prompts in `src/prompts/` module, never hardcoded in services. Each prompt file exports a `*_SYSTEM_PROMPT` constant.

### Rule 3: Rate Limiting
All AI calls check `User.ai_calls_today` against `Settings.ai_daily_limit_per_user` (100/day). Reset tracked via `User.ai_calls_reset_date`.

## Key Patterns

- AIEngine class wraps AsyncAnthropic — single point of LLM access
- Thread evaluation and digest scoring run in APScheduler background jobs
- Q&A is the only AI call made inline during HTTP requests
- Structured output via `messages.create()` with JSON parsing into Pydantic models
- All AI calls have try/except — failure falls back to rule-based results

## Files

- `src/services/ai_engine.py` — AIEngine (evaluate_thread, ask_question, generate_review, score_urgency, analyze_gpa_risk)
- `src/services/qa.py` — QAService (hybrid direct-context/RAG)
- `src/services/digest.py` — DigestService._enhance_with_ai()
- `src/services/risk_alert.py` — RiskAlertService (Opus deep analysis)
- `src/prompts/thread_eval.py` — THREAD_EVAL_SYSTEM_PROMPT
- `src/prompts/qa.py` — QA_SYSTEM_PROMPT (citation format)
- `src/prompts/review.py` — REVIEW_SYSTEM_PROMPT
- `src/prompts/digest.py` — DIGEST_URGENCY_SYSTEM_PROMPT
- `src/prompts/risk_analysis.py` — GPA_RISK_ANALYSIS_SYSTEM_PROMPT
