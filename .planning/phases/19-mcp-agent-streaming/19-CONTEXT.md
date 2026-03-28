# Phase 19: MCP Agent & Streaming - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver interactive AI features with SSE streaming: Deadline AI chat (multi-turn, in-card), Course Q&A, Unit Review summaries. Hybrid data strategy (DB-first, MCP adapter fallback). Global language preference (SET-LANG) with AI batch-translated dynamic content. All AI responses stream token-by-token via SSE.

**Out of scope:** Skill system auto-generation (Phase 20), MCP Server for Claude Desktop (Phase 21), assignment ROI analysis (Phase 21).

</domain>

<decisions>
## Implementation Decisions

### Streaming Architecture
- **D-01:** Token-by-token SSE streaming using Anthropic SDK `stream=True`. Each `content_block_delta` pushed to frontend via FastAPI `StreamingResponse`.
- **D-02:** Progress indicator = "thinking state" before streaming starts ("正在搜索课程资料..." → "正在分析...") followed by typewriter-style token rendering. Similar to ChatGPT experience.
- **D-03:** Frontend SSE client approach — Claude's discretion. Choose between `fetch + ReadableStream` (supports POST bodies) or `EventSource` based on what fits best with existing patterns.

### Deadline AI Chat UX
- **D-04:** Chat is embedded INSIDE deadline detail cards (per prototype). Not a side panel or modal. Located below "相关材料" section with input field + send button.
- **D-05:** Multi-turn conversation within current session. History kept in React state — cleared when card closes or user switches deadline. No DB persistence for chat history.
- **D-06:** Chat bubbles displayed above input field: user questions right-aligned, AI answers left-aligned. Card height auto-adjusts, scrollable on overflow.
- **D-07:** "材料已自动包含在上下文中" info text + "AI回答仅供学习参考" disclaimer preserved from prototype.
- **D-08:** "即将推出" placeholder badge removed and replaced with functional chat.

### MCP Agent & Data Strategy
- **D-09:** Hybrid data source: DB-first (use synced data from Supabase), fallback to real-time adapter calls when DB data is insufficient OR user explicitly requests ("搜索更多").
- **D-10:** MCP fallback implementation — Claude's discretion on best practice. Reference `/check-deadlines` skill (`.claude/commands/check-deadlines.md`) for how MCP tools achieve cross-platform research. Options: Claude API tool_use with adapter-backed tool definitions, direct adapter calls, or MCP Client SDK. Choose the approach that achieves the same agent effect as the slash command.
- **D-11:** Unified QAService for both Deadline chat and Course Q&A. Same `POST /courses/{course_id}/qa` endpoint, differentiated by context (deadline passes assignment-related materials, course Q&A passes administrative materials).
- **D-12:** MCP fallback triggers: (a) DB context token count below threshold → automatic fallback, (b) "搜索更多" button → user-initiated fallback.

### Language Preference (SET-LANG)
- **D-13:** New "Language Preference" section in Settings page (alongside Notifications, GPA Target). Dropdown: English / 中文.
- **D-14:** Global language switch — affects BOTH UI (next-intl locale auto-switch) AND AI output (prompt language selection for digest, Q&A, review).
- **D-15:** Dynamic content translation via AI batch translation + DB caching. During sync, AI translates course names, deadline titles, material names into target language. Stored in `name_zh` (or equivalent) columns. Frontend selects display field based on locale.
- **D-16:** Everything translatable MUST be translated: course full names, unit outline titles, deadline names, course material names, etc. Only untranslatable items (course codes like COMP2017, file formats) stay in original language.
- **D-17:** Language preference persisted in Profile model (new `language_preference` column, default 'en').

### Claude's Discretion
- Frontend SSE client implementation (fetch+ReadableStream vs EventSource)
- MCP fallback mechanism (tool_use vs direct adapter vs MCP Client SDK)
- DB schema for chat multi-turn conversation state (in-memory vs lightweight)
- AI translation batch size and prompt design
- Streaming error handling and retry strategy
- Token counting threshold for MCP fallback trigger

### Folded Todos
None — no matching todos found.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### AI Architecture & Existing Code
- `src/services/ai_engine.py` — AIEngine: ask_question(), generate_review(), evaluate_thread() — all need streaming variants
- `src/services/qa.py` — QAService: hybrid direct-context/RAG, daily limit enforcement — extend for streaming + MCP fallback
- `src/web/routes/ai.py` — POST /courses/{id}/qa, GET /courses/{id}/review — convert to SSE endpoints
- `src/schemas/ai.py` — QARequest, QAResponse, UnitReviewResponse schemas
- `src/prompts/qa.py` — Q&A system prompt (needs i18n variant)
- `src/prompts/review.py` — Review system prompt (needs i18n variant)

