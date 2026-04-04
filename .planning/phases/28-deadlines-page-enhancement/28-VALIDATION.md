---
phase: 28
slug: deadlines-page-enhancement
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (frontend)** | Vitest + @testing-library/react |
| **Framework (backend)** | pytest + pytest-asyncio |
| **Frontend config** | `frontend/vitest.config.ts` |
| **Backend config** | `pyproject.toml` |
| **Frontend quick run** | `cd frontend && npx vitest run __tests__/deadlines/` |
| **Backend quick run** | `python -m pytest tests/unit/test_deadline_service.py -x` |
| **Frontend full suite** | `cd frontend && npx vitest run` |
| **Backend full suite** | `python -m pytest tests/ -x` |
| **Estimated runtime** | ~30 seconds (frontend) + ~45 seconds (backend) |

---

## Sampling Rate

- **After every task commit:** Run `cd frontend && npx vitest run __tests__/deadlines/` (frontend) or `python -m pytest tests/unit/test_deadline_service.py -x` (backend)
- **After every plan wave:** Run full frontend + backend test suites
- **Before `/gsd:verify-work`:** Full suites must be green
- **Max feedback latency:** 45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | DL-UX-05 | unit (backend) | `python -m pytest tests/unit/test_deadline_user_actions.py -x` | ❌ W0 | ⬜ pending |
| 28-01-02 | 01 | 1 | DL-UX-05 | integration | `python -m pytest tests/integration/test_deadline_action_routes.py -x` | ❌ W0 | ⬜ pending |
| 28-02-01 | 02 | 2 | DL-UX-01 | unit (component) | `cd frontend && npx vitest run __tests__/deadlines/DeadlineCard.test.tsx -x` | ✅ (needs update) | ⬜ pending |
| 28-02-02 | 02 | 2 | DL-UX-04 | unit (lib) | `cd frontend && npx vitest run __tests__/deadlines/DeadlineCard.test.tsx -x` | ✅ (needs update) | ⬜ pending |
| 28-02-03 | 02 | 2 | DL-UX-02 | unit (component) | `cd frontend && npx vitest run __tests__/deadlines/DeadlineCard.test.tsx -x` | ✅ (needs pin tests) | ⬜ pending |
| 28-03-01 | 03 | 2 | DL-UX-03 | unit (component) | `cd frontend && npx vitest run __tests__/deadlines/DeadlinesPage.test.tsx -x` | ✅ (needs filter update) | ⬜ pending |
| 28-03-02 | 03 | 2 | DL-UX-05 | unit (frontend) | `cd frontend && npx vitest run __tests__/deadlines/useDeadlineActions.test.tsx -x` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/unit/test_deadline_user_actions.py` — stubs for DL-UX-05 backend service
- [ ] `tests/integration/test_deadline_action_routes.py` — stubs for DL-UX-05 API contract
- [ ] `frontend/__tests__/deadlines/useDeadlineActions.test.tsx` — stubs for DL-UX-05 mutation hooks
- [ ] Update `frontend/__tests__/deadlines/DeadlineCard.test.tsx` — add three-dot menu, pin visual, overdue border tests
- [ ] Update `frontend/__tests__/deadlines/DeadlinesPage.test.tsx` — update filter mode assertions for new semantics
- [ ] `frontend/lib/fixtures/deadlines.ts` — add fixture entries with overdue + pinned states

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dropdown menu click-outside dismiss | DL-UX-01 | DOM event propagation nuance | 1. Click three-dot icon 2. Click outside dropdown 3. Verify dropdown closes |
| Pinned card amber stripe visual | DL-UX-02 | Visual color verification | 1. Pin a deadline 2. Verify left stripe is amber (#b08968) |
| Overdue red border visual | DL-UX-04 | Visual color verification | 1. View overdue deadline 2. Verify red border present |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
