---
status: testing
phase: 19-mcp-agent-streaming
source: [19-01-SUMMARY.md, 19-02-SUMMARY.md, 19-03-SUMMARY.md, 19-04-SUMMARY.md]
started: 2026-03-28T12:00:00Z
updated: 2026-03-28T12:00:00Z
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
result: [pending]

### 5. Course Q&A Chat UI
expected: Open Course Detail page, see functional AI chat replacing the old "Coming Soon" placeholder. Type a question, see streaming AI response with cited sources.
result: [pending]

### 6. Unit Review Streaming
expected: On Course Detail page, click "Generate Review". See streaming markdown output with sections: Key Concepts, Common Mistakes, Exam Scope, Study Tips.
result: [pending]

### 7. Language Preference Setting
expected: Go to Settings page. See a "Language Preference" section with English/中文 options. Select 中文 — URL changes to /zh/..., all UI text switches to Chinese. Refresh page — preference is retained.
result: [pending]

## Summary

total: 7
passed: 3
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps

[none yet]
