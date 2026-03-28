# Phase 19: MCP Agent & Streaming - Research

**Researched:** 2026-03-28
**Domain:** AI Streaming (SSE), Claude Tool-Use Agent Loop, i18n Language Preference
**Confidence:** HIGH

## Summary

Phase 19 converts the existing JSON-based AI endpoints (Q&A, Review) into SSE streaming endpoints, adds an agentic tool-use loop for cross-platform research (MCP fallback), embeds functional chat into deadline detail cards and course detail pages, and implements a global language preference feature (SET-LANG).

The technical foundation is strong: Anthropic SDK v0.84.0 already installed has first-class `messages.stream()` with async iteration and `tools` parameter. FastAPI's `sse-starlette` (v3.0.3, already installed via `mcp` dependency) provides `EventSourceResponse` that accepts async generators. The frontend needs `fetch + ReadableStream` (not EventSource) since SSE POST bodies are needed for sending questions. The i18n infrastructure (next-intl 4.8.3 with URL-based `[locale]` routing) is already in place -- SET-LANG adds a Profile-persisted preference that auto-switches the next-intl locale.

**Primary recommendation:** Use Anthropic SDK `client.messages.stream()` with `tools=` for the agentic loop, `sse-starlette.EventSourceResponse` for FastAPI SSE, and `fetch + ReadableStream` on the frontend. Keep chat state in React useState (no DB persistence per D-05). Add `language_preference` column to Profile model and `name_zh` columns to Course/Module/Lesson/Deadline models for cached translations.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Token-by-token SSE streaming using Anthropic SDK `stream=True`. Each `content_block_delta` pushed to frontend via FastAPI `StreamingResponse`.
- **D-02:** Progress indicator = "thinking state" before streaming starts ("正在搜索课程资料..." -> "正在分析...") followed by typewriter-style token rendering.
- **D-04:** Chat is embedded INSIDE deadline detail cards (per prototype). Not a side panel or modal. Located below "相关材料" section with input field + send button.
- **D-05:** Multi-turn conversation within current session. History kept in React state -- cleared when card closes or user switches deadline. No DB persistence for chat history.
- **D-06:** Chat bubbles displayed above input field: user questions right-aligned, AI answers left-aligned. Card height auto-adjusts, scrollable on overflow.
- **D-07:** "材料已自动包含在上下文中" info text + "AI回答仅供学习参考" disclaimer preserved from prototype.
- **D-08:** "即将推出" placeholder badge removed and replaced with functional chat.
- **D-09:** Hybrid data source: DB-first (use synced data from Supabase), fallback to real-time adapter calls when DB data is insufficient OR user explicitly requests ("搜索更多").
- **D-11:** Unified QAService for both Deadline chat and Course Q&A. Same `POST /courses/{course_id}/qa` endpoint, differentiated by context.
- **D-12:** MCP fallback triggers: (a) DB context token count below threshold -> automatic fallback, (b) "搜索更多" button -> user-initiated fallback.
- **D-13:** New "Language Preference" section in Settings page (alongside Notifications, GPA Target). Dropdown: English / 中文.
- **D-14:** Global language switch -- affects BOTH UI (next-intl locale auto-switch) AND AI output (prompt language selection).
- **D-15:** Dynamic content translation via AI batch translation + DB caching. During sync, AI translates course names, deadline titles, material names into target language. Stored in `name_zh` columns. Frontend selects display field based on locale.
- **D-16:** Everything translatable MUST be translated: course full names, unit outline titles, deadline names, course material names, etc.
- **D-17:** Language preference persisted in Profile model (new `language_preference` column, default 'en').

### Claude's Discretion
- Frontend SSE client implementation (fetch+ReadableStream vs EventSource)
- MCP fallback mechanism (tool_use vs direct adapter vs MCP Client SDK)
- DB schema for chat multi-turn conversation state (in-memory vs lightweight)
- AI translation batch size and prompt design
- Streaming error handling and retry strategy
- Token counting threshold for MCP fallback trigger

