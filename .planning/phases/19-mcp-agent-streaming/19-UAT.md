---
status: resolved
phase: 19-mcp-agent-streaming
source: [19-01-SUMMARY.md, 19-02-SUMMARY.md, 19-03-SUMMARY.md, 19-04-SUMMARY.md]
started: 2026-03-28T12:00:00Z
updated: 2026-03-28T10:38:00Z
---

## Current Test

number: 1
name: Backend Unit Tests
expected: |
  All 19 Phase 19 unit tests pass (8 AIEngine + 4 QAService + 7 Translation).
awaiting: auto-verified

## Tests

### 1. Backend Unit Tests (Auto-verified)
expected: All 19 Phase 19 unit tests pass (8 AIEngine + 4 QAService + 7 Translation)
result: pass

### 2. DB Migration & Model Columns (Auto-verified)
expected: Migration 00000000000005 adds language_preference to profiles, name_zh/title_zh to courses/modules/lessons/deadlines/module_items
result: pass

### 3. SSE Endpoints Exist (Auto-verified)
expected: POST /courses/{id}/qa/stream and GET /courses/{id}/review/stream routes use EventSourceResponse
result: pass

### 4. Deadline AI Chat UI
expected: Open a Deadline card, see an AI chat input area below the materials section. Type a question, press send — see "Searching..." status then tokens streaming in real-time in chat bubbles.
result: issue
reported: "SSE error: 404 — course_code passed instead of course_id to API endpoint"
severity: blocker
fix: Added course_id to Deadline type/fixtures, fixed DeadlineCard prop, added mock SSE routes
re-test: pass

### 5. Course Q&A Chat UI
expected: Open Course Detail page, see functional AI chat replacing the old "Coming Soon" placeholder. Type a question, see streaming AI response with cited sources.
result: pass

### 6. Unit Review Streaming
expected: On Course Detail page, click "Generate Review". See streaming markdown output with sections: Key Concepts, Common Mistakes, Exam Scope, Study Tips.
result: pass
reported: "1. AI sections need Rough.js hand-drawn borders to match design system; 2. Long streaming content should auto-scroll page to keep latest content visible"
severity: cosmetic
fix: Plan 19-05 gap closure — added RoughCard borders to AI components and page-level auto-scroll to UnitReviewSection
re-test: pass

### 7. Language Preference Setting
expected: Go to Settings page. See a "Language Preference" section with English/中文 options. Select 中文 — URL changes to /zh/..., all UI text switches to Chinese. Refresh page — preference is retained.
result: pass

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "AI chat and review sections should use Rough.js hand-drawn borders matching the project design system"
  status: resolved
  reason: "User reported: AI sections need hand-drawn borders to match design system"
  severity: cosmetic
  test: 6
  artifacts: [frontend/components/course-detail/AiCourseChat.tsx, frontend/components/course-detail/UnitReviewSection.tsx, frontend/components/deadlines/DeadlineAiChat.tsx, frontend/components/shared/AiChatBubble.tsx]
  missing: [Rough.js border integration on AI components]

- truth: "Long streaming content should auto-scroll the page to keep latest generated content visible"
  status: resolved
  reason: "User reported: content exceeding screen edge needs page auto-scroll to align with latest content"
  severity: cosmetic
  test: 6
  artifacts: [frontend/components/course-detail/UnitReviewSection.tsx, frontend/hooks/use-ai-stream.ts]
  missing: [Page-level auto-scroll during streaming]
