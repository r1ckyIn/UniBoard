---
phase: 20
slug: skill-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3+ with pytest-asyncio 0.25+ |
| **Config file** | `pyproject.toml` [tool.pytest.ini_options] |
| **Quick run command** | `python -m pytest tests/unit/test_skill_service.py tests/unit/test_tool_executor.py -x --timeout=30` |
| **Full suite command** | `python -m pytest tests/ --timeout=120` |
| **Estimated runtime** | ~15 seconds (unit), ~60 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest tests/unit/test_skill_service.py tests/unit/test_tool_executor.py -x --timeout=30`
- **After every plan wave:** Run `python -m pytest tests/ --timeout=120`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | SKILL-01 | unit | `pytest tests/unit/test_skill_service.py::test_auto_generate_skill -x` | ❌ W0 | ⬜ pending |
| 20-01-02 | 01 | 1 | SKILL-01 | unit | `pytest tests/unit/test_skill_service.py::test_skip_generation_insufficient_traces -x` | ❌ W0 | ⬜ pending |
| 20-01-03 | 01 | 1 | SKILL-02 | unit | `pytest tests/unit/test_skill_service.py::test_lookup_per_course -x` | ❌ W0 | ⬜ pending |
| 20-01-04 | 01 | 1 | SKILL-02 | unit | `pytest tests/unit/test_skill_service.py::test_lookup_global_fallback -x` | ❌ W0 | ⬜ pending |
| 20-01-05 | 01 | 1 | SKILL-02 | unit | `pytest tests/unit/test_skill_service.py::test_lookup_no_skill_triggers_exploration -x` | ❌ W0 | ⬜ pending |
| 20-01-06 | 01 | 1 | SKILL-03 | unit | `pytest tests/unit/test_skill_service.py::test_course_differentiation -x` | ❌ W0 | ⬜ pending |
| 20-01-07 | 01 | 1 | SKILL-04 | unit | `pytest tests/unit/test_skill_service.py::test_seed_skills -x` | ❌ W0 | ⬜ pending |
| 20-02-01 | 02 | 1 | D-13 | unit | `pytest tests/unit/test_tool_executor.py::test_search_canvas -x` | ❌ W0 | ⬜ pending |
| 20-02-02 | 02 | 1 | D-13 | unit | `pytest tests/unit/test_tool_executor.py::test_search_ed_threads -x` | ❌ W0 | ⬜ pending |
| 20-02-03 | 02 | 1 | D-13 | unit | `pytest tests/unit/test_tool_executor.py::test_get_ed_lesson -x` | ❌ W0 | ⬜ pending |
| 20-02-04 | 02 | 1 | D-13 | unit | `pytest tests/unit/test_tool_executor.py::test_missing_token_graceful -x` | ❌ W0 | ⬜ pending |
| 20-03-01 | 03 | 2 | D-08 | unit | `pytest tests/unit/test_skill_service.py::test_lifecycle_draft_to_active -x` | ❌ W0 | ⬜ pending |
| 20-03-02 | 03 | 2 | D-08 | unit | `pytest tests/unit/test_skill_service.py::test_degradation -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/test_skill_service.py` — stubs for SKILL-01 through SKILL-04, D-08
- [ ] `tests/unit/test_tool_executor.py` — stubs for D-13 tool routing and error handling
- [ ] No new framework install needed — pytest infrastructure already exists

*Existing infrastructure covers framework requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Skill auto-generation from real AI interactions | SKILL-01 | Requires real Claude API call + adapter responses | Trigger agent_stream with real tokens, verify skill created in DB |
| Course-specific quirk detection | SKILL-03 | Requires real course data with structural variance | Sync 2+ courses with different structures, verify parameters differ |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
