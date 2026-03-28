---
phase: 19-mcp-agent-streaming
verified: 2026-03-28T11:30:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Open Deadline card, type a question in AI chat, observe streaming response token-by-token"
    expected: "Status indicator shows 'Searching...' then tokens stream in, chat bubble updates in real-time"
    why_human: "Requires live Anthropic API key and running backend+frontend; visual streaming UX cannot be verified programmatically"
  - test: "Open Course Detail page, type a Q&A question, see streaming response with citations"
    expected: "AiCourseChat shows input, sends question, streams back AI answer with inline citations"
    why_human: "End-to-end SSE streaming through real API requires running services"
  - test: "Click 'Generate Review' on Course Detail page, observe streaming markdown"
    expected: "UnitReviewSection streams structured review (Key Concepts, Common Mistakes, Exam Scope, Study Tips)"
    why_human: "Requires live API and visual inspection of markdown rendering quality"
  - test: "Go to Settings, change language from English to Chinese, verify UI switches and preference persists"
    expected: "URL changes to /zh/..., all UI text switches to Chinese, refreshing page retains preference"
    why_human: "Locale switching, URL routing, and visual verification need manual browser testing"
---

# Phase 19: MCP Agent & Streaming Verification Report

**Phase Goal:** Claude Agent can research across platforms and stream answers to users; users can set language preference
**Verified:** 2026-03-28T11:30:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Deadline AI chat answers assignment questions with cross-platform context and cited sources | VERIFIED | `DeadlineAiChat.tsx` (137 lines) renders functional chat with `useAiStream` hook; backend `qa.py` has `stream_answer_question` with MCP fallback logic; agent loop in `ai_engine.py` has `agent_stream` with tool_use loop (max 5 iterations). Tool executor is placeholder for Phase 20 adapter wiring but agent loop itself is functional. DL-04 in REQUIREMENTS.md explicitly notes "AiStudyMate integration placeholder". |
| 2 | Course material Q&A returns AI answers with source citations from synced materials | VERIFIED | `AiCourseChat.tsx` (130 lines) uses `useAiStream` hook; backend `stream_question` in `ai_engine.py` streams via `messages.stream()` with `get_qa_prompt(language)`; citation extraction via `_CITATION_PATTERN` regex in `ai_engine.py`. |
| 3 | AI unit review generates structured summaries (key concepts, common mistakes, exam scope) | VERIFIED | `UnitReviewSection.tsx` (114 lines) calls `streamAiGet` for GET SSE endpoint; backend `stream_review` in `ai_engine.py`+`qa.py` streams markdown; review prompts in `review.py` specify key_concepts, common_mistakes, exam_scope, study_tips structure. |
| 4 | All AI responses stream via SSE with visible progress indicators | VERIFIED | Backend: `EventSourceResponse` in `ai.py` with status/token/done/error events. Frontend: `streamAiResponse` (POST) and `streamAiGet` (GET) async generators in `ai-stream.ts`; `useAiStream` hook manages `isStreaming`, `status` state; status indicators show "Searching..." / "Analyzing..." with `animate-pulse` in all 3 chat components. |
| 5 | Settings page allows user to select language (en/zh), preference persisted in Profile and used by digest/AI responses | VERIFIED | `LanguageSection.tsx` (81 lines) with English/Chinese toggle buttons; `useUpdateProfile` mutation for PATCH /users/me; `router.replace(pathname, { locale: lang })` for next-intl locale switch; backend validates "en"/"zh" in `users.py`; DB migration adds `language_preference` column; bilingual prompts in `qa.py` and `review.py` use `get_*_prompt(language)` selectors. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/00000000000005_language_and_translations.sql` | Schema migration for language_preference and name_zh columns | VERIFIED (19 lines) | Adds language_preference to profiles, name_zh/title_zh to 5 content tables |
| `src/services/ai_engine.py` | Streaming AIEngine with agent loop | VERIFIED (358 lines) | `stream_question`, `agent_stream` (tool_use loop, max 5 iter), `stream_review` all present with `messages.stream()` |
| `src/services/qa.py` | QAService streaming with MCP fallback | VERIFIED (364 lines) | `stream_answer_question` with 500-token threshold fallback, `stream_review` |
| `src/web/routes/ai.py` | SSE streaming endpoints | VERIFIED (121 lines) | POST `/courses/{id}/qa/stream`, GET `/courses/{id}/review/stream` with `EventSourceResponse` |
| `src/prompts/qa.py` | Bilingual QA prompts | VERIFIED (23 lines) | `QA_SYSTEM_PROMPT`, `QA_SYSTEM_PROMPT_ZH`, `get_qa_prompt()` |
| `src/prompts/review.py` | Bilingual review prompts | VERIFIED (35 lines) | EN, ZH, and STREAM variants, `get_review_prompt()` |
| `src/prompts/translation.py` | Translation prompt template | VERIFIED (10 lines) | `TRANSLATION_SYSTEM_PROMPT` for batch translation |
| `src/services/translation.py` | AI batch translation service | VERIFIED (135 lines) | `TranslationService` with `batch_translate` and `translate_course_content` |
| `tests/unit/test_translation_service.py` | Unit tests for batch translation | VERIFIED (215 lines) | 7 tests all passing |
| `frontend/lib/api/ai-stream.ts` | SSE client utility for POST-based streaming | VERIFIED (119 lines) | `streamAiResponse` (POST) and `streamAiGet` (GET) async generators |
| `frontend/hooks/use-ai-stream.ts` | React hook for SSE streaming with state management | VERIFIED (126 lines) | `useAiStream` with messages, isStreaming, status, error, AbortController cleanup |
| `frontend/components/shared/AiChatBubble.tsx` | Reusable chat bubble component | VERIFIED (44 lines) | User-right/AI-left layout with streaming cursor indicator |
| `frontend/components/deadlines/DeadlineAiChat.tsx` | Embedded AI chat for deadline cards | VERIFIED (137 lines) | Full chat UI with input, send, auto-scroll, status, error handling |
| `frontend/components/course-detail/AiCourseChat.tsx` | Course Q&A streaming chat | VERIFIED (130 lines) | Full chat UI replacing AiChatPlaceholder |
| `frontend/components/course-detail/UnitReviewSection.tsx` | Streaming unit review display | VERIFIED (114 lines) | GET SSE streaming with markdown display |
| `frontend/components/settings/LanguageSection.tsx` | Language preference dropdown | VERIFIED (81 lines) | English/Chinese toggle with backend persistence and locale switch |
| `frontend/components/settings/SettingsPage.tsx` | Updated settings with language section | VERIFIED (212 lines) | sec-language in SECTION_IDS and SECTION_META, LanguageSection rendered |
| `frontend/components/settings/SettingsNav.tsx` | Updated nav with language item | VERIFIED (80 lines) | sec-language with Globe icon |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `ai.py` routes | `qa.py` service | `stream_answer_question` async generator | WIRED | Line 79: `async for token in svc.stream_answer_question(...)` |
| `qa.py` service | `ai_engine.py` | `agent_stream` / `stream_question` generator | WIRED | Lines 261,271: `async for token in self._ai_engine.agent_stream(...)` / `stream_question(...)` |
| `ai.py` routes | `sse_starlette.sse` | `EventSourceResponse` wrapping async generator | WIRED | Lines 8,71,93,102: import and usage in both streaming endpoints |
| `use-ai-stream.ts` hook | `ai-stream.ts` utility | `streamAiResponse` async generator | WIRED | Line 2: import; Line 74: `for await (const event of streamAiResponse(...))` |
| `DeadlineAiChat.tsx` | `use-ai-stream.ts` | `useAiStream` hook | WIRED | Line 6: import; Line 24: hook call with courseId and locale |
| `DeadlineCard.tsx` | `DeadlineAiChat.tsx` | Renders in expanded section | WIRED | Line 10: import; Line 187: `<DeadlineAiChat courseId={deadline.course_code} isExpanded={isExpanded} />` |
| `CourseDetailPage.tsx` | `AiCourseChat.tsx` + `UnitReviewSection.tsx` | Direct render | WIRED | Lines 19-20: imports; Lines 166,171: rendered with courseId/courseName props |
| `LanguageSection.tsx` | `use-user.ts` | `useUpdateProfile` mutation | WIRED | Line 6: import; Line 25: `useUpdateProfile()`; Line 35: `updateProfile.mutate(...)` |
| `LanguageSection.tsx` | `next-intl` routing | `router.replace` for locale switch | WIRED | Line 5: import from `@/lib/i18n/navigation`; Line 40: `router.replace(pathname, { locale: lang })` |
| `sync/tasks.py` | `translation.py` | `TranslationService.translate_course_content` | WIRED | Line 459: `await _translate_user_courses(user, session_factory)`; Line 518: `await svc.translate_course_content(course.id)` |
| `translation.py` | `ai_engine.py` | AIEngine instance for Claude API calls | WIRED | Line 16: import; Line 27: constructor accepts `ai_engine: AIEngine` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DL-04 | 01, 03 | User can ask AI about assignment details in Deadline page chat -- MCP Agent researches across platforms | SATISFIED | DeadlineAiChat component with streaming UI; backend agent_stream with tool_use loop; tool executor is placeholder per REQUIREMENTS.md ("AiStudyMate integration placeholder") |
| FILE-03 | 01, 03 | User can ask AI questions about synced course materials with cited sources | SATISFIED | AiCourseChat component with streaming; QAService.stream_answer_question with direct context; citation extraction |
| FILE-04 | 01, 03 | User can view AI-generated structured review summary | SATISFIED | UnitReviewSection with streaming GET SSE; stream_review in QAService+AIEngine; structured prompts |
| SET-LANG | 02, 04 | User can select preferred language (en/zh), persisted and applied | SATISFIED | LanguageSection in Settings; PATCH /users/me validation; DB column; bilingual prompts; TranslationService for sync-time translation; next-intl locale switch |

No orphaned requirements found -- all 4 requirement IDs (DL-04, FILE-03, FILE-04, SET-LANG) mapped to Phase 19 in REQUIREMENTS.md are covered by plans and implemented.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/services/qa.py` | 255 | `# Placeholder -- full adapter integration in Phase 20` | Info | Tool executor returns static string instead of calling real adapters. Documented as Phase 20 scope; DL-04 requirement explicitly notes "placeholder". Agent loop itself is functional. |