### Deferred Ideas (OUT OF SCOPE)
- Skill system auto-generation from successful API explorations -- Phase 20
- MCP Server for Claude Desktop users -- Phase 21
- Assignment ROI analysis -- Phase 21
- Per-course F1 quality gate -- M4 backlog
- AI prompt A/B testing framework -- M4 backlog
- Chat history persistence to DB -- future enhancement if users request
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DL-04 | User can ask AI about assignment details in Deadline page chat -- MCP Agent researches across Canvas announcements, modules, Ed threads, and Ed Lessons to provide contextual answers with cited sources | Anthropic tool_use agent loop + adapter-backed tools + SSE streaming + embedded chat in DeadlineCard |
| FILE-03 | User can ask AI questions about synced course materials and receive answers with cited sources -- MCP Agent cross-platform research | Unified QAService with streaming variant + AiChatPlaceholder replacement + course Q&A SSE endpoint |
| FILE-04 | User can select a course unit and view AI-generated structured review summary (key concepts, common mistakes, exam scope) -- MCP Agent | Streaming review endpoint + frontend unit review UI in CourseDetailPage |
| SET-LANG | User can select preferred language (en/zh) in Settings page, preference persisted in Profile and applied to digest summaries and AI responses | Profile.language_preference column + Settings language section + next-intl locale auto-switch + AI prompt i18n |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| anthropic | 0.84.0 | Claude API with streaming + tool_use | Already in pyproject.toml; `messages.stream()` + `tools=` for agent loop |
| sse-starlette | 3.0.3 | FastAPI SSE responses | Already installed (mcp dependency); `EventSourceResponse` with async generators |
| FastAPI | >=0.115 | Web framework | Already the backend framework |
| next-intl | 4.8.3 | i18n for Next.js | Already handles `[locale]` routing, `useTranslations`, locale switching |
| tiktoken | >=0.8 | Token counting | Already used in QAService for direct-context vs RAG threshold |
| TanStack Query v5 | ^5.91.2 | Data fetching (non-streaming endpoints) | Already used for all hooks |

### Supporting (No New Dependencies Needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| structlog | >=24.0 | Structured logging | Log streaming events, tool calls, fallback triggers |
| httpx | >=0.28 | HTTP client for adapters | Already used by Canvas/Ed adapters for MCP fallback |

### Alternatives Considered (Discretion Decisions)

| Decision | Chosen | Why |
|----------|--------|-----|
| Frontend SSE client | `fetch + ReadableStream` | **Recommended.** EventSource only supports GET; Q&A needs POST with question body. fetch+ReadableStream works with POST, supports `text/event-stream` parsing, and is native browser API. |
| MCP fallback mechanism | Claude API `tool_use` with adapter-backed tool definitions | **Recommended.** Direct adapter calls lack Claude's intelligent tool selection. MCP Client SDK adds unnecessary complexity. `tool_use` gives Claude the same autonomous research behavior as `/check-deadlines` slash command. |
| Chat multi-turn state | React `useState` (in-memory) | **Recommended per D-05.** No DB persistence. Chat messages array in state, cleared on card close/switch. Conversation history passed to Anthropic `messages` array for multi-turn context. |

**Installation:**
No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Backend Structure
```
src/
├── services/
│   ├── ai_engine.py      # Add stream_question(), stream_review(), agent_loop()
│   └── qa.py             # Add stream_answer_question(), _answer_with_tools()
├── web/routes/
│   └── ai.py             # Convert POST /qa and GET /review to SSE endpoints
├── prompts/
│   ├── qa.py             # Add QA_SYSTEM_PROMPT_ZH bilingual variant
│   ├── review.py         # Add REVIEW_SYSTEM_PROMPT_ZH bilingual variant
│   └── translation.py    # NEW: batch translation prompt
├── schemas/
│   └── ai.py             # Add SSEEvent, StreamingQARequest schemas
└── models/
    ├── user.py           # Add language_preference column to Profile
    ├── course.py          # Add name_zh column
    ├── module.py          # Add name_zh column to Module
    └── lesson.py          # Add title_zh column to Lesson
```

