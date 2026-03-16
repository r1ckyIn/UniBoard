---
phase: 2
slug: core-services-api
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-16
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3+ with pytest-asyncio 0.25+, hypothesis 6.151+ |
| **Config file** | `pyproject.toml` [tool.pytest.ini_options] |
| **Quick run command** | `pytest tests/ -x --timeout=60` |
| **Full suite command** | `mypy src/ && pytest && ruff check .` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/ -x --timeout=60`
- **After every plan wave:** Run `mypy src/ && pytest && ruff check .`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 0 | INFRA-02 | setup | `uv sync --group dev` | N/A | ⬜ pending |
| 02-01-02 | 01 | 1 | GPA-01, GPA-05 | unit + property | `pytest tests/unit/test_gpa_service.py -x` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | GPA-02 | unit | `pytest tests/unit/test_gpa_service.py::TestWhatIf -x` | ❌ W0 | ⬜ pending |
| 02-01-04 | 01 | 1 | GPA-03 | unit | `pytest tests/unit/test_gpa_service.py::TestTargetPath -x` | ❌ W0 | ⬜ pending |
| 02-01-05 | 01 | 2 | GPA-04 | integration | `pytest tests/integration/test_gpa_routes.py -x` | ❌ W0 | ⬜ pending |
| 02-01-06 | 01 | 2 | GPA-01..05 | integration | `pytest tests/integration/test_gpa_routes.py -x` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | DL-01, INTEL-05 | unit + scenario | `pytest tests/unit/test_deadline_service.py -x` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | INTEL-01 | unit | `pytest tests/unit/test_intelligence_service.py -x` | ❌ W0 | ⬜ pending |
| 02-02-03 | 02 | 1 | FILE-01 | unit | `pytest tests/unit/test_materials_service.py -x` | ❌ W0 | ⬜ pending |
| 02-02-04 | 02 | 1 | FILE-02 | integration | `pytest tests/integration/test_search.py -x` | ❌ W0 | ⬜ pending |
| 02-02-05 | 02 | 2 | INFRA-02, PLAT-04 | integration | `pytest tests/integration/test_sync_engine.py -x` | ❌ W0 | ⬜ pending |
| 02-02-06 | 02 | 2 | DL-01, FILE-01, INTEL-01 | integration | `pytest tests/integration/test_routes_phase2.py -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/test_gpa_service.py` — Hypothesis property tests for WAM (0-100) and GPA (0-7) invariants, scenario tests for grade band mapping, what-if simulation, target path calculation
- [ ] `tests/unit/test_deadline_service.py` — SHA-256 dedup scenario tests (exact match, fuzzy match via rapidfuzz, cross-platform same assignment, slight title differences)
- [ ] `tests/unit/test_materials_service.py` — AI description generation with fallback, unified folder view construction
- [ ] `tests/unit/test_intelligence_service.py` — Ed Discussion endorsed/staff-answered filtering
- [ ] `tests/integration/test_gpa_routes.py` — GPA endpoint integration (summary, course detail, what-if, target, trend)
- [ ] `tests/integration/test_search.py` — PostgreSQL tsvector full-text search with ts_headline snippets
- [ ] `tests/integration/test_sync_engine.py` — Sync engine lifecycle (start, execute, token expiry detection, status reporting)
- [ ] `tests/integration/test_routes_phase2.py` — Deadline, material, intelligence route integration tests
- [ ] New dependencies in pyproject.toml: `apscheduler>=3.11,<4.0`, `anthropic>=0.84,<1.0`, `rapidfuzz>=3.14,<4.0`, `hypothesis>=6.151,<7.0`
- [ ] Alembic migration: WhatIfScenario table, User sync/target columns, tsvector columns on ModuleItem/Lesson, Grade unique constraint

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| AI folder descriptions quality | FILE-01 | Requires subjective evaluation of Claude Haiku output quality | Generate descriptions for 5 sample folders, verify they are informative and concise |
| Sync interval timing accuracy | INFRA-02 | APScheduler timing depends on system load, hard to assert exactly | Start sync engine, observe logs for job execution at expected intervals over 20+ minutes |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
