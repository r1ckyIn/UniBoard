---
phase: 04-intelligence-skills
plan: "02"
status: complete
started: 2026-03-17T15:00:00Z
completed: 2026-03-17T15:20:00Z
duration_minutes: 20
---

# Plan 04-02 Summary: AI Intelligence Engine

## What Was Built

Full AI intelligence layer: AIEngine wrapping Anthropic SDK (structured outputs), hybrid Q&A (direct context / RAG with pgvector), AI unit review summaries, AI-enhanced Ed Discussion thread evaluation, and frontend components for Q&A chat, unit review, and AI-scored posts.

## Key Files

### Created
- `src/services/ai_engine.py` — AIEngine class (evaluate_thread, ask_question, generate_review, score_urgency, analyze_gpa_risk)
- `src/services/qa.py` — QAService with hybrid direct/RAG architecture and tiktoken threshold
- `src/models/embedding.py` — ContentEmbedding ORM with VECTOR(1024) for pgvector
- `src/schemas/ai.py` — ThreadEvaluation, QARequest, QAResponse, UnitReviewResponse
- `src/prompts/thread_eval.py` — THREAD_EVAL_SYSTEM_PROMPT
- `src/prompts/qa.py` — QA_SYSTEM_PROMPT with citation format
- `src/prompts/review.py` — REVIEW_SYSTEM_PROMPT
- `src/web/routes/ai.py` — POST /courses/{id}/qa, GET /courses/{id}/review
- `alembic/versions/006_phase4_content_embeddings.py` — content_embeddings table
- `frontend/lib/hooks/useAI.ts` — useAskQuestion, useCourseReview, useAIHighValuePosts
- `frontend/components/ai/CourseQA.tsx` — Chat Q&A with citation pills
- `frontend/components/ai/UnitReview.tsx` — Structured review (concepts, mistakes, scope, tips)
- `frontend/components/ai/AIHighValuePosts.tsx` — AI-scored posts with relevance bars
- `tests/unit/test_ai_engine.py`, `test_qa_service.py`, `test_intelligence_ai.py`
- `tests/integration/test_ai_routes.py`
- `frontend/__tests__/ai/CourseQA.test.tsx`

### Modified
- `src/services/intelligence.py` — Added evaluate_new_threads_ai, get_ai_high_value_posts
- `src/schemas/intelligence.py` — Added AIHighValuePostResponse
- `src/web/routes/__init__.py` — Registered ai_router
- `src/web/routes/intelligence.py` — Added /intelligence/ai endpoint
- `src/config.py` — Added voyage_api_key, rag_* settings
- `pyproject.toml` — Added pgvector, voyageai, tiktoken deps
- `frontend/lib/api/types.ts` — AI type interfaces
- `frontend/lib/api/endpoints.ts` — AI endpoints
- `frontend/app/[locale]/(dashboard)/courses/[id]/page.tsx` — Integrated AI components

## Decisions Made

- Fixed migration 006 bug: `sa.Column("embedding", sa.Column)` invalid — removed placeholder since embedding column is added via raw SQL
- Used jsdom `scrollTo` guard in CourseQA (jsdom doesn't implement scrollTo)
- Removed unused HighValuePosts import from course detail page (replaced by AIHighValuePosts)

## Verification

- 152 backend tests passed, 0 failed, 18 skipped
- 48 frontend tests passed, 0 failed
- mypy: 82 source files, no issues
- ruff: all checks passed
- pnpm build, lint (0 warnings), typecheck: all clean

## Self-Check: PASSED

- [x] AIEngine with evaluate_thread, ask_question, generate_review, analyze_gpa_risk
- [x] QAService with hybrid direct/RAG architecture
- [x] ContentEmbedding with VECTOR(1024)
- [x] AI routes: POST /courses/{id}/qa, GET /courses/{id}/review, GET /intelligence/ai
- [x] Frontend: CourseQA chat, UnitReview summary, AIHighValuePosts with relevance
- [x] All tests pass, all builds clean