### Human Verification Required

### 1. Deadline AI Chat Streaming

**Test:** Open a Deadline card, type a question in the AI chat input, send it
**Expected:** Status indicator shows "Searching course materials...", then tokens stream in one-by-one, chat bubble updates in real-time, cursor indicator visible during streaming
**Why human:** Requires live Anthropic API key, running backend+frontend, visual streaming UX verification

### 2. Course Material Q&A Streaming

**Test:** Open Course Detail page, type a Q&A question about course materials
**Expected:** AiCourseChat shows input, sends question, streams back AI answer with inline [Canvas: ...] or [Ed: ...] citations
**Why human:** End-to-end SSE streaming through real API requires running services and visual inspection

### 3. Unit Review Generation

**Test:** Click "Generate Review" button on Course Detail page
**Expected:** UnitReviewSection streams structured markdown review with Key Concepts, Common Mistakes, Exam Scope, Study Tips sections
**Why human:** Requires live API call and visual inspection of streamed markdown quality

### 4. Language Preference Settings

**Test:** Go to Settings, click "Chinese" button, observe UI switch; refresh page to verify persistence
**Expected:** URL changes to /zh/..., all UI text switches to Chinese, language_preference saved via PATCH /users/me, refreshing page retains Chinese locale
**Why human:** Locale switching, URL routing, and visual verification need manual browser testing

### Gaps Summary

No blocking gaps found. All 5 observable truths verified with substantive implementations:
- Backend: 3 streaming methods in AIEngine (stream_question, agent_stream, stream_review), QAService streaming with MCP fallback threshold, 2 SSE endpoints with EventSourceResponse, bilingual prompts, DB migration for language columns
- Frontend: SSE client utility (POST+GET), useAiStream hook with AbortController cleanup, 3 streaming chat components (DeadlineAiChat, AiCourseChat, UnitReviewSection), LanguageSection with backend persistence and locale switch
- Translation: TranslationService with batch AI translation, sync pipeline integration, 7 unit tests passing
- All key links verified as wired (imports + actual usage)
- All 4 requirements (DL-04, FILE-03, FILE-04, SET-LANG) satisfied
- 19 unit tests passing across 3 test files (8 AIEngine + 4 QAService + 7 Translation)

The only notable item is the tool executor placeholder in `qa.py` line 255, which is explicitly scoped to Phase 20 adapter wiring and documented in REQUIREMENTS.md.

---

_Verified: 2026-03-28T11:30:00Z_
_Verifier: Claude (gsd-verifier)_
