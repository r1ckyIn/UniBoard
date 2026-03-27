---
phase: 15
slug: core-services-api-routes
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-27
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3+ / pytest-asyncio 0.25+ |
| **Config file** | pyproject.toml `[tool.pytest.ini_options]` |
| **Quick run command** | `python -m pytest tests/unit/ -x -q` |
| **Full suite command** | `python -m pytest tests/ -x --timeout=120` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `python -m pytest tests/unit/ -x -q`
- **After every plan wave:** Run `python -m pytest tests/ -x --timeout=120`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | GPA-01 | unit | `python -m pytest tests/unit/test_gpa_service.py -x` | ✅ | ⬜ pending |
| 15-01-02 | 01 | 1 | GPA-02 | unit | `python -m pytest tests/unit/test_gpa_service.py::test_whatif_simulate -x` | ✅ | ⬜ pending |
| 15-01-03 | 01 | 1 | GPA-03 | unit | `python -m pytest tests/unit/test_gpa_service.py::test_target_path_uniform_achievable -x` | ✅ | ⬜ pending |
| 15-01-04 | 01 | 1 | GPA-04 | integration | `python -m pytest tests/integration/test_gpa_routes.py -x` | ✅ (partial) | ⬜ pending |
| 15-01-05 | 01 | 1 | GPA-05 | unit | `python -m pytest tests/unit/test_gpa_service.py::test_single_course_wam -x` | ✅ | ⬜ pending |
| 15-02-01 | 02 | 1 | DL-01 | unit | `python -m pytest tests/unit/test_deadline_service.py -x` | ✅ | ⬜ pending |
| 15-03-01 | 03 | 2 | INTEL-01 | integration | `python -m pytest tests/integration/ -k intelligence -x` | ❌ W0 | ⬜ pending |
| 15-03-02 | 03 | 2 | INTEL-05 | unit | `python -m pytest tests/unit/test_deadline_service.py::TestComputeDedupKey -x` | ✅ | ⬜ pending |
| 15-04-01 | 04 | 2 | FILE-01 | integration | `python -m pytest tests/integration/ -k materials -x` | ❌ W0 | ⬜ pending |
| 15-04-02 | 04 | 2 | FILE-02 | integration | `python -m pytest tests/integration/test_search.py -x` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/integration/test_contract_alignment.py` — validates every endpoint response matches types.gen.d.ts shapes
- [ ] `tests/integration/test_intelligence_routes.py` — stubs for INTEL-01
- [ ] `tests/integration/test_materials_routes.py` — stubs for FILE-01

*Existing infrastructure (pytest, conftest, fixtures) covers most phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Frontend prefixUrl switch | ALL | Requires running frontend + backend together | Switch NEXT_PUBLIC_API_BASE_URL to http://localhost:8000/api/v1, verify all pages render correctly |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