### Frontend Structure
```
frontend/
├── components/
│   ├── deadlines/
│   │   ├── DeadlineCard.tsx       # Replace "即将推出" with functional AiChat
│   │   └── DeadlineAiChat.tsx     # NEW: embedded chat component
│   ├── course-detail/
│   │   ├── AiChatPlaceholder.tsx  # Replace with functional AiCourseChat.tsx
│   │   ├── AiCourseChat.tsx       # NEW: course Q&A chat component
│   │   └── UnitReviewSection.tsx  # NEW: streaming unit review display
│   ├── settings/
│   │   └── LanguageSection.tsx    # NEW: language preference dropdown
│   └── shared/
│       └── AiChatBubble.tsx       # NEW: reusable chat bubble (user/ai styling)
├── hooks/
│   ├── use-ai-stream.ts           # NEW: SSE streaming hook (fetch+ReadableStream)
│   └── use-user.ts                # Extend to include language_preference
└── lib/
    └── api/
        └── ai-stream.ts           # NEW: SSE client utility
```

### Pattern 1: Anthropic Streaming with Tool-Use Agent Loop
**What:** Claude API `messages.stream()` with `tools=` parameter. When Claude calls a tool (stop_reason="tool_use"), execute the tool via adapter, send tool_result back, resume streaming.
**When to use:** Deadline AI chat and Course Q&A when MCP fallback is triggered.
**Example:**
```python
# Source: Anthropic SDK v0.84.0 inspection + official patterns
async def agent_stream(
    question: str,
    context_text: str,
    tools: list[dict],
    tool_executor: Callable,
) -> AsyncGenerator[str, None]:
    """Agentic streaming loop with tool_use support."""
    messages = [{"role": "user", "content": f"Context:\n{context_text}\n\nQuestion: {question}"}]

    while True:
        async with self._client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            system=QA_SYSTEM_PROMPT,
            messages=messages,
            tools=tools,
        ) as stream:
            collected_text = ""
            tool_calls = []

            async for event in stream:
                if event.type == "text":
                    collected_text += event.text
                    yield event.text  # Stream token to SSE

            # Check if Claude wants to call tools
            final_message = await stream.get_final_message()

            if final_message.stop_reason == "tool_use":
                # Extract tool_use blocks
                for block in final_message.content:
                    if block.type == "tool_use":
                        result = await tool_executor(block.name, block.input)
                        messages.append({"role": "assistant", "content": final_message.content})
                        messages.append({
                            "role": "user",
                            "content": [{
                                "type": "tool_result",
                                "tool_use_id": block.id,
                                "content": result,
                            }],
                        })
                # Continue the loop -- Claude will process tool results
                continue
            else:
                # stop_reason is "end_turn" -- done
                break
```

### Pattern 2: FastAPI SSE with EventSourceResponse
**What:** `sse-starlette.EventSourceResponse` wraps an async generator that yields SSE events.
**When to use:** All streaming AI endpoints.
**Example:**
```python
# Source: sse-starlette v3.0.3 API inspection
from sse_starlette.sse import EventSourceResponse

@router.post("/courses/{course_id}/qa/stream")
async def course_qa_stream(
    course_id: uuid.UUID,
    body: StreamingQARequest,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> EventSourceResponse:
    """Stream AI Q&A response via SSE."""
    svc = _build_qa_service(session)

    async def event_generator():
        # Phase 1: thinking indicator
        yield {"event": "status", "data": json.dumps({"phase": "searching"})}

        # Phase 2: stream tokens
        async for token in svc.stream_answer_question(
            user_id=current_user_id,
            course_id=course_id,
            question=body.question,
            history=body.history or [],
        ):
            yield {"event": "token", "data": json.dumps({"text": token})}

        # Phase 3: done
        yield {"event": "done", "data": json.dumps({"citations": [...]})}

    return EventSourceResponse(event_generator())
```

