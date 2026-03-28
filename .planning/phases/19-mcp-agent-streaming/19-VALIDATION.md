---
phase: 19
slug: mcp-agent-streaming
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-28
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3 + pytest-asyncio 0.25 (backend), Vitest (frontend) |
| **Config file** | `pyproject.toml [tool.pytest.ini_options]`, `frontend/vitest.config.ts` |
| **Quick run command** | `uv run pytest tests/unit/ -x -q` |
| **Full suite command** | `uv run pytest tests/ -x -q --timeout=120` |
| **Estimated runtime** | ~30 seconds (unit), ~120 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `uv run pytest tests/unit/ -x -q --timeout=30`
- **After every plan wave:** Run `uv run pytest tests/ -x -q --timeout=120`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | DL-04 | unit | `uv run pytest tests/unit/test_ai_engine.py::test_stream_question -x` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 1 | DL-04 | unit | `uv run pytest tests/unit/test_ai_engine.py::test_agent_tool_loop -x` | ❌ W0 | ⬜ pending |
| 19-01-03 | 01 | 1 | DL-04 | integration | `uv run pytest tests/integration/test_ai_routes.py::test_qa_stream_sse -x` | ❌ W0 | ⬜ pending |
| 19-02-01 | 02 | 1 | FILE-03 | unit | `uv run pytest tests/unit/test_qa_service.py::test_stream_answer_question -x` | ❌ W0 | ⬜ pending |
| 19-02-02 | 02 | 1 | FILE-04 | unit | `uv run pytest tests/unit/test_ai_engine.py::test_stream_review -x` | ❌ W0 | ⬜ pending |
| 19-02-03 | 02 | 1 | FILE-04 | integration | `uv run pytest tests/integration/test_ai_routes.py::test_review_stream_sse -x` | ❌ W0 | ⬜ pending |
| 19-03-01 | 03 | 1 | SET-LANG | unit | `uv run pytest tests/unit/test_language_preference.py -x` | ❌ W0 | ⬜ pending |
| 19-03-02 | 03 | 1 | SET-LANG | unit | `uv run pytest tests/unit/test_qa_service.py::test_bilingual_prompt_selection -x` | ❌ W0 | ⬜ pending |
| 19-03-03 | 03 | 1 | SET-LANG | unit | `uv run pytest tests/unit/test_translation_service.py -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/test_ai_engine.py` — add streaming + tool_use tests (file exists, add new tests)
- [ ] `tests/unit/test_qa_service.py` — add streaming variant tests (file exists, add new tests)
- [ ] `tests/unit/test_language_preference.py` — covers SET-LANG Profile persistence
- [ ] `tests/unit/test_translation_service.py` — covers batch AI translation
- [ ] `tests/integration/test_ai_routes.py` — add SSE streaming route tests (file exists, add new tests)
- [ ] `supabase/migrations/00000000000005_language_and_translations.sql` — schema migration

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SSE typewriter rendering in browser | DL-04 | Visual rendering cannot be tested in headless unit tests | Open deadline detail → ask question → verify token-by-token rendering |
| Chat bubble layout & scroll | DL-04 | CSS layout verification | Open deadline card → send 3+ messages → verify scroll behavior |
| Language switch flips entire UI | SET-LANG | Full locale switch + URL change | Settings → switch to 中文 → verify all pages show Chinese labels |
| AI response in selected language | SET-LANG | End-to-end with real Claude API | Switch to 中文 → ask Q&A → verify response is in Chinese |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
