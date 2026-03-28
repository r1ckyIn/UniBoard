---
phase: 19-mcp-agent-streaming
plan: 01
subsystem: ai, api, database
tags: [anthropic, sse, streaming, tool-use, fastapi, sqlalchemy, i18n]

requires:
  - phase: 18-ai-enhancement
    provides: AIEngine, QAService, prompts, ai routes
provides:
  - Streaming AIEngine with stream_question, agent_stream (tool_use loop), stream_review
  - QAService streaming with MCP fallback threshold (500 tokens)
  - SSE endpoints POST /courses/{id}/qa/stream and GET /courses/{id}/review/stream
  - DB migration for language_preference and name_zh/title_zh translation cache columns
  - Bilingual QA and Review prompts with language selector functions
  - Translation prompt template for batch AI translation
affects: [19-02, 19-03, 19-04]

tech-stack:
  added: [sse-starlette]
  patterns: [async-generator-sse, tool-use-agent-loop, bilingual-prompt-selection]

key-files:
  created:
    - supabase/migrations/00000000000005_language_and_translations.sql
    - src/prompts/translation.py
  modified:
    - src/services/ai_engine.py
    - src/services/qa.py
    - src/web/routes/ai.py
    - src/models/user.py
    - src/models/course.py
    - src/models/module.py
    - src/models/lesson.py
    - src/models/deadline.py
    - src/schemas/ai.py
    - src/schemas/user.py
    - src/prompts/qa.py
    - src/prompts/review.py
    - src/web/routes/users.py
    - pyproject.toml
    - tests/unit/test_ai_engine.py
    - tests/unit/test_qa_service.py

key-decisions:
  - "sse-starlette added to pyproject.toml -- was transitive dep of mcp but not direct"
  - "MCP_FALLBACK_TOKEN_THRESHOLD=500 tokens as initial threshold for agent fallback"
  - "AGENT_TOOLS defined in ai_engine.py with 3 tool defs matching RESEARCH.md"
  - "Streaming review uses Markdown format (not JSON) via REVIEW_SYSTEM_PROMPT_STREAM"
  - "language_preference validation in PATCH /users/me rejects non-en/zh values"

patterns-established:
  - "Async generator SSE: yield dict with event/data keys to EventSourceResponse"
  - "Agent tool loop: max 5 iterations with tool_executor callback"
  - "Bilingual prompt: get_*_prompt(language) selector function pattern"

requirements-completed: [DL-04, FILE-03, FILE-04]

duration: 7min
completed: 2026-03-28
---

# Phase 19 Plan 01: Backend Streaming Infrastructure Summary

**SSE streaming AIEngine with Anthropic tool_use agent loop, QAService MCP fallback, bilingual prompts, and DB migration for language/translation columns**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-28T07:08:36Z
- **Completed:** 2026-03-28T07:15:36Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Streaming AIEngine with 3 new methods: stream_question, agent_stream (tool_use loop with max 5 iterations), stream_review
- QAService streaming extension with MCP fallback triggered at 500-token threshold or user "搜索更多"
- SSE endpoints via sse-starlette: POST /courses/{id}/qa/stream and GET /courses/{id}/review/stream
- DB migration adding language_preference to profiles and name_zh/title_zh to 5 content tables
- Bilingual prompt templates (EN/ZH) with language selector functions for QA and Review
- 5 new streaming tests all passing (3 AIEngine + 2 QAService)

## Task Commits

Each task was committed atomically:

1. **Task 1: DB migration, model columns, schemas, and bilingual prompts** - `8f472ef` (feat)
2. **Task 2 RED: Failing streaming tests** - `63dc789` (test)
3. **Task 2 GREEN: Streaming AIEngine, QAService, SSE routes** - `6a08629` (feat)

## Files Created/Modified
- `supabase/migrations/00000000000005_language_and_translations.sql` - Migration for language_preference and translation cache columns
- `src/prompts/translation.py` - Batch AI translation prompt template
- `src/services/ai_engine.py` - Added stream_question, agent_stream, stream_review, AGENT_TOOLS
- `src/services/qa.py` - Added stream_answer_question, stream_review, MCP_FALLBACK_TOKEN_THRESHOLD
- `src/web/routes/ai.py` - Added SSE streaming endpoints with EventSourceResponse
- `src/models/user.py` - Added language_preference column to Profile
- `src/models/course.py` - Added name_zh column
- `src/models/module.py` - Added name_zh (Module) and title_zh (ModuleItem) columns
- `src/models/lesson.py` - Added title_zh column
- `src/models/deadline.py` - Added title_zh column
- `src/schemas/ai.py` - Added StreamingQARequest and ChatMessage schemas
- `src/schemas/user.py` - Added language_preference to UserResponse and UserUpdateRequest
- `src/prompts/qa.py` - Added QA_SYSTEM_PROMPT_ZH and get_qa_prompt()
- `src/prompts/review.py` - Added REVIEW_SYSTEM_PROMPT_ZH, REVIEW_SYSTEM_PROMPT_STREAM, get_review_prompt()
- `src/web/routes/users.py` - Added language_preference to _build_user_response and PATCH handler
- `pyproject.toml` - Added sse-starlette>=3.0 dependency
- `tests/unit/test_ai_engine.py` - Added 3 streaming tests
- `tests/unit/test_qa_service.py` - Added 2 streaming tests

## Decisions Made
- Added sse-starlette as direct dependency (was transitive via mcp package but not declared)
- Set MCP_FALLBACK_TOKEN_THRESHOLD at 500 tokens as starting point for auto-fallback
- Streaming review uses Markdown format instead of JSON for better UX
- language_preference field validated to only accept "en" or "zh" in PATCH handler

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added sse-starlette to pyproject.toml**
- **Found during:** Task 2 (SSE routes implementation)
- **Issue:** sse-starlette was referenced in imports but not in pyproject.toml dependencies; test import failed with ModuleNotFoundError
- **Fix:** Added `sse-starlette>=3.0,<4.0` to pyproject.toml dependencies
- **Files modified:** pyproject.toml, uv.lock
- **Verification:** `uv sync --dev` succeeded, all imports resolved
- **Committed in:** 6a08629 (Task 2 commit)

**2. [Rule 1 - Bug] Fixed Chinese smart quotes in QA prompt**
- **Found during:** Task 1 verification
- **Issue:** Chinese smart quotes in QA_SYSTEM_PROMPT_ZH broke Python string parsing (SyntaxError)
- **Fix:** Replaced Chinese quotation marks with single quotes in prompt string
- **Files modified:** src/prompts/qa.py
- **Verification:** Python import succeeded
- **Committed in:** 8f472ef (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend streaming infrastructure complete for Plan 03 (frontend) to consume
- Plan 02 (translation service + settings language section) can proceed independently
- All SSE endpoints ready: POST /courses/{id}/qa/stream and GET /courses/{id}/review/stream

---
*Phase: 19-mcp-agent-streaming*
*Completed: 2026-03-28*
