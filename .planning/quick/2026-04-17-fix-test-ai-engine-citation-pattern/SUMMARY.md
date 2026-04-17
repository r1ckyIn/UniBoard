---
type: quick
slug: fix-test-ai-engine-citation-pattern
date: 2026-04-17
status: complete
duration_min: 3
commits: 1
---

# Quick Task Summary: Fix test_ai_engine citation test

## Result

Single file edit to `tests/unit/test_ai_engine.py`:
- mock answer now uses Phase 34 numeric markers `[1]` / `[2]` instead of legacy `[Canvas: ...]` / `[Ed: ...]`
- assertions expect `"1"` and `"2"` in `result.citations` (matches `_CITATION_PATTERN = r"\[(\d+)\]"` capture group)
- updated docstring cites Phase 34 AIFEAT-02 contract

## Verification

- `uv run pytest tests/unit/test_ai_engine.py -q`: 8/8 passed
- `uv run ruff check tests/unit/test_ai_engine.py`: clean
- `uv run mypy --strict tests/unit/test_ai_engine.py`: clean

## Scope

Test-only change. No source code touched. Phase 34's canonical citation contract is already in src/services/ai_engine.py:_CITATION_PATTERN — this commit aligns the legacy unit test to the new contract.

## Commit

`fix(test): update ai_engine citation test to match Phase 34 numeric [N] pattern`