### MCP Reference
- `.claude/commands/check-deadlines.md` — Check-deadlines skill showing MCP tool usage patterns for cross-platform research
- External repo `canvasedmcp` — User's existing MCP server code for Canvas/Ed integration

### Platform Adapters (MCP fallback targets)
- `src/adapters/canvas.py` — Canvas adapter with rate limiting, pagination, circuit breaker
- `src/adapters/ed_discussion.py` — Ed Discussion adapter
- `src/adapters/ed_lessons.py` — Ed Lessons adapter

### Data Models
- `src/models/user.py` — Profile model (needs language_preference column)
- `src/models/course.py` — Course model (needs name_zh column for translations)
- `src/models/module.py` — Module model (may need translated title)

### Frontend (Integration Points)
- `frontend/app/[locale]/(dashboard)/deadlines/page.tsx` — Deadline page (add AI chat to detail cards)
- `frontend/app/[locale]/(dashboard)/courses/[id]/page.tsx` — Course detail page (add Q&A)
- `frontend/app/[locale]/(dashboard)/settings/page.tsx` — Settings page (add language section)
- `frontend/components/settings/SettingsPage.tsx` — Settings component (scroll-spy nav)

### Design & Requirements
- `docs/UniBoard_TRD_v2.md` §2 — MCP tool specifications
- `docs/UniBoard_TRD_v2.md` §6 — AI / prompt engineering
- `docs/UniBoard_TRD_v2.md` §12 — REST API specifications
- `docs/UniBoard_TRD_v2.md` §13 — Frontend architecture
- `docs/UniBoard_BRD_v2.md` — DL-04, FILE-03, FILE-04, SET-LANG requirements
- `docs/frontend_brief.md` — Design system tokens and component patterns

### Phase 18 Context (Prior Decisions)
- `.planning/phases/18-ai-enhancement/18-CONTEXT.md` — AI quality gate, evaluation pipeline, digest tuning decisions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AIEngine** (`src/services/ai_engine.py`): Full Claude API wrapper — needs `stream=True` variants added to ask_question() and generate_review()
- **QAService** (`src/services/qa.py`): Hybrid direct-context/RAG with daily limit — extend for streaming, add MCP fallback path
- **Platform Adapters**: Canvas, Ed Discussion, Ed Lessons adapters — serve as MCP fallback data sources
- **AI routes** (`src/web/routes/ai.py`): Existing JSON endpoints — convert to SSE streaming
- **Prompt templates** (`src/prompts/`): QA, review, digest prompts — add i18n bilingual variants
- **Portal-slot pattern** (Phase 05): RightPanel injection — may be useful for Course Q&A panel
- **Settings scroll-spy** (Phase 12): Existing navigation pattern — add language section

### Established Patterns
- **Service injection**: FastAPI Depends() → service constructor with session + config
- **Daily AI limit**: Profile.ai_calls_today with increment/check in QAService
- **Adapter fallback**: Circuit breaker pattern in adapters for graceful degradation
- **AI fallback**: Routes already implement `if ai_engine is None: fallback_to_rule_based()` pattern
- **i18n**: next-intl with URL-based locale ([locale] route group), LanguageSwitcher component

### Integration Points
- **Deadline detail cards**: Chat input area per prototype (placeholder "即将推出" → functional)
- **Course detail page**: Add Q&A section (no existing chat component)
- **Settings page**: Add language preference section to scroll-spy nav
- **Profile model**: Add language_preference column
- **Sync engine**: Add AI translation step after data sync
- **All display models**: Add name_zh / title_zh columns for cached translations

</code_context>

<specifics>
## Specific Ideas

- Prototype screenshot shows exact layout for deadline AI chat: title → AI summary → related materials → chat input area with "材料已自动包含在上下文中" hint
- User wants the MCP agent to achieve the same effect as `/check-deadlines` slash command — autonomous cross-platform research with intelligent tool selection
- All AI text must follow Phase 18 standard: "precise 20-30 word study guidance, not generic encouragement"
- Dynamic content translation must be comprehensive: course names, deadline titles, material names — everything except course codes
- Language preference in Settings should auto-switch the entire app locale (next-intl URL switch)

</specifics>

<deferred>
## Deferred Ideas

- Skill system auto-generation from successful API explorations — Phase 20
- MCP Server for Claude Desktop users — Phase 21
- Assignment ROI analysis — Phase 21
- Per-course F1 quality gate — M4 backlog
- AI prompt A/B testing framework — M4 backlog
- Chat history persistence to DB — future enhancement if users request

</deferred>

---

*Phase: 19-mcp-agent-streaming*
*Context gathered: 2026-03-28*
