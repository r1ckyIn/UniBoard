---
id: 260423-i5k
slug: strip-markdown-code-fences-in-ai-engine
status: complete
branch: fix/ai-engine-strip-markdown-fence
worktree: /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard-aifence
date: 2026-04-23
pr_target: main
pr_base_commit: 21b487d
---

# Quick Task 260423-i5k — SUMMARY

## What shipped
Shared helper `_parse_ai_json(raw_text, *, context)` at the top of
`src/services/ai_engine.py` that tolerates markdown code fences in
AI-returned JSON. Applied to all three `json.loads` call sites:

| Call site | Before | After |
|-----------|--------|-------|
| `evaluate_thread` L125 | bare `json.loads`, no fence handling — **live prod bug** | `_parse_ai_json(raw_text, context="thread evaluation")` |
| `generate_review` L194-203 | inline regex fallback, only matched `{...}` | `_parse_ai_json(raw_text, context="unit review")` |
| `score_urgency` L223 | bare `json.loads`, no fence handling — latent bug for array payloads | `_parse_ai_json(raw_text, context="urgency scoring")` |

Also retired the inline regex that was duplicating fence logic in
`generate_review`.

## Root cause (prod traceback 2026-04-23 01:53-01:54 UTC on `21b487d`)
Claude Sonnet intermittently wraps structured output in markdown fences
(` ```json\n{...}\n``` `) despite `THREAD_EVAL_SYSTEM_PROMPT` asking for
raw JSON. First character is a backtick → `json.loads` raises
`JSONDecodeError` → `intelligence.evaluate_new_threads_ai` ValueErrors →
every Ed discussion thread evaluation fails → no `gpa_relevance_score`
ever written → Phase 34 AI intelligence feature silently broken.

Pattern had been happening on both the pre-#114 deploy (`e4a068f0`, seen
at 01:34 UTC) and the current `21b487d` deploy — so it's pre-existing,
not a regression from #114/#115.

## Files changed
| File | Change |
|------|--------|
| `src/services/ai_engine.py` | `_FENCE_OPEN` / `_FENCE_CLOSE` regex constants + `_parse_ai_json` helper; 3 call-site replacements; dropped inline fence regex in `generate_review` |
| `tests/unit/test_ai_engine.py` | 10 new tests — direct helper unit tests (9 shapes) + 3 integration tests (one per call site: `evaluate_thread` / `generate_review` / `score_urgency`) |

## Verify output
| Command | Result |
|---------|--------|
| `uv run ruff check src/services/ai_engine.py tests/unit/test_ai_engine.py` | All checks passed |
| `uv run mypy src/services/ai_engine.py` | Success: no issues found in 1 source file |
| `uv run pytest tests/unit/test_ai_engine.py -q` | **21 passed** in 1.12s (was 11, +10 new) |

## must_haves — coverage
- [x] All three AIEngine JSON call sites go through the shared helper.
- [x] Fenced-JSON response no longer raises on any of the three endpoints.
- [x] Unit tests cover: object, array, ```json fence, ``` (no tag), case-insensitive `JSON`, leading/trailing whitespace, nested-newline payload, bare JSON, unparseable (bare + fenced).
- [x] Raises `ValueError` (not `JSONDecodeError`) with context + `raw_text[:200]` on parse failure — log shape preserved.
- [x] Existing `test_evaluate_thread_raises_on_invalid_json` still passes (bare-text-no-fence path).

## Worktree isolation context
This task ran in a git worktree at
`/Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard-aifence` branched from
`origin/main` (`21b487d`) to avoid colliding with a parallel `/gsd-quick`
session on the main repo directory (branch
`fix/add-on-delete-cascade-fks` at `b424a91`, FK cascade hardening —
quick task id `260423-gir`). Both branches branch from `21b487d` and
touch disjoint files; they can ship in parallel as two independent PRs.

## Out of scope
- **Migrating AIEngine to Claude tool-use / JSON mode structured output.**
  That would eliminate this failure mode entirely at the API contract
  level rather than the parse layer, but it's Phase 34 architecture work.
- **Defensive handling in `intelligence.evaluate_new_threads_ai`.** The
  fence fix eliminates the error at its source; a second belt-and-braces
  catch upstream is a separate concern.

## Production verification plan (post-merge)
- Railway deploy of the squash-merge commit
- Wait ~5 min for next `intelligence.evaluate_new_threads_ai` tick
- Railway logs grep:
  - ✓ expect: `thread_evaluated` events with `gpa_relevance_score` populated
  - ✗ do not expect: `ai_thread_eval_failed` / `AI returned invalid JSON`
- Supabase: `SELECT COUNT(*) FROM discussion_threads WHERE gpa_relevance_score IS NOT NULL` should start climbing after next sync tick
