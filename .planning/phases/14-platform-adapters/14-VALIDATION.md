---
phase: 14
slug: platform-adapters
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-26
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.x + pytest-asyncio |
| **Config file** | `pyproject.toml` ([tool.pytest.ini_options]) |
| **Quick run command** | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && uv run python -m pytest tests/unit/adapters/ -x -q` |
| **Full suite command** | `cd /Users/qinyuan/claude/r1ckyIn_GitHub/UniBoard && uv run python -m pytest tests/ -x -q --timeout=30` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `uv run python -m pytest tests/unit/adapters/ -x -q`
- **After every plan wave:** Run `uv run python -m pytest tests/ -x -q --timeout=30`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | INFRA-03 | unit | `pytest tests/unit/adapters/test_canvas.py -x -q` | ❌ W0 | ⬜ pending |
| 14-01-02 | 01 | 1 | INFRA-03 | unit | `pytest tests/unit/adapters/test_canvas.py -x -q` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 1 | INFRA-04 | unit | `pytest tests/unit/adapters/test_ed_discussion.py -x -q` | ❌ W0 | ⬜ pending |
| 14-02-02 | 02 | 1 | INFRA-04 | unit | `pytest tests/unit/adapters/test_ed_discussion.py -x -q` | ❌ W0 | ⬜ pending |
| 14-03-01 | 03 | 1 | INFRA-05 | unit | `pytest tests/unit/adapters/test_ed_lessons.py -x -q` | ❌ W0 | ⬜ pending |
| 14-04-01 | 04 | 2 | INFRA-06 | unit | `pytest tests/unit/parsers/test_usyd_outline.py -x -q` | ❌ W0 | ⬜ pending |
| 14-04-02 | 04 | 2 | INFRA-06 | unit | `pytest tests/unit/parsers/test_usyd_outline.py -x -q` | ❌ W0 | ⬜ pending |
| 14-05-01 | 05 | 2 | INFRA-03,04,05 | unit | `pytest tests/unit/adapters/test_resilience.py -x -q` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/adapters/test_canvas.py` — stubs for INFRA-03
- [ ] `tests/unit/adapters/test_ed_discussion.py` — stubs for INFRA-04
- [ ] `tests/unit/adapters/test_ed_lessons.py` — stubs for INFRA-05
- [ ] `tests/unit/parsers/test_usyd_outline.py` — stubs for INFRA-06
- [ ] `tests/unit/adapters/test_resilience.py` — stubs for circuit breaker cross-adapter
- [ ] `tests/unit/adapters/conftest.py` — shared fixtures (mock transport, fake tokens, response factories)
- [ ] `tests/fixtures/usyd_outline_sample.html` — saved HTML snapshot for UnitOutlineParser tests

*Existing infrastructure: pytest + pytest-asyncio already installed. httpx MockTransport available.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real Canvas API pagination | INFRA-03 | Requires real Canvas API token | Run `tests/integration/test_canvas_integration.py` with CANVAS_API_TOKEN env |
| Real Ed API thread fetch | INFRA-04 | Requires real Ed API token | Run `tests/integration/test_ed_integration.py` with ED_API_TOKEN env |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
