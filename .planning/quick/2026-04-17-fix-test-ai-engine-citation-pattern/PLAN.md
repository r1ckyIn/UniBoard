---
type: quick
slug: fix-test-ai-engine-citation-pattern
date: 2026-04-17
status: active
---

# Quick Task: Fix test_ai_engine citation test to match Phase 34 numeric [N] pattern

## Context

CI failure on PR #75 (Phase 34 ship):
- `tests/unit/test_ai_engine.py::test_ask_question_returns_answer_with_citations` FAILS
- Expected `[Canvas: Week 3 Lecture Notes]` in `result.citations`
- Got empty `[]`

## Root cause

Phase 34 HI-01 fix (commit d67a6db) intentionally changed `_CITATION_PATTERN` in `src/services/ai_engine.py` from the pre-Phase-34 named-citation pattern to `r"\[(\d+)\]"` — numeric-only markers tied to the new Sources SSE event.

The existing unit test was not updated; it still encodes the old `[Platform: Name]` contract.

## Decision

Update the test to reflect Phase 34's canonical contract: numeric `[N]` markers. The named-citation format is deprecated post-Phase-34 in favor of the Sources panel + numbered references (per 34-04 RESEARCH + 34-CONTEXT D-B decisions).

## Plan

Edit `tests/unit/test_ai_engine.py:test_ask_question_returns_answer_with_citations`:
- Change mock answer from "[Canvas: Week 3 Lecture Notes]" / "[Ed: Sorting Algorithms Lesson]" to use numeric markers "[1]" / "[2]"
- Update assertions: expect `"1"` and `"2"` in `result.citations` (regex captures the integer as a string via `findall`)
- Keep test intent (verifies citations extraction works end-to-end)

Single atomic commit: `fix(test): update ai_engine citation test to match Phase 34 numeric [N] pattern`

Then push, wait for CI re-run, merge when green.