### Pattern 3: Frontend fetch + ReadableStream SSE Client
**What:** Use `fetch()` with POST body to hit SSE endpoint, parse `text/event-stream` via `ReadableStream` + `TextDecoder`.
**When to use:** All frontend AI streaming calls.
**Example:**
```typescript
// Recommended approach for POST-based SSE
async function* streamAiResponse(
  courseId: string,
  question: string,
  history: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<SSEEvent> {
  const response = await fetch(`/api/v1/courses/${courseId}/qa/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ question, history }),
    signal,
  });

  if (!response.ok) throw new Error(`SSE error: ${response.status}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!; // keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        // parse event type
      } else if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));
        yield { event: currentEvent, data };
      }
    }
  }
}
```

### Pattern 4: Language Preference with next-intl Auto-Switch
**What:** Settings dropdown saves `language_preference` to Profile via API. On change, call `router.replace(pathname, { locale: newLocale })` to switch next-intl URL locale.
**When to use:** SET-LANG implementation.
**Example:**
```typescript
// Reuse existing LanguageSwitcher pattern from auth page
const handleLanguageChange = async (lang: "en" | "zh") => {
  // 1. Persist to backend
  await updateProfile({ language_preference: lang });
  // 2. Switch frontend locale
  router.replace(pathname, { locale: lang });
};
```

### Anti-Patterns to Avoid
- **EventSource for POST requests:** EventSource only supports GET. Never use it for Q&A which needs POST body with question + history.
- **Storing chat history in DB:** Per D-05, chat history is session-only. DB persistence is out of scope.
- **Blocking tool execution during stream:** Tool calls should NOT block the SSE connection. Send "searching" status events during tool execution so the user sees progress.
- **Translating at render time:** Never call AI translation on each page load. Translations must be cached in DB `name_zh` columns during sync.
- **Separate endpoints per chat type:** Per D-11, use unified QAService. Deadline chat and Course Q&A share the same endpoint, differentiated by context parameter.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE protocol formatting | Custom SSE string formatting | `sse-starlette.EventSourceResponse` | Handles keep-alive, proper headers, event formatting, client disconnect detection |
| Token counting | Custom tokenizer | `tiktoken` cl100k_base encoder | Already used in QAService; accurate token counts for fallback threshold |
| Streaming text parsing | Custom chunk parser | `TextDecoder` + line-based SSE parsing | Standard SSE protocol; `event:`/`data:` line format is trivial to parse |
| i18n routing | Custom locale URL rewriting | `next-intl` routing + `createNavigation` | Already configured with `[locale]` route group and `useRouter().replace()` |
| Tool-use agent loop | Custom MCP Client SDK integration | Anthropic SDK `tools=` parameter | SDK handles tool_use detection, streaming pause/resume, content block assembly |

**Key insight:** The entire streaming + tool-use + SSE stack is already available in installed dependencies. Zero new packages needed.

## Common Pitfalls

### Pitfall 1: SSE Connection Timeout During Tool Execution
**What goes wrong:** When Claude calls tools (adapter API calls), the SSE connection may appear idle for 5-30 seconds. Proxies, load balancers, or browsers may time out.
**Why it happens:** Tool execution (e.g., Canvas API call) takes time, and no data flows during this period.
**How to avoid:** Send periodic "status" SSE events during tool execution (e.g., `{"phase": "searching_canvas", "tool": "search_modules"}`). Use `sse-starlette`'s `ping` parameter as keepalive.
**Warning signs:** Frontend shows "connection lost" or response cuts off mid-stream.

### Pitfall 2: Anthropic Stream Context Manager Must Be Awaited
**What goes wrong:** `async with client.messages.stream(...)` returns an `AsyncMessageStreamManager`. Forgetting `async with` or trying to iterate directly on the return value causes errors.
**Why it happens:** The SDK uses an async context manager pattern for resource cleanup.
**How to avoid:** Always use `async with ... as stream:` then `async for event in stream:` pattern.
**Warning signs:** `TypeError: 'AsyncMessageStreamManager' object is not an async iterable`

### Pitfall 3: Multi-Turn Messages Format for Tool Use
**What goes wrong:** After tool execution, the messages array must include: (1) the assistant's full response (including tool_use blocks), (2) user message with tool_result blocks. Missing either causes API errors.
**Why it happens:** Claude API requires the complete conversation including tool interactions.
**How to avoid:** Append `final_message.content` as assistant message (not just text), then append tool results as user content blocks.
**Warning signs:** `400 Bad Request: messages: tool_use and tool_result blocks must be alternating`

### Pitfall 4: ReadableStream Buffer Splitting
**What goes wrong:** SSE events may be split across multiple `reader.read()` chunks. Parsing without a buffer causes missed events or JSON parse errors.
**Why it happens:** TCP/HTTP chunked transfer doesn't respect SSE event boundaries.
**How to avoid:** Accumulate in a buffer, split on `\n`, keep incomplete last line in buffer for next read.
**Warning signs:** `SyntaxError: Unexpected end of JSON input` intermittently.

### Pitfall 5: AbortController for Chat Cleanup
**What goes wrong:** User closes deadline card or switches deadline while AI is streaming. Without abort, the old stream continues consuming resources and tokens.
**Why it happens:** React component unmount doesn't automatically cancel fetch.
**How to avoid:** Pass `AbortController.signal` to fetch. In useEffect cleanup, call `controller.abort()`. Wrap SSE generator in try/catch for AbortError.
**Warning signs:** Multiple concurrent streams for the same user, unexpected token consumption.

### Pitfall 6: DeadlineCard maxHeight Overflow with Chat
**What goes wrong:** Current DeadlineCard uses `maxHeight: "800px"` for expanded section. Adding chat with variable-height messages may exceed this.
**Why it happens:** Chat messages can grow indefinitely in a multi-turn conversation.
**How to avoid:** Replace fixed maxHeight with a scrollable chat container. Set chat area to fixed height with `overflow-y: auto`, separate from the card expansion animation.
**Warning signs:** Chat messages cut off at bottom, no scroll available.

### Pitfall 7: Naive Datetime for Supabase Migration
**What goes wrong:** Using `TIMESTAMPTZ` in migration but naive datetimes in asyncpg queries causes `DataError`.
**Why it happens:** Phase 15 established pattern: use `TIMESTAMP WITHOUT TIME ZONE` for asyncpg compatibility, or ensure all datetimes are naive.
**How to avoid:** New columns (e.g., `language_preference`) use appropriate types. For any timestamp columns, follow Phase 15 pattern.
**Warning signs:** `asyncpg.DataError: invalid input for query argument`

### Pitfall 8: AI Translation Cost Explosion
**What goes wrong:** Translating every course name, deadline title, material name individually causes excessive API calls and cost.
**Why it happens:** Per-item translation is N API calls where N can be hundreds of items per user.
**How to avoid:** Batch translation: collect all untranslated items, send in a single prompt with JSON input/output format. Translate during sync, not on-demand.
**Warning signs:** AI daily limit hit quickly, high Anthropic API costs.

## Code Examples

### Existing AIEngine -- Streaming Extension
```python
# Extend src/services/ai_engine.py
# Source: Anthropic SDK v0.84.0 AsyncMessages.stream() inspection

async def stream_question(
    self,
    question: str,
    context_text: str,
    history: list[dict[str, str]] | None = None,
    tools: list[dict] | None = None,
    model: str = "claude-sonnet-4-20250514",
) -> AsyncGenerator[str, None]:
    """Stream answer tokens. Yields text deltas."""
    messages: list[dict] = []
    if history:
        messages.extend(history)
    messages.append({
        "role": "user",
        "content": f"Course materials:\n{context_text}\n\nStudent question: {question}",
    })

    kwargs: dict = {
        "model": model,
        "max_tokens": 1000,
        "system": QA_SYSTEM_PROMPT,
        "messages": messages,
    }
    if tools:
        kwargs["tools"] = tools

    async with self._client.messages.stream(**kwargs) as stream:
        async for event in stream:
            if event.type == "text":
                yield event.text
```

### SSE Event Protocol (Backend -> Frontend Contract)
```python
# SSE event types:
# event: status  -- phase indicators (searching, analyzing, etc.)
# event: token   -- text delta from AI
# event: tool    -- tool being called (for progress display)
# event: done    -- stream complete with metadata
# event: error   -- error occurred

# Example SSE stream:
# event: status\ndata: {"phase": "searching"}\n\n
# event: status\ndata: {"phase": "analyzing"}\n\n
# event: token\ndata: {"text": "Based on"}\n\n
# event: token\ndata: {"text": " the lecture notes"}\n\n
# event: done\ndata: {"citations": ["[Canvas: Week 3 Notes]"], "tokens_used": 450}\n\n
```

### MCP Agent Tool Definitions
```python
# Tools for adapter-backed cross-platform research
AGENT_TOOLS = [
    {
        "name": "search_canvas_modules",
        "description": "Search Canvas course modules and announcements for relevant content",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query for Canvas content"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "search_ed_threads",
        "description": "Search Ed Discussion threads for assignment clarifications, endorsed answers, or staff posts",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query for Ed Discussion"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_ed_lesson_content",
        "description": "Get content from a specific Ed Lessons lesson or assignment",
        "input_schema": {
            "type": "object",
            "properties": {
                "lesson_id": {"type": "integer", "description": "Ed Lesson ID"},
            },
            "required": ["lesson_id"],
        },
    },
]
```

### Batch Translation Prompt Pattern
```python
# Efficient batch translation for name_zh columns
TRANSLATION_SYSTEM_PROMPT = (
    "You are a university course content translator. "
    "Translate the following items from English to Chinese (Simplified). "
    "Keep course codes (e.g., COMP2017), file format names (PDF, DOCX), "
    "and proper nouns that have no standard Chinese translation in English. "
    "Return JSON array matching input order: "
    '[{"original": str, "zh": str}]'
)

# Batch size: 50 items per API call (fits within context window easily)
# Model: claude-sonnet (fast, cheap, accurate for translation)
```

### Profile Model Extension
```python
# Add to src/models/user.py Profile class
language_preference: Mapped[str] = mapped_column(
    String(5), default="en", server_default="en"
)
```

### Supabase Migration for New Columns
```sql
-- Migration: add language and translation columns
ALTER TABLE profiles
  ADD COLUMN language_preference VARCHAR(5) NOT NULL DEFAULT 'en';

ALTER TABLE courses
  ADD COLUMN name_zh VARCHAR(255);

ALTER TABLE modules
  ADD COLUMN name_zh VARCHAR(255);

ALTER TABLE lessons
  ADD COLUMN title_zh VARCHAR(255);

ALTER TABLE unified_deadlines
  ADD COLUMN title_zh VARCHAR(255);

ALTER TABLE module_items
  ADD COLUMN title_zh VARCHAR(255);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `messages.create(stream=True)` returns raw events | `messages.stream()` context manager with typed events | Anthropic SDK ~0.40+ | Cleaner async iteration, typed TextEvent/ToolUseBlock |
| EventSource (GET only) for SSE | `fetch + ReadableStream` for POST-based SSE | Always (SSE spec limitation) | POST Q&A bodies work correctly |
| `sse-starlette` v1.x simple strings | `sse-starlette` v3.x with dict/ServerSentEvent | v3.0 | Cleaner event typing, built-in ping support |
| Manual tool parsing from raw JSON | SDK `ToolUseBlock` with typed `id`, `name`, `input` | Anthropic SDK 0.50+ | No manual JSON parsing needed |

**Deprecated/outdated:**
- `messages.create(stream=True)` raw iteration: Use `messages.stream()` context manager instead
- `EventSource` API: Does not support POST bodies; use `fetch + ReadableStream`

## Open Questions

1. **Token counting threshold for MCP fallback trigger**
   - What we know: Current `rag_token_threshold` is 100,000 tokens. For MCP fallback, the question is "when is DB context too thin?"
   - What's unclear: Exact threshold for "insufficient context" -- 500 tokens? 1000?
   - Recommendation: Start with 500 tokens minimum context. Below that, auto-trigger MCP fallback. Log actual context sizes in production to tune. Also consider question-type heuristic: if question asks about "announcements" or "Ed posts" and DB has none, trigger fallback regardless of token count.

2. **AI translation batch timing**
   - What we know: Translations happen during sync. SyncEngine runs grades/15min, deadlines/1h, modules/daily.
   - What's unclear: Should translation be a separate sync task or piggyback on existing tasks?
   - Recommendation: Piggyback on existing sync tasks. After each sync task upserts new items, check for null `name_zh` columns and batch-translate. This avoids a separate scheduler job.

3. **Streaming review format**
   - What we know: Current `generate_review()` returns structured JSON (key_concepts, common_mistakes, exam_scope, study_tips). Streaming JSON is complex.
   - What's unclear: Should review stream as tokens (user sees raw text building up) or stream section-by-section?
   - Recommendation: Stream as markdown text (not JSON). Frontend renders markdown in real-time. Once stream completes, the full text is the review. This is simpler and provides better UX than trying to stream JSON parsing.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3 + pytest-asyncio 0.25 (backend), Vitest (frontend) |
| Config file | `pyproject.toml [tool.pytest.ini_options]`, `frontend/vitest.config.ts` |
| Quick run command | `uv run pytest tests/unit/ -x -q` |
| Full suite command | `uv run pytest tests/ -x -q --timeout=120` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DL-04 | Deadline AI chat streams answers with citations | unit | `uv run pytest tests/unit/test_ai_engine.py::test_stream_question -x` | -- Wave 0 |
| DL-04 | Agent tool_use loop executes adapter tools | unit | `uv run pytest tests/unit/test_ai_engine.py::test_agent_tool_loop -x` | -- Wave 0 |
| DL-04 | SSE endpoint returns streaming response | integration | `uv run pytest tests/integration/test_ai_routes.py::test_qa_stream_sse -x` | -- Wave 0 |
| FILE-03 | Course Q&A streams with cited sources | unit | `uv run pytest tests/unit/test_qa_service.py::test_stream_answer_question -x` | -- Wave 0 |
| FILE-04 | Unit review streams structured summary | unit | `uv run pytest tests/unit/test_ai_engine.py::test_stream_review -x` | -- Wave 0 |
| FILE-04 | Review SSE endpoint returns streaming response | integration | `uv run pytest tests/integration/test_ai_routes.py::test_review_stream_sse -x` | -- Wave 0 |
| SET-LANG | Language preference persisted in Profile | unit | `uv run pytest tests/unit/test_language_preference.py -x` | -- Wave 0 |
| SET-LANG | Language affects AI prompt selection | unit | `uv run pytest tests/unit/test_qa_service.py::test_bilingual_prompt_selection -x` | -- Wave 0 |
| SET-LANG | Batch translation creates name_zh entries | unit | `uv run pytest tests/unit/test_translation_service.py -x` | -- Wave 0 |

### Sampling Rate
- **Per task commit:** `uv run pytest tests/unit/ -x -q --timeout=30`
- **Per wave merge:** `uv run pytest tests/ -x -q --timeout=120`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_ai_engine.py` -- add streaming + tool_use tests (file exists, add new tests)
- [ ] `tests/unit/test_qa_service.py` -- add streaming variant tests (file exists, add new tests)
- [ ] `tests/unit/test_language_preference.py` -- covers SET-LANG Profile persistence
- [ ] `tests/unit/test_translation_service.py` -- covers batch AI translation
- [ ] `tests/integration/test_ai_routes.py` -- add SSE streaming route tests (file exists, add new tests)
- [ ] `supabase/migrations/00000000000005_language_and_translations.sql` -- schema migration

## Sources

### Primary (HIGH confidence)
- Anthropic SDK v0.84.0 local inspection -- `messages.stream()`, `TextEvent`, `ToolUseBlock`, `ToolParam` structure verified via Python introspection
- sse-starlette v3.0.3 local inspection -- `EventSourceResponse` signature, dict/ServerSentEvent content support, ping parameter
- Existing codebase -- `src/services/ai_engine.py`, `src/services/qa.py`, `src/web/routes/ai.py`, `src/models/user.py`, `src/config.py`, all read and analyzed
- Frontend codebase -- `DeadlineCard.tsx`, `AiChatPlaceholder.tsx`, `SettingsPage.tsx`, `LanguageSwitcher.tsx`, next-intl routing config

### Secondary (MEDIUM confidence)
- FastAPI StreamingResponse patterns -- standard Starlette pattern, widely documented
- fetch + ReadableStream SSE parsing -- standard Web API, well-established pattern
- Anthropic tool_use agent loop -- verified via SDK type inspection (ToolParam, ToolUseBlock, ToolResultBlockParam)

### Tertiary (LOW confidence)
- None -- all critical findings verified via local SDK/codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and versions verified locally
- Architecture: HIGH -- patterns derived from existing codebase + SDK API inspection
- Pitfalls: HIGH -- based on known SDK behavior, existing project patterns (Phase 15 naive datetime, Phase 05 scrollTo)
- Validation: HIGH -- test framework and patterns well established

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable -- Anthropic SDK breaking changes unlikely within minor version)
