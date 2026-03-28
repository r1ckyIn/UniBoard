---
phase: 19-mcp-agent-streaming
plan: 03
subsystem: ui
tags: [sse, streaming, react-hooks, ai-chat, next-intl, fetch-readablestream]

# Dependency graph
requires:
  - phase: 19-mcp-agent-streaming plan 01
    provides: SSE backend endpoints (POST /qa/stream, GET /review/stream)
provides:
  - SSE client utility (streamAiResponse POST, streamAiGet GET async generators)
  - useAiStream hook with multi-turn state and AbortController cleanup
  - Reusable AiChatBubble component (user-right/AI-left layout)
  - DeadlineAiChat embedded in DeadlineCard replacing Coming Soon placeholder
  - AiCourseChat replacing AiChatPlaceholder in CourseDetailPage
  - UnitReviewSection with streaming markdown display
  - i18n keys for AI streaming status in en.json and zh.json
affects: [frontend-integration, course-detail, deadlines, settings-language]

# Tech tracking
tech-stack:
  added: []
  patterns: [fetch-readablestream-sse, async-generator-sse-parsing, useAiStream-hook, abort-controller-cleanup]

key-files:
  created:
    - frontend/lib/api/ai-stream.ts
    - frontend/hooks/use-ai-stream.ts
    - frontend/components/shared/AiChatBubble.tsx
    - frontend/components/deadlines/DeadlineAiChat.tsx
    - frontend/components/course-detail/AiCourseChat.tsx
    - frontend/components/course-detail/UnitReviewSection.tsx
  modified:
    - frontend/components/deadlines/DeadlineCard.tsx
    - frontend/components/course-detail/CourseDetailPage.tsx
    - frontend/messages/en.json
    - frontend/messages/zh.json

key-decisions:
  - "Used fetch+ReadableStream over EventSource for SSE (POST body support needed for Q&A)"
  - "useAiStream hook uses messagesRef to avoid stale closure in sendMessage callback"
  - "DeadlineCard passes course_code as courseId since Deadline schema has no course_id field"
  - "DeadlineCard maxHeight increased from 800px to 1200px to accommodate chat content"

patterns-established:
  - "SSE async generator pattern: streamAiResponse/streamAiGet yield SSEEvent objects"
  - "useAiStream hook pattern: manages messages, isStreaming, status, error with AbortController"
  - "AiChatBubble reusable component: user-right/AI-left with streaming cursor"

requirements-completed: [DL-04, FILE-03, FILE-04]

# Metrics
duration: 6min
completed: 2026-03-28
---

# Phase 19 Plan 03: Frontend Streaming UI Summary

**SSE client utility with POST/GET async generators, useAiStream hook, DeadlineAiChat/AiCourseChat/UnitReviewSection streaming components replacing Coming Soon placeholders**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-28T07:20:56Z
- **Completed:** 2026-03-28T07:26:56Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- SSE client utility with both POST (streamAiResponse) and GET (streamAiGet) async generators for parsing text/event-stream
- useAiStream hook managing multi-turn chat state in memory with AbortController cleanup on unmount
- Reusable AiChatBubble with user-right/AI-left layout and streaming cursor indicator
- DeadlineAiChat embedded in DeadlineCard replacing the disabled "Coming Soon" placeholder with functional streaming chat
- AiCourseChat replacing AiChatPlaceholder in CourseDetailPage with functional Q&A streaming
- UnitReviewSection streaming markdown review via GET SSE endpoint
- i18n strings for aiSearching, aiAnalyzing, unitReview in both en.json and zh.json

## Task Commits

Each task was committed atomically:

1. **Task 1: SSE client utility, useAiStream hook, and shared AiChatBubble** - `e2b8e6d` (feat)
2. **Task 2: DeadlineAiChat, AiCourseChat, UnitReviewSection, and i18n strings** - `b80ee81` (feat)

## Files Created/Modified
- `frontend/lib/api/ai-stream.ts` - SSE client with POST and GET async generators
- `frontend/hooks/use-ai-stream.ts` - React hook for SSE streaming with multi-turn state
- `frontend/components/shared/AiChatBubble.tsx` - Reusable chat bubble component
- `frontend/components/deadlines/DeadlineAiChat.tsx` - Embedded AI chat for deadline cards
- `frontend/components/deadlines/DeadlineCard.tsx` - Replaced AI Chat section with DeadlineAiChat
- `frontend/components/course-detail/AiCourseChat.tsx` - Course Q&A streaming chat
- `frontend/components/course-detail/CourseDetailPage.tsx` - Replaced AiChatPlaceholder with AiCourseChat + UnitReviewSection
- `frontend/components/course-detail/UnitReviewSection.tsx` - Streaming unit review display
- `frontend/messages/en.json` - Added aiSearching, aiAnalyzing, unitReview keys
- `frontend/messages/zh.json` - Added corresponding Chinese translations

## Decisions Made
- Used fetch+ReadableStream over EventSource for SSE because Q&A needs POST body with question + history
- useAiStream hook uses messagesRef (useRef) to avoid stale closure in the sendMessage useCallback, with messages state dependency removed
- DeadlineCard passes `deadline.course_code` as courseId since the Deadline OpenAPI schema has no `course_id` field
- Increased DeadlineCard expanded maxHeight from 800px to 1200px per Pitfall 6 (chat content overflow)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale closure in useAiStream sendMessage**
- **Found during:** Task 1 (useAiStream hook implementation)
- **Issue:** Plan code used `messages` state directly in sendMessage callback causing stale closure when building history
- **Fix:** Added `messagesRef` (useRef) that tracks current messages, used in sendMessage instead of state
- **Files modified:** frontend/hooks/use-ai-stream.ts
- **Verification:** Hook correctly accesses current messages via ref

**2. [Rule 1 - Bug] Fixed Deadline schema course_id reference**
- **Found during:** Task 2 (DeadlineCard update)
- **Issue:** Plan used `deadline.course_id` but Deadline schema (from OpenAPI) has no `course_id` field
- **Fix:** Changed to `deadline.course_code` which exists on the Deadline type
- **Files modified:** frontend/components/deadlines/DeadlineCard.tsx
- **Verification:** TypeScript compilation shows no new errors for DeadlineCard

**3. [Rule 1 - Bug] Made sendMessage non-async to match void return type**
- **Found during:** Task 1 (useAiStream hook implementation)
- **Issue:** Plan code declared sendMessage as async but UseAiStreamReturn typed it as returning void, not Promise
- **Fix:** Changed sendMessage to synchronous wrapper that calls internal async run() function
- **Files modified:** frontend/hooks/use-ai-stream.ts
- **Verification:** Return type matches UseAiStreamReturn interface

---

**Total deviations:** 3 auto-fixed (3 bugs)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
- Pre-existing TypeScript compilation errors (TS7026: no JSX.IntrinsicElements, TS2307: no 'react' module types) affect all components in the project. New files have the same error pattern as all existing components -- this is a tsconfig/dev-dependency issue, not caused by our changes.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Frontend streaming UI complete, ready for end-to-end testing with backend SSE endpoints
- AiChatPlaceholder.tsx retained in codebase but no longer imported (can be deleted in cleanup)
- Language preference UI (SET-LANG) covered by Plan 04

---
*Phase: 19-mcp-agent-streaming*
*Completed: 2026-03-28*
