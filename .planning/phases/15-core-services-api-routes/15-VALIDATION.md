---
phase: 15
slug: core-services-api-routes
status: draft
nyquist_compliant: true
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

| Task ID | Plan | Task# | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|-------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-T1 | 01 | 1 | 1 | GPA-01..05 | unit | `python -c "from src.schemas.gpa import GpaReportResponse; from src.schemas.course import CourseDeadlineResponse; print('OK')"` | N/A (schema import) | ⬜ pending |
| 15-01-T2 | 01 | 2 | 1 | GPA-01..03 | unit | `python -m pytest tests/unit/test_gpa_service.py -x -q --timeout=30` | ✅ | ⬜ pending |
| 15-01-T3 | 01 | 3 | 1 | GPA-04, GPA-05 | unit | `python -c "from src.web.routes.courses import router; print([r.path for r in router.routes])"` | N/A (route check) | ⬜ pending |
| 15-02-T1 | 02 | 1 | 1 | DL-01, INTEL-01, FILE-01, FILE-02 | unit | `python -c "from src.schemas.deadline import ContractDeadlineResponse; from src.schemas.materials import MaterialResponse; from src.schemas.intelligence import DiscussionResponse; print('OK')"` | N/A (schema import) | ⬜ pending |
| 15-02-T2 | 02 | 2 | 1 | DL-01 | unit | `python -m pytest tests/unit/test_deadline_service.py -x -q --timeout=30` | ✅ | ⬜ pending |
| 15-02-T3 | 02 | 3 | 1 | FILE-01, FILE-02, INTEL-01 | unit | `python -m pytest tests/unit/test_materials_service.py tests/unit/test_intelligence_service.py -x -q --timeout=30` | ✅ | ⬜ pending |
| 15-03-T1 | 03 | 1 | 2 | ALL | unit | `python -c "from tests.fixtures.seed_phase15 import seed_full_phase15_data; print('OK')"` | ❌ W0 | ⬜ pending |
| 15-03-T2 | 03 | 2 | 2 | ALL | integration | `python -m pytest tests/integration/test_contract_alignment.py tests/integration/test_courses_routes.py tests/integration/test_deadline_routes.py -x -q --timeout=120` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/integration/test_contract_alignment.py` — validates every endpoint response matches types.gen.d.ts shapes
- [ ] `tests/integration/test_courses_routes.py` — covers GET /courses, /courses/{id}, /courses/{id}/grades, /courses/{id}/deadlines
- [ ] `tests/integration/test_deadline_routes.py` — covers GET /deadlines/upcoming
- [ ] `tests/fixtures/seed_phase15.py` — factory functions for test data seeding

*Existing infrastructure (pytest, conftest, fixtures) covers most phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Frontend prefixUrl switch | ALL | Requires running frontend + backend together | Switch NEXT_PUBLIC_API_BASE_URL to http://localhost:8000/api/v1, verify all pages render correctly |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
